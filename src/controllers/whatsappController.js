import express from 'express';
import whatsappService from '../services/whatsappService.js';
import aiService from '../services/aiService.js';
import conversationService from '../services/conversationService.js';
import audioService from '../services/audioService.js';
import configService from '../services/configService.js';
import messageTrackingService from '../services/messageTrackingService.js';
import { formatPhoneNumber } from '../utils/textUtils.js';

const router = express.Router();

// Initialize WhatsApp connection
router.post('/connect', async (req, res) => {
  try {
    const success = await whatsappService.initialize();
    
    if (success) {
      // Set up message handler for AI processing
      whatsappService.addMessageHandler(async (message) => {
        await handleIncomingMessage(message);
      });
      
      res.json({ 
        success: true, 
        message: 'WhatsApp initialization started',
        state: whatsappService.getConnectionState()
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to initialize WhatsApp' 
      });
    }
  } catch (error) {
    console.error('Error connecting to WhatsApp:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error connecting to WhatsApp',
      error: error.message 
    });
  }
});

// Get connection status
router.get('/status', (req, res) => {
  const state = whatsappService.getConnectionState();
  res.json(state);
});

// Disconnect WhatsApp
router.post('/disconnect', async (req, res) => {
  try {
    await whatsappService.disconnect();
    res.json({ success: true, message: 'WhatsApp disconnected' });
  } catch (error) {
    console.error('Error disconnecting WhatsApp:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error disconnecting WhatsApp',
      error: error.message 
    });
  }
});

// Clear session and reconnect
router.post('/clear-session', async (req, res) => {
  try {
    await whatsappService.clearSession();
    // Wait a moment before responding to ensure session is cleared
    setTimeout(() => {
      res.json({ success: true, message: 'Session cleared successfully' });
    }, 1000);
  } catch (error) {
    console.error('Error clearing session:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error clearing session',
      error: error.message 
    });
  }
});

// Force restart connection
router.post('/restart', async (req, res) => {
  try {
    await whatsappService.clearSession();
    await whatsappService.initialize();
    res.json({ success: true, message: 'WhatsApp service restarted' });
  } catch (error) {
    console.error('Error restarting WhatsApp service:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error restarting WhatsApp service',
      error: error.message 
    });
  }
});

// Send manual message (for testing)
router.post('/send-message', async (req, res) => {
  try {
    const { to, message } = req.body;
    
    if (!to || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Phone number and message are required' 
      });
    }
    
    await whatsappService.sendMessage(to, { text: message });
    res.json({ success: true, message: 'Message sent' });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error sending message',
      error: error.message 
    });
  }
});

// Get conversation history
router.get('/conversations/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    const conversation = await conversationService.getConversation(phone);
    
    res.json({ 
      success: true, 
      conversation: conversation || { messages: [] }
    });
  } catch (error) {
    console.error('Error getting conversation:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error getting conversation',
      error: error.message 
    });
  }
});

// Clear conversation memory
router.delete('/conversations/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    await conversationService.clearConversation(phone);
    
    res.json({ success: true, message: 'Conversation cleared' });
  } catch (error) {
    console.error('Error clearing conversation:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error clearing conversation',
      error: error.message 
    });
  }
});

// Test AI response
router.post('/test-ai', async (req, res) => {
  try {
    const { message, phone } = req.body;
    
    if (!message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Message is required' 
      });
    }
    
    const testPhone = phone || 'test@s.whatsapp.net';
    const messageData = {
      text: message,
      timestamp: Date.now(),
      role: 'user'
    };
    
    const result = await aiService.processMessage(testPhone, messageData);
    
    res.json({ 
      success: true, 
      result,
      message: 'AI test completed'
    });
  } catch (error) {
    console.error('Error testing AI:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error testing AI',
      error: error.message 
    });
  }
});

// Handle incoming WhatsApp message
export async function handleIncomingMessage(message) {
  try {
    const phone = message.key.remoteJid;
    const isGroup = phone.endsWith('@g.us');
    const isStatus = phone === 'status@broadcast';
    const isFromMe = message.key.fromMe;
    const contactName = message.pushName || message.pushname || message.notify || 'Unknown';
    
    console.log(`📨 Processing message from ${contactName} (${phone})`);
    
    // Skip group messages and status updates
    if (isGroup || isStatus) {
      console.log(`⏭️ Skipping ${isStatus ? 'status' : 'group'} message from: ${contactName} (${phone})`);
      return;
    }
    
    // Handle outgoing messages (from us) - track manual responses
    if (isFromMe) {
      console.log(`⬅️ Outgoing message detected from us to: ${contactName} (${phone})`);
      await messageTrackingService.detectManualResponse(phone, message.key.id);
      return;
    }
    
    // Track incoming message
    console.log(`🔄 Preparing message data for ${contactName} (${phone})`);
    const messageData = await prepareMessageData(message);
    const messageId = message.key.id;
    const timestamp = message.messageTimestamp * 1000 || Date.now();
    
    // Validate message data
    if (!messageData || (!messageData.text && !messageData.audio && !messageData.image)) {
      console.log(`⚠️ Empty or invalid message data from ${contactName} (${phone}):`, messageData);
    }
    
    await messageTrackingService.trackIncomingMessage(
      phone, 
      messageId, 
      messageData.text || messageData.type || 'media', 
      timestamp
    );
    
    // Update contact info and get contact name
    console.log('📱 Contact name detected:', contactName, 'for phone:', phone);
    await updateContactInfo(phone, message);
    
    // Process with AI, passing contact name and message ID for tracking
    console.log(`🤖 Sending message to AI service from ${contactName} (${phone})`);
    await aiService.processMessage(phone, messageData, contactName, messageId);
    console.log(`✅ Message processing completed for ${contactName} (${phone})`);
    
  } catch (error) {
    const contactName = message?.pushName || message?.pushname || message?.notify || 'Unknown';
    const phone = message?.key?.remoteJid || 'Unknown';
    console.error(`❌ Error handling incoming message from ${contactName} (${phone}):`, error);
    console.error('Message object:', JSON.stringify(message, null, 2));
  }
}

async function updateContactInfo(phone, message) {
  try {
    // Don't update contact info for status messages
    if (phone === 'status@broadcast') {
      return;
    }
    
    const { default: contactsService } = await import('../services/contactsService.js');
    const pushName = message.pushName || message.pushname || message.notify || formatPhoneNumber(phone);
    
    // Only update name if it's a valid name (not a phone number)
    const updateData = {
      lastMessageAt: new Date().toISOString()
    };
    
    if (pushName && !pushName.includes('+') && pushName !== formatPhoneNumber(phone)) {
      updateData.name = pushName.trim();
      console.log('💾 Saving contact name:', pushName.trim(), 'for phone:', phone);
    }
    
    await contactsService.updateContact(phone, updateData);
  } catch (error) {
    console.error('Error updating contact info:', error);
  }
}

async function prepareMessageData(message) {
  const messageData = {
    timestamp: message.messageTimestamp * 1000 || Date.now(),
    role: 'user'
  };
  
  if (message.message.conversation) {
    messageData.text = message.message.conversation;
  } else if (message.message.extendedTextMessage) {
    messageData.text = message.message.extendedTextMessage.text;
  } else if (message.message.ephemeralMessage && message.message.ephemeralMessage.message) {
    // Handle ephemeral messages by extracting their inner content
    const innerMessage = message.message.ephemeralMessage.message;
    if (innerMessage.conversation) {
      messageData.text = innerMessage.conversation;
    } else if (innerMessage.extendedTextMessage) {
      messageData.text = innerMessage.extendedTextMessage.text;
    } else if (innerMessage.audioMessage) {
      // Handle ephemeral audio messages
      try {
        const buffer = await whatsappService.downloadMediaMessage(message);
        messageData.audio = buffer;
        messageData.type = 'audio';
        console.log('Ephemeral audio downloaded successfully, buffer size:', buffer?.length || 0);
      } catch (error) {
        console.error('Error processing ephemeral audio:', error);
        messageData.text = 'Áudio temporário recebido (erro ao processar)';
        messageData.type = 'text';
      }
    } else if (innerMessage.imageMessage) {
      // Handle ephemeral image messages
      try {
        const buffer = await whatsappService.downloadMediaMessage(message);
        messageData.image = buffer.toString('base64');
        messageData.type = 'image';
        messageData.caption = innerMessage.imageMessage.caption || '';
        console.log('Ephemeral image downloaded successfully');
      } catch (error) {
        console.error('Error processing ephemeral image:', error);
        messageData.text = 'Imagem temporária recebida (erro ao processar)';
      }
    } else {
      console.log('🔄 Unsupported ephemeral message type:', Object.keys(innerMessage));
      messageData.text = '[Mensagem temporária não suportada]';
      messageData.type = 'ephemeral_unsupported';
    }
  } else if (message.message.audioMessage) {
    // Download and process audio
    try {
      const buffer = await whatsappService.downloadMediaMessage(message);
      messageData.audio = buffer; // Pass the actual audio buffer (OGG format from WhatsApp)
      messageData.type = 'audio';
      console.log('Audio downloaded successfully, buffer size:', buffer?.length || 0);
    } catch (error) {
      console.error('Error processing audio:', error);
      messageData.text = 'Áudio recebido (erro ao processar)';
      messageData.type = 'text';
    }
  } else if (message.message.imageMessage) {
    // Download and process image
    try {
      const buffer = await whatsappService.downloadMediaMessage(message);
      messageData.image = buffer.toString('base64');
      messageData.type = 'image';
      messageData.caption = message.message.imageMessage.caption || '';
    } catch (error) {
      console.error('Error processing image:', error);
      messageData.text = 'Imagem recebida (erro ao processar)';
    }
  } else if (message.message.documentMessage) {
    messageData.document = {
      fileName: message.message.documentMessage.fileName,
      mimetype: message.message.documentMessage.mimetype
    };
    messageData.type = 'document';
    messageData.text = `Documento enviado: ${messageData.document.fileName}`;
  } else if (message.message.videoMessage) {
    // Check if it's a GIF (WhatsApp sends GIFs as videos with gifPlayback flag)
    const isGif = message.message.videoMessage.gifPlayback || 
                  message.message.videoMessage.caption?.toLowerCase().includes('gif') ||
                  (message.message.videoMessage.seconds && message.message.videoMessage.seconds < 10);
    
    if (isGif) {
      messageData.type = 'gif';
      messageData.text = '🎬 GIF recebido';
    } else {
      messageData.type = 'video';
      messageData.text = '🎥 Vídeo recebido';
    }
  } else if (message.message.stickerMessage) {
    messageData.type = 'sticker';
    messageData.text = '😄 Figurinha recebida';
  } else if (message.message.locationMessage) {
    messageData.type = 'location';
    messageData.text = 'Localização compartilhada';
  } else if (message.message.contactMessage) {
    messageData.type = 'contact';
    messageData.text = `Contato compartilhado: ${message.message.contactMessage.displayName}`;
  } else {
    console.log('🚫 Unsupported message type:', Object.keys(message.message));
    messageData.text = '[Tipo de mensagem não suportado]';
    messageData.type = 'unsupported';
  }
  
  return messageData;
}

export default router;