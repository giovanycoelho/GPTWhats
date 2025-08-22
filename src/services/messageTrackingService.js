import db from '../config/database.js';

class MessageTrackingService {
  constructor() {
    this.pendingCheckInterval = 300000; // 5 minutes
    this.maxResponseTime = 1800000; // 30 minutes
  }

  async initializeDatabase() {
    try {
      // Create message tracking table
      await db.run(`
        CREATE TABLE IF NOT EXISTS message_tracking (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          phone TEXT NOT NULL,
          message_id TEXT UNIQUE,
          message_content TEXT,
          message_timestamp DATETIME,
          our_response_sent BOOLEAN DEFAULT FALSE,
          ai_response_sent BOOLEAN DEFAULT FALSE,
          manual_response_sent BOOLEAN DEFAULT FALSE,
          response_timestamp DATETIME,
          needs_response BOOLEAN DEFAULT TRUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await db.run(`
        CREATE INDEX IF NOT EXISTS idx_message_tracking_phone 
        ON message_tracking(phone)
      `);

      await db.run(`
        CREATE INDEX IF NOT EXISTS idx_message_tracking_needs_response 
        ON message_tracking(needs_response, message_timestamp)
      `);

      console.log('✅ Message tracking database initialized');
    } catch (error) {
      console.error('Error initializing message tracking database:', error);
    }
  }

  async trackIncomingMessage(phone, messageId, content, timestamp) {
    try {
      // Check if message already tracked
      const existing = await db.get(
        'SELECT id FROM message_tracking WHERE message_id = ?',
        [messageId]
      );

      if (existing) {
        return false; // Already tracked
      }

      // Insert new message tracking
      await db.run(`
        INSERT INTO message_tracking 
        (phone, message_id, message_content, message_timestamp, needs_response)
        VALUES (?, ?, ?, ?, ?)
      `, [phone, messageId, content, new Date(timestamp).toISOString(), true]);

      console.log(`📋 Tracking new message from ${phone}: ${messageId}`);
      return true;
    } catch (error) {
      console.error('Error tracking incoming message:', error);
      return false;
    }
  }

  async markResponseSent(phone, messageId, responseType = 'ai') {
    try {
      const updateField = responseType === 'manual' ? 'manual_response_sent' : 'ai_response_sent';
      
      await db.run(`
        UPDATE message_tracking 
        SET ${updateField} = TRUE,
            our_response_sent = TRUE,
            needs_response = FALSE,
            response_timestamp = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE phone = ? AND message_id = ?
      `, [phone, messageId]);

      console.log(`✅ Marked response sent for ${phone}: ${messageId} (${responseType})`);
    } catch (error) {
      console.error('Error marking response sent:', error);
    }
  }

  async markConversationResponded(phone, sinceTimestamp) {
    try {
      // Mark all messages in this conversation as responded (manual response detected)
      await db.run(`
        UPDATE message_tracking 
        SET manual_response_sent = TRUE,
            our_response_sent = TRUE,
            needs_response = FALSE,
            response_timestamp = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE phone = ? 
        AND message_timestamp >= ?
        AND needs_response = TRUE
      `, [phone, new Date(sinceTimestamp).toISOString()]);

      console.log(`✅ Marked conversation as manually responded: ${phone}`);
    } catch (error) {
      console.error('Error marking conversation as responded:', error);
    }
  }

  async getUnrespondedMessages(olderThanMinutes = 10) {
    try {
      const cutoffTime = new Date(Date.now() - (olderThanMinutes * 60000)).toISOString();
      
      const messages = await db.all(`
        SELECT DISTINCT phone, 
               COUNT(*) as unresponded_count,
               MIN(message_timestamp) as oldest_message,
               MAX(message_timestamp) as latest_message,
               GROUP_CONCAT(message_content, ' | ') as recent_messages
        FROM message_tracking 
        WHERE needs_response = TRUE 
        AND our_response_sent = FALSE
        AND message_timestamp < ?
        GROUP BY phone
        ORDER BY oldest_message ASC
      `, [cutoffTime]);

      return messages;
    } catch (error) {
      console.error('Error getting unresponded messages:', error);
      return [];
    }
  }

  async hasRecentResponse(phone, withinMinutes = 30) {
    try {
      const cutoffTime = new Date(Date.now() - (withinMinutes * 60000)).toISOString();
      
      const response = await db.get(`
        SELECT COUNT(*) as count
        FROM message_tracking 
        WHERE phone = ? 
        AND our_response_sent = TRUE
        AND response_timestamp > ?
      `, [phone, cutoffTime]);

      return response.count > 0;
    } catch (error) {
      console.error('Error checking recent response:', error);
      return false;
    }
  }

  async detectManualResponse(phone, ourMessageId) {
    try {
      // When we send a message manually, mark recent unresponded messages as handled
      const recentTime = new Date(Date.now() - 300000).toISOString(); // Last 5 minutes
      
      await this.markConversationResponded(phone, recentTime);
      
      console.log(`🤝 Manual response detected for ${phone}, marking recent messages as handled`);
    } catch (error) {
      console.error('Error detecting manual response:', error);
    }
  }

  async checkPendingMessages() {
    try {
      const unresponded = await this.getUnrespondedMessages(10); // Messages older than 10 minutes
      
      if (unresponded.length > 0) {
        console.log(`📬 Found ${unresponded.length} conversations with unresponded messages`);
        return unresponded;
      }
      
      return [];
    } catch (error) {
      console.error('Error checking pending messages:', error);
      return [];
    }
  }

  async shouldRespondToPhone(phone) {
    try {
      // Check if we've responded recently
      const hasRecent = await this.hasRecentResponse(phone, 30);
      if (hasRecent) {
        console.log(`⏭️ Skipping ${phone} - already responded recently`);
        return false;
      }

      // Check if there are unresponded messages
      const unresponded = await db.get(`
        SELECT COUNT(*) as count
        FROM message_tracking 
        WHERE phone = ? AND needs_response = TRUE AND our_response_sent = FALSE
      `, [phone]);

      return unresponded.count > 0;
    } catch (error) {
      console.error('Error checking if should respond:', error);
      return false;
    }
  }

  async getConversationContext(phone, limit = 10) {
    try {
      const messages = await db.all(`
        SELECT message_content, message_timestamp, our_response_sent
        FROM message_tracking 
        WHERE phone = ?
        ORDER BY message_timestamp DESC
        LIMIT ?
      `, [phone, limit]);

      return messages.reverse(); // Chronological order
    } catch (error) {
      console.error('Error getting conversation context:', error);
      return [];
    }
  }

  async cleanupOldTracking(olderThanDays = 7) {
    try {
      const cutoffTime = new Date(Date.now() - (olderThanDays * 24 * 60 * 60 * 1000)).toISOString();
      
      const result = await db.run(`
        DELETE FROM message_tracking 
        WHERE message_timestamp < ?
      `, [cutoffTime]);

      if (result.changes > 0) {
        console.log(`🗑️ Cleaned up ${result.changes} old message tracking records`);
      }
    } catch (error) {
      console.error('Error cleaning up old tracking:', error);
    }
  }

  async getStats() {
    try {
      const stats = await db.get(`
        SELECT 
          COUNT(*) as total_messages,
          COUNT(CASE WHEN needs_response = TRUE THEN 1 END) as pending_responses,
          COUNT(CASE WHEN our_response_sent = TRUE THEN 1 END) as responded_messages,
          COUNT(CASE WHEN manual_response_sent = TRUE THEN 1 END) as manual_responses,
          COUNT(CASE WHEN ai_response_sent = TRUE THEN 1 END) as ai_responses
        FROM message_tracking 
        WHERE message_timestamp > datetime('now', '-24 hours')
      `);

      return stats;
    } catch (error) {
      console.error('Error getting tracking stats:', error);
      return null;
    }
  }

  startPeriodicCheck(callback) {
    setInterval(async () => {
      try {
        const pending = await this.checkPendingMessages();
        if (pending.length > 0 && callback) {
          callback(pending);
        }
      } catch (error) {
        console.error('Error in periodic check:', error);
      }
    }, this.pendingCheckInterval);

    console.log(`🔄 Started periodic message check every ${this.pendingCheckInterval / 1000} seconds`);
  }
}

const messageTrackingService = new MessageTrackingService();
export default messageTrackingService;