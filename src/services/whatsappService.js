import { makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion, downloadMediaMessage } from '@whiskeysockets/baileys';
import qrcode from 'qrcode';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import pendingMessagesService from './pendingMessagesService.js';
import configService from './configService.js';

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
    this.wasAutoConnecting = false; // Track auto-connection attempts
    this.persistentConnection = true; // WhatsApp should stay connected regardless of frontend
    
    // Online time tracking
    this.connectionStartTime = null;
    this.onlineTimeInterval = null;
    
    // Reconnection control
    this.lastDisconnectTime = null;
    this.consecutiveFailures = 0;
  }

  // Safe emit function that doesn't break WhatsApp connection
  safeEmit(event, data) {
    try {
      if (global.io && global.io.sockets.sockets.size > 0) {
        global.io.emit(event, data);
      }
    } catch (error) {
      // Log but don't throw - frontend disconnection should not affect WhatsApp
      console.log('Frontend emit failed (this is normal during page refresh):', error.message);
    }
  }

  // Sync WhatsApp state with newly connected frontend clients
  syncStateWithFrontend() {
    if (!global.io || global.io.sockets.sockets.size === 0) return;
    
    console.log('🔄 Syncing WhatsApp state with frontend...');
    
    // Send current connection status
    this.safeEmit('connection-status', { 
      status: this.connectionState 
    });
    
    // Send QR code if available
    if (this.qr) {
      this.safeEmit('qr-code', this.qr);
    }
    
    console.log(`📊 State synced: ${this.connectionState}`);
  }

  async hasValidSession() {
    try {
      await fs.mkdir(this.sessionPath, { recursive: true });
      
      // Check if creds.json exists (main session file)
      const credsPath = path.join(this.sessionPath, 'creds.json');
      await fs.access(credsPath);
      
      // Check if the file is not empty and has valid content
      const credsContent = await fs.readFile(credsPath, 'utf8');
      const creds = JSON.parse(credsContent);
      
      // Check if essential fields exist
      return creds && 
             creds.noiseKey && 
             creds.signedIdentityKey && 
             creds.signedPreKey && 
             creds.registrationId;
    } catch (error) {
      // Any error means no valid session
      return false;
    }
  }

  async initializeWithAutoConnect() {
    this.wasAutoConnecting = true;
    return this.initialize();
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
        this.safeEmit('qr-code', qrString);
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
      
      // Stop online time tracking
      this.stopOnlineTimeTracking();
      
      // Update database connection status
      await configService.set('whatsapp_connected', 'false');
      
      this.safeEmit('connection-status', { 
        status: 'disconnected',
        canReconnect: shouldReconnect 
      });

      // Record disconnect time and failures
      this.lastDisconnectTime = Date.now();
      
      if (shouldReconnect && this.retryAttempts < this.maxRetries) {
        this.retryAttempts++;
        this.consecutiveFailures++;
        
        // Exponential backoff: 5s, 10s, 20s, 40s, 80s
        const backoffTime = Math.min(5000 * Math.pow(2, this.consecutiveFailures - 1), 80000);
        
        console.log(`🔄 Reconnection attempt ${this.retryAttempts}/${this.maxRetries} in ${backoffTime/1000}s (failure #${this.consecutiveFailures})`);
        setTimeout(() => this.connect(), backoffTime);
      } else if (!shouldReconnect) {
        console.log('🛑 Connection terminated - manual reconnection required');
        this.retryAttempts = 0;
        this.consecutiveFailures = 0;
      } else {
        console.log('❌ Max retry attempts reached - clearing session and waiting for manual reconnection');
        this.consecutiveFailures = 0;
        await this.clearSession();
      }
    } else if (connection === 'open') {
      console.log('✅ WhatsApp connected successfully');
      this.connectionState = 'connected';
      this.retryAttempts = 0;
      this.consecutiveFailures = 0; // Reset failure counter on successful connection
      this.qr = null;
      
      // Start online time tracking
      this.startOnlineTimeTracking();
      
      // Update database connection status
      await configService.set('whatsapp_connected', 'true');
      
      // Notify about successful auto-reconnection
      if (this.wasAutoConnecting) {
        console.log('🎉 Auto-reconnection successful!');
        this.wasAutoConnecting = false;
      }
      
      this.safeEmit('connection-status', { 
        status: 'connected' 
      });

      // Set initial offline status
      await this.setOfflineStatus();

      // Initialize and process pending messages with smart recovery
      await pendingMessagesService.initializeService();
      
      // Import and use smart recovery service
      const smartRecoveryService = (await import('./smartRecoveryService.js')).default;
      await smartRecoveryService.onWhatsAppConnected();
      
      // Ensure message handler is set up for AI processing
      await this.ensureMessageHandlerSetup();
    } else if (connection === 'connecting') {
      console.log('🔄 Connecting to WhatsApp...');
      this.connectionState = 'connecting';
      this.safeEmit('connection-status', { 
        status: 'connecting' 
      });
    }
  }

  async handleIncomingMessages(m) {
    const message = m.messages[0];
    if (!message || message.key.fromMe) return;

    console.log('📝 Message received from:', message.key.remoteJid);

    try {
      this.safeEmit('message-received', {
        from: message.key.remoteJid,
        message: message.message,
        timestamp: message.messageTimestamp
      });

      // Update metrics for received message
      try {
        const { updateMetric } = await import('../controllers/dashboardController.js');
        await updateMetric('message_received', 1);
      } catch (metricsError) {
        console.error('Error updating message received metrics:', metricsError);
      }

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

      // Log detalhado para debug de mensagens automáticas
      const messagePreview = message.text?.substring(0, 50) || '[Media]';
      console.log(`📤 Enviando mensagem para ${to}: "${messagePreview}"`);
      
      // Set online status before sending
      await this.setOnlineStatus();

      const result = await this.sock.sendMessage(to, message);
      
      // Update metrics for sent message
      try {
        const { updateMetric } = await import('../controllers/dashboardController.js');
        await updateMetric('message_sent', 1);
      } catch (metricsError) {
        console.error('Error updating message sent metrics:', metricsError);
      }
      
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
      
      this.safeEmit('session-cleared');
      this.safeEmit('connection-status', { 
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
      this.stopOnlineTimeTracking();
      
      // Update database connection status
      await configService.set('whatsapp_connected', 'false');
    }
  }

  // Online time tracking functions
  startOnlineTimeTracking() {
    this.connectionStartTime = new Date();
    
    // Update online time every 30 seconds
    this.onlineTimeInterval = setInterval(async () => {
      await this.updateOnlineTime();
    }, 30000);
    
    console.log('⏱️ Started online time tracking');
  }

  stopOnlineTimeTracking() {
    if (this.onlineTimeInterval) {
      clearInterval(this.onlineTimeInterval);
      this.onlineTimeInterval = null;
    }
    
    // Update final online time before stopping
    if (this.connectionStartTime) {
      this.updateOnlineTime();
      this.connectionStartTime = null;
    }
    
    console.log('⏱️ Stopped online time tracking');
  }

  async updateOnlineTime() {
    if (!this.connectionStartTime) return;
    
    try {
      const now = new Date();
      const onlineTimeSeconds = Math.floor((now - this.connectionStartTime) / 1000);
      
      if (onlineTimeSeconds > 0) {
        const { updateMetric } = await import('../controllers/dashboardController.js');
        await updateMetric('online_time', onlineTimeSeconds);
        
        // Reset start time for next interval
        this.connectionStartTime = now;
      }
    } catch (error) {
      console.error('Error updating online time metrics:', error);
    }
  }

  async ensureMessageHandlerSetup() {
    try {
      // Import the handler function from whatsappController
      const whatsappController = await import('../controllers/whatsappController.js');
      
      // Check if we already have a handler (avoid duplicates)
      if (this.messageHandlers.length === 0) {
        console.log('🔧 Setting up message handler for AI processing');
        
        // Add the message handler
        this.addMessageHandler(async (message) => {
          try {
            // Call the handleIncomingMessage function directly
            const { handleIncomingMessage } = whatsappController;
            if (handleIncomingMessage) {
              await handleIncomingMessage(message);
            }
          } catch (error) {
            console.error('Error in message handler:', error);
          }
        });
        
        console.log(`✅ Message handler added. Total handlers: ${this.messageHandlers.length}`);
      } else {
        console.log(`📋 Message handler already exists. Total handlers: ${this.messageHandlers.length}`);
      }
    } catch (error) {
      console.error('Error setting up message handler:', error);
    }
  }
}

export default new WhatsAppService();