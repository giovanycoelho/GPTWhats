import db from '../config/database.js';

class ConversationService {
  constructor() {
    this.memoryTimeout = 3600000; // 1 hour in milliseconds
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
      
      if (!conversation) {
        // Create new conversation
        conversation = {
          phone,
          messages: [],
          lastActivity: new Date().toISOString(),
          createdAt: new Date().toISOString()
        };
      }

      // Add message to conversation
      conversation.messages.push({
        ...message,
        timestamp: message.timestamp || Date.now()
      });

      // Limit conversation history to last 50 messages
      if (conversation.messages.length > 50) {
        conversation.messages = conversation.messages.slice(-50);
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

      return result;
    } catch (error) {
      console.error('Error adding message to conversation:', error);
      throw error;
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
    const recentMessages = messages.slice(-10); // Last 10 messages
    
    const context = {
      messageCount: messages.length,
      recentTopics: [],
      userPreferences: {},
      conversationTone: 'neutral'
    };

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

    context.recentTopics = Array.from(topics).slice(0, 5);

    return context;
  }
}

const conversationService = new ConversationService();
conversationService.startPeriodicCleanup();

export default conversationService;