import express from 'express';
import whatsappService from '../services/whatsappService.js';
import aiService from '../services/aiService.js';
import conversationService from '../services/conversationService.js';
import audioService from '../services/audioService.js';
import configService from '../services/configService.js';
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
async function handleIncomingMessage(message) {
  try {
    const phone = message.key.remoteJid;
    const isGroup = phone.endsWith('@g.us');
    const isStatus = phone === 'status@broadcast';
    
    // Skip group messages and status updates
    if (isGroup || isStatus) {
      console.log(`Skipping ${isStatus ? 'status' : 'group'} message from:`, phone);
      return;
    }
    
    // Update contact info and get contact name
    const contactName = message.pushName || null;
    await updateContactInfo(phone, message);
    
    // Prepare message data for AI processing
    const messageData = await prepareMessageData(message);
    
    // Process with AI, passing contact name
    await aiService.processMessage(phone, messageData, contactName);
    
  } catch (error) {
    console.error('Error handling incoming message:', error);
  }
}

async function updateContactInfo(phone, message) {
  try {
    // Don't update contact info for status messages
    if (phone === 'status@broadcast') {
      return;
    }
    
    const { default: contactsService } = await import('../services/contactsService.js');
    const pushName = message.pushName || formatPhoneNumber(phone);
    
    await contactsService.updateContact(phone, {
      name: pushName,
      lastMessageAt: new Date().toISOString()
    });
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
  } else {
    messageData.text = '[Tipo de mensagem não suportado]';
    messageData.type = 'unsupported';
  }
  
  return messageData;
}

export default router;