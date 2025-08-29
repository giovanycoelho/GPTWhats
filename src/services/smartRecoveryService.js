import db from '../config/database.js';

class SmartRecoveryService {
  constructor() {
    this.isProcessing = false;
    this.maxRecoveryAge = 24 * 60 * 60 * 1000; // 24 hours
    this.maxBatchSize = 3; // Very conservative to avoid spam
    this.batchDelay = 30000; // 30 seconds between batches
  }

  // Main method called when WhatsApp connects/starts
  async processUnrespondedConversations() {
    if (this.isProcessing) {
      console.log('⏳ Smart recovery already in progress...');
      return;
    }

    try {
      this.isProcessing = true;
      console.log('🔍 Starting smart recovery of unresponded conversations...');

      // Get all conversations from the database
      const conversationsNeedingResponse = await this.findConversationsNeedingResponse();
      
      if (conversationsNeedingResponse.length === 0) {
        console.log('✅ No conversations need recovery response');
        return;
      }

      console.log(`📋 Found ${conversationsNeedingResponse.length} conversations that may need response`);
      
      // Filter and prioritize conversations
      const filteredConversations = await this.filterAndPrioritizeConversations(conversationsNeedingResponse);
      
      if (filteredConversations.length === 0) {
        console.log('✅ No conversations passed smart filtering');
        return;
      }

      console.log(`🎯 ${filteredConversations.length} conversations passed smart filtering`);
      
      // Process in small batches with delays
      await this.processBatchesWithSmartDelay(filteredConversations);

    } catch (error) {
      console.error('❌ Error in smart recovery process:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  async findConversationsNeedingResponse() {
    try {
      // Get all conversations with recent activity
      const conversations = await db.all(`
        SELECT phone, messages, last_activity, created_at
        FROM conversations 
        WHERE last_activity > datetime('now', '-24 hours')
        ORDER BY last_activity DESC
      `);

      const needingResponse = [];

      for (const conv of conversations) {
        const messages = JSON.parse(conv.messages || '[]');
        if (messages.length === 0) continue;

        // Get the last message
        const lastMessage = messages[messages.length - 1];
        
        // Check if last message is from user and recent enough
        if (this.shouldConsiderForRecovery(lastMessage, messages, conv.phone)) {
          needingResponse.push({
            phone: conv.phone,
            lastMessage: lastMessage,
            messages: messages,
            lastActivity: conv.last_activity,
            priority: this.calculatePriority(messages, lastMessage)
          });
        }
      }

      return needingResponse;
    } catch (error) {
      console.error('Error finding conversations needing response:', error);
      return [];
    }
  }

  shouldConsiderForRecovery(lastMessage, allMessages, phone) {
    // Must be from user
    if (lastMessage.role !== 'user') {
      return false;
    }

    // Check age - not too old
    const messageAge = Date.now() - (lastMessage.timestamp || 0);
    if (messageAge > this.maxRecoveryAge) {
      return false;
    }

    // Not too recent (give time for normal processing)
    if (messageAge < 300000) { // Less than 5 minutes
      return false;
    }

    // Check if it's a meaningful message
    if (!this.isMeaningfulMessage(lastMessage)) {
      return false;
    }

    // Check conversation context
    if (!this.hasValidConversationContext(allMessages)) {
      return false;
    }

    return true;
  }

  isMeaningfulMessage(message) {
    const content = message.content || message.text || '';
    
    // Skip very short messages
    if (content.length < 3) return false;
    
    // Skip common non-meaningful messages
    const skipPatterns = [
      /^(ok|okay|👍|👌|😊|😂|haha|rsrs)$/i,
      /^(oi|olá|hey|hi)$/i, // Just greetings without content
      /^\s*$/, // Empty or whitespace only
      /^[.!?]+$/, // Just punctuation
    ];

    for (const pattern of skipPatterns) {
      if (pattern.test(content.trim())) {
        return false;
      }
    }

    return true;
  }

  hasValidConversationContext(messages) {
    // Need at least 2 messages for context
    if (messages.length < 2) return false;

    // Check if there's actual conversation content
    const textMessages = messages.filter(msg => 
      (msg.content || msg.text || '').length > 5
    );

    return textMessages.length >= 2;
  }

  calculatePriority(messages, lastMessage) {
    let priority = 0;

    // Recency boost (more recent = higher priority)
    const messageAge = Date.now() - (lastMessage.timestamp || 0);
    const hoursAge = messageAge / (1000 * 60 * 60);
    priority += Math.max(0, 24 - hoursAge); // 0-24 points

    // Message length boost (longer messages = more important)
    const messageLength = (lastMessage.content || lastMessage.text || '').length;
    priority += Math.min(messageLength / 10, 20); // 0-20 points

    // Question boost (questions are higher priority)
    const hasQuestion = /\?/.test(lastMessage.content || lastMessage.text || '');
    if (hasQuestion) priority += 15;

    // Conversation length boost
    priority += Math.min(messages.length, 10);

    return priority;
  }

  async filterAndPrioritizeConversations(conversations) {
    // Sort by priority (highest first)
    conversations.sort((a, b) => b.priority - a.priority);

    const filtered = [];
    
    for (const conv of conversations) {
      // Check if we haven't responded to this conversation recently
      const recentResponse = await this.hasRecentResponse(conv.phone);
      if (recentResponse) {
        console.log(`⏭️ Skipping ${conv.phone} - has recent response`);
        continue;
      }

      // Check if conversation has stop markers
      const hasStopMarker = await this.hasStopMarker(conv.phone);
      if (hasStopMarker) {
        console.log(`🚫 Skipping ${conv.phone} - has stop marker`);
        continue;
      }

      // Check if conversation was recently finalized naturally
      const isFinalized = await this.isConversationFinalized(conv.phone);
      if (isFinalized) {
        console.log(`🏁 Skipping ${conv.phone} - conversation was finalized naturally`);
        continue;
      }

      // Final AI analysis for very high quality filtering
      const shouldRespond = await this.aiAnalysisForRecovery(conv);
      if (!shouldRespond) {
        console.log(`🤖 Skipping ${conv.phone} - AI analysis says no`);
        continue;
      }

      filtered.push(conv);
      
      // Limit to prevent spam
      if (filtered.length >= 10) { // Max 10 conversations per startup
        console.log('📊 Reached maximum conversations for recovery (10)');
        break;
      }
    }

    return filtered;
  }

  async hasRecentResponse(phone) {
    try {
      const response = await db.get(`
        SELECT COUNT(*) as count FROM followup_history 
        WHERE phone = ? AND sent_at > datetime('now', '-2 hours')
      `, [phone]);

      return response.count > 0;
    } catch (error) {
      return false;
    }
  }

  async hasStopMarker(phone) {
    try {
      const marker = await db.get(`
        SELECT id FROM followup_history 
        WHERE phone = ? AND followup_type = 'stop_marker' 
        AND sent_at > datetime('now', '-24 hours')
      `, [phone]);

      return !!marker;
    } catch (error) {
      return false;
    }
  }

  async isConversationFinalized(phone) {
    try {
      const finalization = await db.get(`
        SELECT id FROM followup_history 
        WHERE phone = ? AND followup_type = 'conversation_finalized' 
        AND sent_at > datetime('now', '-24 hours')
      `, [phone]);

      return !!finalization;
    } catch (error) {
      return false;
    }
  }

  async aiAnalysisForRecovery(conversation) {
    try {
      // Import AI service
      const aiService = await import('./aiService.js');
      
      if (!aiService.default.openai) {
        return true; // Default to yes if AI not available
      }

      // Get last few messages for context
      const recentMessages = conversation.messages.slice(-5);
      const contextText = recentMessages.map(msg => {
        const role = msg.role === 'user' ? 'Cliente' : 'Assistente';
        return `${role}: ${msg.content || msg.text || '[mensagem não identificada]'}`;
      }).join('\n');

      const analysisPrompt = `
ANÁLISE PARA RECUPERAÇÃO DE CONVERSA:

CONTEXTO DA CONVERSA:
${contextText}

ÚLTIMA MENSAGEM DO CLIENTE: "${conversation.lastMessage.content || conversation.lastMessage.text}"

CRITÉRIOS PARA RESPONDER (responda "RESPONDER"):
- Cliente fez uma pergunta que não foi respondida
- Cliente demonstrou interesse em produto/serviço
- Cliente solicitou informações específicas
- Conversa estava em andamento e foi interrompida
- Cliente esperava uma resposta

CRITÉRIOS PARA NÃO RESPONDER (responda "NAO_RESPONDER"):
- Conversa já foi finalizada naturalmente
- Cliente apenas disse "ok", "obrigado" ou similar sem pergunta
- Mensagem é apenas uma saudação simples
- Cliente demonstrou desinteresse
- Conversa parece spam ou irrelevante

INSTRUÇÕES:
Analise se esta conversa realmente precisa de uma resposta de recuperação.
Responda APENAS com "RESPONDER" ou "NAO_RESPONDER".
Seja conservador - apenas responda se realmente necessário.
`;

      const decision = await aiService.default.evaluateCondition(analysisPrompt);
      const shouldRespond = decision && decision.toUpperCase().includes('RESPONDER');
      
      console.log(`🧠 AI recovery analysis for ${conversation.phone}: ${decision} → ${shouldRespond ? 'YES' : 'NO'}`);
      
      return shouldRespond;

    } catch (error) {
      console.error('Error in AI analysis for recovery:', error);
      return false; // Conservative: don't respond if analysis fails
    }
  }

  async processBatchesWithSmartDelay(conversations) {
    console.log(`📦 Processing ${conversations.length} conversations in batches of ${this.maxBatchSize}`);

    for (let i = 0; i < conversations.length; i += this.maxBatchSize) {
      const batch = conversations.slice(i, i + this.maxBatchSize);
      const batchNumber = Math.floor(i / this.maxBatchSize) + 1;
      const totalBatches = Math.ceil(conversations.length / this.maxBatchSize);

      console.log(`📋 Processing recovery batch ${batchNumber}/${totalBatches} (${batch.length} conversations)`);

      // Process batch
      await this.processBatch(batch);

      // Smart delay between batches (except last batch)
      if (i + this.maxBatchSize < conversations.length) {
        console.log(`⏸️ Waiting ${this.batchDelay / 1000}s before next recovery batch...`);
        await this.delay(this.batchDelay);
      }
    }

    console.log('✅ Smart recovery process completed');
  }

  async processBatch(conversations) {
    for (const conv of conversations) {
      try {
        await this.processRecoveryConversation(conv);
        // Small delay between individual messages
        await this.delay(5000); // 5 seconds between each conversation
      } catch (error) {
        console.error(`❌ Error processing recovery for ${conv.phone}:`, error);
      }
    }
  }

  async processRecoveryConversation(conversation) {
    try {
      console.log(`💬 Processing recovery for ${conversation.phone} (priority: ${conversation.priority.toFixed(1)})`);

      // Import AI service
      const aiService = await import('./aiService.js');
      const contactsService = await import('./contactsService.js');
      
      // Get contact name if available
      let contactName = null;
      try {
        const contact = await contactsService.default.getContact(conversation.phone);
        contactName = contact?.name;
      } catch (error) {
        // Contact name is optional
      }

      // Create message data for processing
      const messageData = {
        text: conversation.lastMessage.content || conversation.lastMessage.text || '',
        timestamp: conversation.lastMessage.timestamp || Date.now(),
        role: 'user',
        type: 'text',
        isRecoveryMessage: true, // Mark as recovery
        recoveryContext: {
          originalTimestamp: conversation.lastMessage.timestamp,
          messageAge: Date.now() - (conversation.lastMessage.timestamp || 0),
          conversationLength: conversation.messages.length
        }
      };

      // Process with AI service
      const result = await aiService.default.processMessage(
        conversation.phone, 
        messageData, 
        contactName, 
        null
      );

      if (result === 'queued' || result === 'skipped') {
        // Log the recovery attempt
        await this.logRecoveryAttempt(conversation.phone, 'success', conversation.priority);
        console.log(`✅ Recovery queued for ${conversation.phone}`);
      } else {
        console.log(`⚠️ Recovery result for ${conversation.phone}: ${result}`);
        await this.logRecoveryAttempt(conversation.phone, 'partial', conversation.priority);
      }

    } catch (error) {
      console.error(`❌ Error in recovery processing for ${conversation.phone}:`, error);
      await this.logRecoveryAttempt(conversation.phone, 'error', conversation.priority, error.message);
    }
  }

  async logRecoveryAttempt(phone, status, priority, error = null) {
    try {
      await db.run(`
        INSERT INTO followup_history (phone, message_sent, sent_at, followup_type, success)
        VALUES (?, ?, datetime('now'), 'recovery_attempt', ?)
      `, [
        phone, 
        `[RECOVERY] Status: ${status}, Priority: ${priority.toFixed(1)}${error ? ', Error: ' + error : ''}`,
        status === 'success' ? 1 : 0
      ]);
    } catch (dbError) {
      console.error('Error logging recovery attempt:', dbError);
    }
  }

  async getRecoveryStats() {
    try {
      const stats = await db.get(`
        SELECT 
          COUNT(*) as total_attempts,
          COUNT(CASE WHEN success = 1 THEN 1 END) as successful,
          MAX(sent_at) as last_recovery
        FROM followup_history 
        WHERE followup_type = 'recovery_attempt'
        AND sent_at > datetime('now', '-24 hours')
      `);

      return {
        totalAttempts: stats.total_attempts || 0,
        successful: stats.successful || 0,
        lastRecovery: stats.last_recovery,
        successRate: stats.total_attempts > 0 ? (stats.successful / stats.total_attempts) * 100 : 0
      };
    } catch (error) {
      console.error('Error getting recovery stats:', error);
      return null;
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Method to be called when WhatsApp connects
  async onWhatsAppConnected() {
    console.log('🚀 WhatsApp connected - checking smart recovery settings...');
    
    // Check if smart recovery is enabled
    try {
      const configService = (await import('./configService.js')).default;
      const smartRecoveryEnabled = await configService.get('smart_recovery_enabled');
      
      if (smartRecoveryEnabled !== 'true') {
        console.log('⏭️ Smart Recovery desativado nas configurações');
        return;
      }
      
      console.log('📋 Smart Recovery ativado - iniciando em 10 segundos...');
      
      // Wait for connection to stabilize and other services to initialize
      setTimeout(async () => {
        await this.processUnrespondedConversations();
      }, 10000); // 10 second delay
      
    } catch (error) {
      console.error('Error checking smart recovery settings:', error);
    }
  }
}

const smartRecoveryService = new SmartRecoveryService();
export default smartRecoveryService;