import express from 'express';
import db from '../config/database.js';
import contactsService from '../services/contactsService.js';
import conversationService from '../services/conversationService.js';

const router = express.Router();

// Get dashboard overview
router.get('/overview', async (req, res) => {
  try {
    const [contactStats, conversationStats, messageStats] = await Promise.all([
      contactsService.getContactStats(),
      conversationService.getConversationStats(),
      getMessageStats()
    ]);

    const overview = {
      contacts: contactStats,
      conversations: conversationStats,
      messages: messageStats,
      updatedAt: new Date().toISOString()
    };

    res.json({ success: true, overview });
  } catch (error) {
    console.error('Error getting dashboard overview:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error getting dashboard overview',
      error: error.message 
    });
  }
});

// Get message statistics
router.get('/messages/stats', async (req, res) => {
  try {
    const period = req.query.period || 'week'; // day, week, month, year
    const messageStats = await getMessageStatsByPeriod(period);
    
    res.json({ success: true, stats: messageStats });
  } catch (error) {
    console.error('Error getting message stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error getting message stats',
      error: error.message 
    });
  }
});

// Get activity chart data
router.get('/activity/chart', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const chartData = await getActivityChartData(days);
    
    res.json({ success: true, chartData });
  } catch (error) {
    console.error('Error getting activity chart data:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error getting activity chart data',
      error: error.message 
    });
  }
});

// Get real-time metrics
router.get('/metrics/realtime', async (req, res) => {
  try {
    const metrics = await getRealTimeMetrics();
    res.json({ success: true, metrics });
  } catch (error) {
    console.error('Error getting real-time metrics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error getting real-time metrics',
      error: error.message 
    });
  }
});

// Update metrics (called by system)
router.post('/metrics/update', async (req, res) => {
  try {
    const { type, value, date } = req.body;
    
    if (!type || value === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Type and value are required' 
      });
    }

    await updateMetric(type, value, date);
    res.json({ success: true, message: 'Metric updated' });
  } catch (error) {
    console.error('Error updating metric:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating metric',
      error: error.message 
    });
  }
});

// Helper functions
async function getMessageStats() {
  try {
    const stats = await db.get(`
      SELECT 
        SUM(messages_sent) as total_sent,
        SUM(messages_received) as total_received,
        SUM(conversations_started) as total_conversations,
        SUM(online_time) as total_online_time,
        COUNT(DISTINCT date) as active_days
      FROM metrics
    `);

    const todayStats = await db.get(`
      SELECT 
        messages_sent,
        messages_received,
        conversations_started,
        online_time
      FROM metrics 
      WHERE date = date('now')
    `);

    return {
      totalSent: stats.total_sent || 0,
      totalReceived: stats.total_received || 0,
      totalConversations: stats.total_conversations || 0,
      totalOnlineTime: stats.total_online_time || 0,
      activeDays: stats.active_days || 0,
      today: {
        sent: todayStats?.messages_sent || 0,
        received: todayStats?.messages_received || 0,
        conversations: todayStats?.conversations_started || 0,
        onlineTime: todayStats?.online_time || 0
      }
    };
  } catch (error) {
    console.error('Error getting message stats:', error);
    return {
      totalSent: 0,
      totalReceived: 0,
      totalConversations: 0,
      totalOnlineTime: 0,
      activeDays: 0,
      today: { sent: 0, received: 0, conversations: 0, onlineTime: 0 }
    };
  }
}

async function getMessageStatsByPeriod(period) {
  let dateFilter = '';
  
  switch (period) {
    case 'day':
      dateFilter = "WHERE date >= date('now', '-1 day')";
      break;
    case 'week':
      dateFilter = "WHERE date >= date('now', '-7 days')";
      break;
    case 'month':
      dateFilter = "WHERE date >= date('now', '-30 days')";
      break;
    case 'year':
      dateFilter = "WHERE date >= date('now', '-365 days')";
      break;
    default:
      dateFilter = "WHERE date >= date('now', '-7 days')";
  }

  try {
    const stats = await db.all(`
      SELECT 
        date,
        messages_sent,
        messages_received,
        conversations_started,
        online_time
      FROM metrics 
      ${dateFilter}
      ORDER BY date ASC
    `);

    return stats.map(stat => ({
      date: stat.date,
      sent: stat.messages_sent || 0,
      received: stat.messages_received || 0,
      conversations: stat.conversations_started || 0,
      onlineTime: stat.online_time || 0
    }));
  } catch (error) {
    console.error('Error getting message stats by period:', error);
    return [];
  }
}

async function getActivityChartData(days) {
  try {
    const stats = await db.all(`
      SELECT 
        date,
        messages_sent + messages_received as total_messages,
        conversations_started,
        online_time
      FROM metrics 
      WHERE date >= date('now', '-${days} days')
      ORDER BY date ASC
    `);

    // Fill missing dates with zeros
    const chartData = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    for (let i = 0; i < days; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateString = currentDate.toISOString().split('T')[0];
      
      const dayStats = stats.find(s => s.date === dateString);
      
      chartData.push({
        date: dateString,
        messages: dayStats?.total_messages || 0,
        conversations: dayStats?.conversations_started || 0,
        onlineTime: dayStats?.online_time || 0
      });
    }

    return chartData;
  } catch (error) {
    console.error('Error getting activity chart data:', error);
    return [];
  }
}

async function getRealTimeMetrics() {
  try {
    const whatsappService = (await import('../services/whatsappService.js')).default;
    const connectionState = whatsappService.getConnectionState();

    const metrics = {
      whatsappStatus: connectionState.state,
      isOnline: connectionState.online,
      lastUpdate: new Date().toISOString(),
      activeConversations: await getActiveConversationsCount(),
      queuedMessages: await getQueuedMessagesCount()
    };

    return metrics;
  } catch (error) {
    console.error('Error getting real-time metrics:', error);
    return {
      whatsappStatus: 'disconnected',
      isOnline: false,
      lastUpdate: new Date().toISOString(),
      activeConversations: 0,
      queuedMessages: 0
    };
  }
}

async function getActiveConversationsCount() {
  try {
    const result = await db.get(`
      SELECT COUNT(*) as count 
      FROM conversations 
      WHERE last_activity > datetime('now', '-1 hour')
    `);
    return result.count || 0;
  } catch (error) {
    return 0;
  }
}

async function getQueuedMessagesCount() {
  try {
    const result = await db.get(`
      SELECT COUNT(*) as count 
      FROM message_queue 
      WHERE processed = FALSE
    `);
    return result.count || 0;
  } catch (error) {
    return 0;
  }
}

async function updateMetric(type, value, date = null) {
  try {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    // Get current day's metrics
    let metrics = await db.get(
      `SELECT * FROM metrics WHERE date = ?`,
      [targetDate]
    );

    if (metrics) {
      // Update existing metrics
      const updateField = getMetricField(type);
      if (updateField) {
        await db.run(
          `UPDATE metrics SET ${updateField} = ${updateField} + ?, updated_at = CURRENT_TIMESTAMP WHERE date = ?`,
          [value, targetDate]
        );
      }
    } else {
      // Create new metrics entry
      const initialValues = {
        messages_sent: 0,
        messages_received: 0,
        conversations_started: 0,
        online_time: 0
      };
      
      const updateField = getMetricField(type);
      if (updateField) {
        initialValues[updateField] = value;
      }

      await db.run(
        `INSERT INTO metrics (date, messages_sent, messages_received, conversations_started, online_time)
         VALUES (?, ?, ?, ?, ?)`,
        [targetDate, initialValues.messages_sent, initialValues.messages_received, 
         initialValues.conversations_started, initialValues.online_time]
      );
    }
  } catch (error) {
    console.error('Error updating metric:', error);
  }
}

function getMetricField(type) {
  const fieldMap = {
    'message_sent': 'messages_sent',
    'message_received': 'messages_received', 
    'conversation_started': 'conversations_started',
    'online_time': 'online_time'
  };
  
  return fieldMap[type] || null;
}

export default router;
export { updateMetric };