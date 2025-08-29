import db from '../config/database.js';

class ConversationService {
  constructor() {
    this.memoryTimeout = 14400000; // 4 hours in milliseconds (increased from 1 hour)
  }

  async getConversation(phone) {
    try {
      const conversation = await db.get(
        `SELECT * FROM conversations WHERE phone = ? ORDER BY last_activity DESC LIMIT 1`,
        [phone]
      );

      if (!conversation) {
        return null;
      }

      // Check if conversation is still within memory timeout
      const lastActivity = new Date(conversation.last_activity).getTime();
      const now = Date.now();
      
      if (now - lastActivity > this.memoryTimeout) {
        // Memory expired, return null to start fresh
        return null;
      }

      return {
        id: conversation.id,
        phone: conversation.phone,
        messages: conversation.messages ? JSON.parse(conversation.messages) : [],
        lastActivity: conversation.last_activity,
        createdAt: conversation.created_at
      };
    } catch (error) {
      console.error('Error getting conversation:', error);
      return null;
    }
  }

  async addMessage(phone, message) {
    try {
      // Get existing conversation
      let conversation = await this.getConversation(phone);
      const isFirstMessage = !conversation;
      
      if (!conversation) {
        // Create new conversation
        conversation = {
          phone,
          messages: [],
          lastActivity: new Date().toISOString(),
          createdAt: new Date().toISOString()
        };
        
        // Update metrics for new conversation
        try {
          const { updateMetric } = await import('../controllers/dashboardController.js');
          await updateMetric('conversation_started', 1);
        } catch (metricsError) {
          console.error('Error updating conversation started metrics:', metricsError);
        }
      }

      // Check if this is a user message and conversation was inactive
      const wasInactive = conversation.messages.length > 0 && 
                         message.role === 'user' && 
                         !isFirstMessage;

      // Check if this might be a "new conversation" (long period of inactivity)
      const lastMessageTime = conversation.messages.length > 0 ? 
                             conversation.messages[conversation.messages.length - 1].timestamp : 0;
      const hoursSinceLastMessage = (Date.now() - lastMessageTime) / (1000 * 60 * 60);
      const isNewConversationCycle = hoursSinceLastMessage > 72; // 3 days = new conversation cycle

      // Add message to conversation
      conversation.messages.push({
        ...message,
        timestamp: message.timestamp || Date.now()
      });

      // Limit conversation history to last 100 messages (increased from 50)
      if (conversation.messages.length > 100) {
        conversation.messages = conversation.messages.slice(-100);
      }

      // Update or insert conversation
      const result = await db.run(
        `INSERT OR REPLACE INTO conversations (phone, messages, last_activity, created_at, updated_at) 
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          phone,
          JSON.stringify(conversation.messages),
          new Date().toISOString(),
          conversation.createdAt
        ]
      );

      // Handle followup scheduling when user responds
      if (message.role === 'user' && wasInactive) {
        // Check if user is responding to a followup
        await this.handleFollowupResponse(phone);
      }

      // Reset follow-up stops if this is a new conversation cycle
      if (message.role === 'user' && isNewConversationCycle) {
        await this.resetFollowupStops(phone);
      }

      return result;
    } catch (error) {
      console.error('Error adding message to conversation:', error);
      throw error;
    }
  }

  async handleFollowupResponse(phone) {
    try {
      // Mark any pending followup as receiving a response
      const result = await db.run(`
        UPDATE followup_history 
        SET response_received = 1, response_at = datetime('now')
        WHERE phone = ? AND response_received = 0
        AND sent_at > datetime('now', '-48 hours')
      `, [phone]);

      console.log(`📬 Marked followup response received for ${phone}`);

      // If there was a followup that received a response, analyze if should continue
      if (result.changes > 0) {
        await this.analyzeFollowupContinuation(phone);
      }
    } catch (error) {
      console.error('Error handling followup response:', error);
    }
  }

  async analyzeFollowupContinuation(phone) {
    try {
      // Get the conversation to analyze the response
      const conversation = await this.getConversation(phone);
      if (!conversation || conversation.messages.length < 2) {
        return;
      }

      // Get the last few messages to understand the response context
      const recentMessages = conversation.messages.slice(-5);
      const lastUserMessage = recentMessages.filter(msg => msg.role === 'user').slice(-1)[0];
      
      if (!lastUserMessage) return;

      // Import AI service and followup service
      const aiService = await import('./aiService.js');
      const followupService = await import('./followupService.js');
      
      const settings = await followupService.default.getSettings();
      if (!settings?.enabled) return;

      // Prepare analysis prompt to determine if should continue follow-ups
      const analysisPrompt = `
ANÁLISE DE RESPOSTA AO FOLLOW-UP:

CONTEXTO DA CONVERSA RECENTE:
${recentMessages.map(msg => {
  const role = msg.role === 'user' ? 'Cliente' : 'Assistente';
  return `${role}: ${msg.content}`;
}).join('\n')}

ÚLTIMA RESPOSTA DO CLIENTE: "${lastUserMessage.content}"

CRITÉRIOS PARA PARAR FOLLOW-UPS (responda "PARAR_FOLLOWUPS"):
- Cliente demonstrou desinteresse claro
- Cliente pediu para não ser mais contatado
- Cliente disse que já resolveu/comprou em outro lugar
- Cliente demonstrou irritação ou desconforto
- Cliente deu uma resposta definitiva de "não"
- Conversa foi finalizada de forma satisfatória
- Cliente disse que vai entrar em contato quando precisar

CRITÉRIOS PARA CONTINUAR FOLLOW-UPS (responda "CONTINUAR_FOLLOWUPS"):
- Cliente mostrou interesse mas não pode no momento
- Cliente fez uma pergunta que indica interesse continuado
- Cliente disse "talvez mais tarde" ou similar
- Conversa terminou sem conclusão clara
- Cliente pediu mais tempo para decidir

INSTRUÇÕES:
Analise APENAS a última resposta do cliente ao follow-up.
Responda APENAS com "PARAR_FOLLOWUPS" ou "CONTINUAR_FOLLOWUPS".
Não adicione explicações.
`;

      const decision = await aiService.default.evaluateCondition(analysisPrompt);
      
      console.log(`🤔 Follow-up continuation analysis for ${phone}: ${decision}`);

      if (decision && decision.toUpperCase().includes('PARAR_FOLLOWUPS')) {
        // Mark this conversation as "do not follow up anymore"
        await this.markNoMoreFollowups(phone, 'client_response_indicates_stop');
        console.log(`🛑 Follow-ups stopped for ${phone} based on client response analysis`);
      } else {
        console.log(`✅ Follow-ups may continue for ${phone} in the future`);
      }

    } catch (error) {
      console.error('Error analyzing followup continuation:', error);
    }
  }

  async markNoMoreFollowups(phone, reason) {
    try {
      // Cancel any pending follow-ups
      await db.run(`
        UPDATE followup_queue 
        SET status = 'cancelled', analysis_result = ?
        WHERE phone = ? AND status IN ('pending', 'scheduled_for_analysis', 'scheduled_for_send')
      `, [reason, phone]);

      // Add a marker to prevent new follow-ups until next conversation cycle
      await db.run(`
        INSERT INTO followup_history (phone, message_sent, sent_at, followup_type, success)
        VALUES (?, ?, datetime('now'), 'stop_marker', 1)
      `, [phone, `[SYSTEM] Follow-ups stopped: ${reason}`]);

      console.log(`🚫 No more follow-ups marker set for ${phone}: ${reason}`);
    } catch (error) {
      console.error('Error marking no more followups:', error);
    }
  }

  async resetFollowupStops(phone) {
    try {
      // Remove stop markers as this is considered a new conversation cycle
      const result = await db.run(`
        DELETE FROM followup_history 
        WHERE phone = ? AND followup_type = 'stop_marker'
      `, [phone]);

      if (result.changes > 0) {
        console.log(`🔄 Reset follow-up stops for ${phone} - new conversation cycle detected`);
      }
    } catch (error) {
      console.error('Error resetting followup stops:', error);
    }
  }

  async addMessages(phone, messages) {
    try {
      for (const message of messages) {
        await this.addMessage(phone, message);
      }
    } catch (error) {
      console.error('Error adding messages to conversation:', error);
      throw error;
    }
  }

  async clearExpiredConversations() {
    try {
      const cutoffTime = new Date(Date.now() - this.memoryTimeout).toISOString();
      
      const result = await db.run(
        `DELETE FROM conversations WHERE last_activity < ?`,
        [cutoffTime]
      );

      if (result.changes > 0) {
        console.log(`🗑️ Cleared ${result.changes} expired conversations`);
      }
    } catch (error) {
      console.error('Error clearing expired conversations:', error);
    }
  }

  async clearConversation(phone) {
    try {
      await db.run(`DELETE FROM conversations WHERE phone = ?`, [phone]);
      console.log(`🗑️ Cleared conversation for ${phone}`);
    } catch (error) {
      console.error('Error clearing conversation:', error);
      throw error;
    }
  }

  async getAllConversations() {
    try {
      const conversations = await db.all(
        `SELECT phone, last_activity, created_at, 
         (SELECT COUNT(*) FROM json_each(messages)) as message_count 
         FROM conversations 
         ORDER BY last_activity DESC`
      );

      return conversations.map(conv => ({
        phone: conv.phone,
        lastActivity: conv.last_activity,
        createdAt: conv.created_at,
        messageCount: conv.message_count || 0
      }));
    } catch (error) {
      console.error('Error getting all conversations:', error);
      return [];
    }
  }

  async getConversationStats() {
    try {
      const stats = await db.get(`
        SELECT 
          COUNT(*) as total_conversations,
          COUNT(CASE WHEN last_activity > datetime('now', '-1 day') THEN 1 END) as active_today,
          COUNT(CASE WHEN last_activity > datetime('now', '-1 hour') THEN 1 END) as active_hour
        FROM conversations
      `);

      return {
        totalConversations: stats.total_conversations || 0,
        activeToday: stats.active_today || 0,
        activeThisHour: stats.active_hour || 0
      };
    } catch (error) {
      console.error('Error getting conversation stats:', error);
      return {
        totalConversations: 0,
        activeToday: 0,
        activeThisHour: 0
      };
    }
  }

  // Start periodic cleanup
  startPeriodicCleanup() {
    // Clean expired conversations every 30 minutes
    setInterval(() => {
      this.clearExpiredConversations();
    }, 1800000); // 30 minutes
  }

  async extractContextFromMessages(messages) {
    // Extract key information from conversation for context
    const recentMessages = messages.slice(-20); // Increased from 10 to 20 messages
    
    const context = {
      messageCount: messages.length,
      recentTopics: [],
      userPreferences: {},
      conversationTone: 'neutral',
      hasGreeted: false, // Track if user was already greeted
      lastInteractionTime: null
    };

    // Check if user was already greeted in recent messages
    const greetingPatterns = /\b(olá|oi|bom dia|boa tarde|boa noite|tudo bem|como vai)\b/i;
    const assistantGreetings = recentMessages
      .filter(msg => msg.role === 'assistant')
      .some(msg => greetingPatterns.test(msg.content || ''));
    
    context.hasGreeted = assistantGreetings;

    // Get last interaction time
    if (messages.length > 0) {
      context.lastInteractionTime = messages[messages.length - 1].timestamp;
    }

    // Simple topic extraction (could be enhanced with NLP)
    const topics = new Set();
    recentMessages.forEach(msg => {
      if (msg.content) {
        const words = msg.content.toLowerCase().split(' ');
        // Extract potential topics (words longer than 4 characters)
        words.filter(word => word.length > 4).forEach(word => {
          topics.add(word);
        });
      }
    });

    context.recentTopics = Array.from(topics).slice(0, 8); // Increased from 5 to 8

    return context;
  }
}

const conversationService = new ConversationService();
conversationService.startPeriodicCleanup();

export default conversationService;