import messageTrackingService from './messageTrackingService.js';
import aiService from './aiService.js';
import conversationService from './conversationService.js';

class PendingMessagesService {
  constructor() {
    this.isProcessingPending = false;
    this.processingInterval = null;
    this.maxMessagesPerBatch = 5; // Limit batch processing to avoid spam
    this.batchDelay = 60000; // 1 minute between batches
  }

  async initializeService() {
    // Initialize message tracking service
    await messageTrackingService.initializeDatabase();
    
    // Start periodic check for pending messages
    this.startPeriodicCheck();
    
    console.log('🔄 Pending Messages Service initialized');
  }

  async processPendingMessagesOnConnection() {
    try {
      if (this.isProcessingPending) {
        console.log('⏳ Already processing pending messages, skipping...');
        return;
      }

      console.log('🔍 Checking for pending messages after WhatsApp connection...');
      
      this.isProcessingPending = true;
      
      // Get all unresponded messages older than 10 minutes
      const unrespondedConversations = await messageTrackingService.getUnrespondedMessages(10);
      
      if (unrespondedConversations.length === 0) {
        console.log('✅ No pending messages to process');
        this.isProcessingPending = false;
        return;
      }

      console.log(`📬 Found ${unrespondedConversations.length} conversations with unresponded messages`);
      
      // Process in batches to avoid overwhelming
      await this.processBatches(unrespondedConversations);
      
    } catch (error) {
      console.error('Error processing pending messages:', error);
    } finally {
      this.isProcessingPending = false;
    }
  }

  async processBatches(conversations) {
    // Sort by oldest message first
    conversations.sort((a, b) => new Date(a.oldest_message) - new Date(b.oldest_message));
    
    for (let i = 0; i < conversations.length; i += this.maxMessagesPerBatch) {
      const batch = conversations.slice(i, i + this.maxMessagesPerBatch);
      
      console.log(`📦 Processing batch ${Math.floor(i / this.maxMessagesPerBatch) + 1}/${Math.ceil(conversations.length / this.maxMessagesPerBatch)}`);
      
      await this.processBatch(batch);
      
      // Delay between batches (except for the last one)
      if (i + this.maxMessagesPerBatch < conversations.length) {
        console.log(`⏸️ Waiting ${this.batchDelay / 1000}s before next batch...`);
        await this.delay(this.batchDelay);
      }
    }
  }

  async processBatch(conversations) {
    const promises = conversations.map(async (conv) => {
      try {
        await this.processConversation(conv);
      } catch (error) {
        console.error(`Error processing conversation ${conv.phone}:`, error);
      }
    });

    await Promise.all(promises);
  }

  async processConversation(conv) {
    const phone = conv.phone;
    
    console.log(`💬 Processing pending messages for ${phone} (${conv.unresponded_count} messages)`);
    
    // Check if we should still respond (maybe manually responded in the meantime)
    const shouldRespond = await messageTrackingService.shouldRespondToPhone(phone);
    if (!shouldRespond) {
      console.log(`⏭️ Skipping ${phone} - already responded or handled`);
      return;
    }

    // Get conversation context
    const context = await messageTrackingService.getConversationContext(phone, 10);
    
    // Create a synthetic message data for processing
    const messageData = {
      text: `[Mensagens pendentes] ${conv.recent_messages}`,
      timestamp: Date.now(),
      role: 'user',
      type: 'text',
      isPendingRecovery: true
    };

    // Process with AI service
    console.log(`🤖 Generating response for pending messages from ${phone}`);
    await aiService.processMessage(phone, messageData, null, null);
  }

  async startPeriodicCheck() {
    // Check for pending messages every 15 minutes
    const checkInterval = 15 * 60 * 1000; // 15 minutes
    
    this.processingInterval = setInterval(async () => {
      if (!this.isProcessingPending) {
        try {
          const configService = (await import('./configService.js')).default;
          const pendingMessagesEnabled = await configService.get('pending_messages_enabled');
          
          if (pendingMessagesEnabled !== 'true') {
            return; // Skip if disabled
          }
          
          const pending = await messageTrackingService.checkPendingMessages();
          if (pending.length > 0) {
            console.log(`🔔 Periodic check found ${pending.length} pending conversations`);
            await this.processPendingMessagesOnConnection();
          }
        } catch (error) {
          console.error('Error in periodic check:', error);
        }
      }
    }, checkInterval);

    console.log(`⏰ Started periodic pending message check every ${checkInterval / 1000 / 60} minutes`);
  }

  async stopPeriodicCheck() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log('⏹️ Stopped periodic pending message check');
    }
  }

  async getPendingStats() {
    try {
      const unresponded = await messageTrackingService.getUnrespondedMessages(0); // All pending
      const trackingStats = await messageTrackingService.getStats();
      
      return {
        pendingConversations: unresponded.length,
        totalPendingMessages: unresponded.reduce((sum, conv) => sum + conv.unresponded_count, 0),
        oldestPending: unresponded.length > 0 ? unresponded[0].oldest_message : null,
        trackingStats
      };
    } catch (error) {
      console.error('Error getting pending stats:', error);
      return null;
    }
  }

  async markAllAsRead(phone) {
    try {
      // Mark all pending messages for a specific phone as manually handled
      await messageTrackingService.markConversationResponded(phone, Date.now() - 86400000); // Last 24 hours
      console.log(`✅ Marked all pending messages as read for ${phone}`);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Method to be called when WhatsApp connects
  async onWhatsAppConnected() {
    console.log('📱 WhatsApp connected - checking pending messages settings...');
    
    // Check if pending message processing is enabled
    try {
      const configService = (await import('./configService.js')).default;
      const pendingMessagesEnabled = await configService.get('pending_messages_enabled');
      
      if (pendingMessagesEnabled !== 'true') {
        console.log('⏭️ Processamento de mensagens pendentes desativado nas configurações');
        return;
      }
      
      console.log('📬 Processamento de mensagens pendentes ativado - iniciando...');
      
      // Wait a bit for connection to stabilize
      await this.delay(5000);
      
      // Process pending messages
      await this.processPendingMessagesOnConnection();
      
    } catch (error) {
      console.error('Error checking pending messages settings:', error);
    }
  }

  // Method to be called when WhatsApp disconnects
  async onWhatsAppDisconnected() {
    console.log('📱 WhatsApp disconnected - pausing pending message processing');
    this.isProcessingPending = false;
  }
}

const pendingMessagesService = new PendingMessagesService();
export default pendingMessagesService;