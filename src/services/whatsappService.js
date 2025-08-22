import { makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion, downloadMediaMessage } from '@whiskeysockets/baileys';
import qrcode from 'qrcode';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class WhatsAppService {
  constructor() {
    this.sock = null;
    this.qr = null;
    this.connectionState = 'disconnected';
    this.authState = null;
    this.saveCreds = null;
    this.sessionPath = path.join(__dirname, '../../sessions/auth_info');
    this.retryAttempts = 0;
    this.maxRetries = 5;
    this.onlineStatus = false;
    this.messageHandlers = [];
    this.processedCalls = new Set(); // Track processed calls to avoid duplicates
  }

  async initialize() {
    try {
      // Ensure sessions directory exists
      await fs.mkdir(this.sessionPath, { recursive: true });
      
      // Clean up any existing connection
      if (this.sock) {
        try {
          this.sock.ev.removeAllListeners();
          this.sock.end();
        } catch (error) {
          // Ignore cleanup errors
        }
        this.sock = null;
      }
      
      // Reset state
      this.connectionState = 'disconnected';
      this.onlineStatus = false;
      this.qr = null;
      this.retryAttempts = 0;
      
      const { state, saveCreds } = await useMultiFileAuthState(this.sessionPath);
      this.authState = state;
      this.saveCreds = saveCreds;

      await this.connect();
      return true;
    } catch (error) {
      console.error('Error initializing WhatsApp service:', error);
      // Clear session on initialization error
      await this.clearSession();
      return false;
    }
  }

  async connect() {
    try {
      const { version, isLatest } = await fetchLatestBaileysVersion();
      console.log(`Using Baileys version ${version}, isLatest: ${isLatest}`);

      this.sock = makeWASocket({
        version,
        auth: this.authState,
        printQRInTerminal: false,
        browser: ['GPTWhats', 'Desktop', '1.0.0'],
        getMessage: async (key) => {
          return {
            conversation: 'Hello World!'
          }
        }
      });

      this.setupEventHandlers();
      
    } catch (error) {
      console.error('Error connecting to WhatsApp:', error);
      throw error;
    }
  }

  setupEventHandlers() {
    this.sock.ev.on('connection.update', this.handleConnectionUpdate.bind(this));
    this.sock.ev.on('creds.update', this.saveCreds);
    this.sock.ev.on('messages.upsert', this.handleIncomingMessages.bind(this));
    this.sock.ev.on('call', this.handleIncomingCall.bind(this));
    this.sock.ev.on('presence.update', this.handlePresenceUpdate.bind(this));
  }

  async handleConnectionUpdate(update) {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      this.qr = qr;
      try {
        const qrString = await qrcode.toDataURL(qr);
        global.io?.emit('qr-code', qrString);
        console.log('📱 QR Code generated');
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      let shouldReconnect = false;
      
      // Determine if we should reconnect based on the disconnect reason
      switch (statusCode) {
        case DisconnectReason.loggedOut:
          console.log('🔐 Logged out from WhatsApp - need new QR code');
          shouldReconnect = false;
          await this.clearSession();
          break;
        case DisconnectReason.connectionClosed:
        case DisconnectReason.connectionLost: 
        case DisconnectReason.connectionReplaced:
          console.log('🔌 Connection lost - attempting to reconnect');
          shouldReconnect = true;
          break;
        case 401: // Unauthorized
          console.log('❌ Unauthorized connection - clearing session');
          shouldReconnect = false;
          await this.clearSession();
          break;
        default:
          console.log(`Connection closed with status: ${statusCode}`);
          shouldReconnect = statusCode !== DisconnectReason.loggedOut;
          if (statusCode === 401) {
            await this.clearSession();
            shouldReconnect = false;
          }
      }
      
      this.connectionState = 'disconnected';
      this.onlineStatus = false;
      this.qr = null;
      
      global.io?.emit('connection-status', { 
        status: 'disconnected',
        canReconnect: shouldReconnect 
      });

      if (shouldReconnect && this.retryAttempts < this.maxRetries) {
        this.retryAttempts++;
        console.log(`🔄 Reconnection attempt ${this.retryAttempts}/${this.maxRetries} in 5 seconds...`);
        setTimeout(() => this.connect(), 5000);
      } else if (!shouldReconnect) {
        console.log('🛑 Connection terminated - manual reconnection required');
        this.retryAttempts = 0;
      } else {
        console.log('❌ Max retry attempts reached');
        await this.clearSession();
      }
    } else if (connection === 'open') {
      console.log('✅ WhatsApp connected successfully');
      this.connectionState = 'connected';
      this.retryAttempts = 0;
      this.qr = null;
      
      global.io?.emit('connection-status', { 
        status: 'connected' 
      });

      // Set initial offline status
      await this.setOfflineStatus();
    } else if (connection === 'connecting') {
      console.log('🔄 Connecting to WhatsApp...');
      this.connectionState = 'connecting';
      global.io?.emit('connection-status', { 
        status: 'connecting' 
      });
    }
  }

  async handleIncomingMessages(m) {
    const message = m.messages[0];
    if (!message || message.key.fromMe) return;

    try {
      // Emit received message to frontend
      global.io?.emit('message-received', {
        from: message.key.remoteJid,
        message: message.message,
        timestamp: message.messageTimestamp
      });

      // Process message through handlers
      for (const handler of this.messageHandlers) {
        await handler(message);
      }
    } catch (error) {
      console.error('Error handling incoming message:', error);
    }
  }

  async handleIncomingCall(call) {
    try {
      const callInfo = call[0];
      const callKey = `${callInfo.from}-${callInfo.id}`;
      
      // Check if we've already processed this call
      if (this.processedCalls.has(callKey)) {
        console.log('📞 Call already processed, ignoring:', callKey);
        return;
      }
      
      console.log('📞 Incoming call from:', callInfo.from);
      this.processedCalls.add(callKey);
      
      // Clean up old call records (keep only last 50)
      if (this.processedCalls.size > 50) {
        const keysArray = Array.from(this.processedCalls);
        this.processedCalls.clear();
        keysArray.slice(-25).forEach(key => this.processedCalls.add(key));
      }

      // Get call rejection settings
      const configService = await import('./configService.js');
      const isCallRejectionEnabled = await configService.default.get('call_rejection_enabled');
      const rejectionMessage = await configService.default.get('call_rejection_message');

      if (isCallRejectionEnabled === 'true') {
        // Reject call after 3 seconds
        setTimeout(async () => {
          try {
            await this.sock.rejectCall(callInfo.id, callInfo.from);
            console.log('📞 Call rejected:', callInfo.from);
            
            // Send rejection message only once
            if (rejectionMessage) {
              await this.sendMessage(callInfo.from, { text: rejectionMessage });
              console.log('📞 Rejection message sent to:', callInfo.from);
            }
          } catch (rejectError) {
            console.error('Error rejecting call:', rejectError);
          }
        }, 3000);
      }
    } catch (error) {
      console.error('Error handling incoming call:', error);
    }
  }

  async handlePresenceUpdate(update) {
    // Handle presence updates if needed
    console.log('Presence update:', update);
  }

  async sendMessage(to, message) {
    try {
      if (!this.sock || this.connectionState !== 'connected') {
        throw new Error('WhatsApp not connected');
      }

      // Set online status before sending
      await this.setOnlineStatus();

      const result = await this.sock.sendMessage(to, message);
      
      // Set offline status after sending
      setTimeout(async () => {
        await this.setOfflineStatus();
      }, 2000);

      return result;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async downloadMediaMessage(message) {
    try {
      if (!this.sock || this.connectionState !== 'connected') {
        throw new Error('WhatsApp not connected');
      }

      // Download the media buffer using the imported function
      const buffer = await downloadMediaMessage(message, 'buffer', {});
      return buffer;
    } catch (error) {
      console.error('Error downloading media:', error);
      throw error;
    }
  }

  async sendTypingStatus(to, isTyping = true) {
    try {
      if (!this.sock || this.connectionState !== 'connected') return;

      if (isTyping) {
        await this.setOnlineStatus();
        await this.sock.sendPresenceUpdate('composing', to);
      } else {
        await this.sock.sendPresenceUpdate('paused', to);
      }
    } catch (error) {
      console.error('Error sending typing status:', error);
    }
  }

  async sendRecordingStatus(to, isRecording = true) {
    try {
      if (!this.sock || this.connectionState !== 'connected') return;

      if (isRecording) {
        await this.setOnlineStatus();
        await this.sock.sendPresenceUpdate('recording', to);
      } else {
        await this.sock.sendPresenceUpdate('paused', to);
      }
    } catch (error) {
      console.error('Error sending recording status:', error);
    }
  }

  async setOnlineStatus() {
    try {
      if (!this.onlineStatus && this.sock) {
        await this.sock.sendPresenceUpdate('available');
        this.onlineStatus = true;
      }
    } catch (error) {
      console.error('Error setting online status:', error);
    }
  }

  async setOfflineStatus() {
    try {
      if (this.onlineStatus && this.sock) {
        await this.sock.sendPresenceUpdate('unavailable');
        this.onlineStatus = false;
      }
    } catch (error) {
      console.error('Error setting offline status:', error);
    }
  }

  async clearSession() {
    try {
      // Close existing connection first
      if (this.sock) {
        try {
          this.sock.ev.removeAllListeners();
          this.sock.end();
        } catch (error) {
          // Ignore cleanup errors
        }
        this.sock = null;
      }
      
      // Clear session files
      await fs.rm(this.sessionPath, { recursive: true, force: true });
      console.log('🗑️ Session cleared successfully');
      
      // Reset state
      this.connectionState = 'disconnected';
      this.authState = null;
      this.saveCreds = null;
      this.qr = null;
      this.retryAttempts = 0;
      this.onlineStatus = false;
      
      // Notify frontend
      global.io?.emit('session-cleared');
      global.io?.emit('connection-status', { 
        status: 'disconnected',
        canReconnect: true 
      });
      
    } catch (error) {
      console.error('Error clearing session:', error);
    }
  }

  addMessageHandler(handler) {
    this.messageHandlers.push(handler);
  }

  removeMessageHandler(handler) {
    const index = this.messageHandlers.indexOf(handler);
    if (index > -1) {
      this.messageHandlers.splice(index, 1);
    }
  }

  getConnectionState() {
    return {
      state: this.connectionState,
      qr: this.qr,
      online: this.onlineStatus
    };
  }

  async disconnect() {
    if (this.sock) {
      await this.sock.logout();
      this.sock = null;
      this.connectionState = 'disconnected';
      this.onlineStatus = false;
    }
  }
}

export default new WhatsAppService();