import express from 'express';
import smartRecoveryService from '../services/smartRecoveryService.js';

const router = express.Router();

// Get recovery statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await smartRecoveryService.getRecoveryStats();
    const isProcessing = smartRecoveryService.isProcessing;
    
    res.json({
      stats,
      isProcessing,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting recovery stats:', error);
    res.status(500).json({ error: 'Failed to get recovery stats' });
  }
});

// Manually trigger smart recovery (for testing/debugging)
router.post('/trigger', async (req, res) => {
  try {
    if (smartRecoveryService.isProcessing) {
      return res.status(400).json({ 
        error: 'Recovery process already running',
        message: 'Please wait for the current recovery process to complete'
      });
    }

    // Trigger recovery process
    smartRecoveryService.processUnrespondedConversations();
    
    res.json({ 
      success: true,
      message: 'Smart recovery process triggered',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error triggering recovery:', error);
    res.status(500).json({ 
      error: 'Failed to trigger recovery process',
      details: error.message 
    });
  }
});

// Get recovery history/logs
router.get('/history', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const db = (await import('../config/database.js')).default;
    const history = await db.all(`
      SELECT phone, message_sent, sent_at, success
      FROM followup_history 
      WHERE followup_type = 'recovery_attempt'
      ORDER BY sent_at DESC 
      LIMIT ?
    `, [parseInt(limit)]);
    
    res.json(history);
  } catch (error) {
    console.error('Error getting recovery history:', error);
    res.status(500).json({ error: 'Failed to get recovery history' });
  }
});

// Get detailed analysis of conversations needing response
router.get('/analysis', async (req, res) => {
  try {
    // This is a read-only analysis - doesn't trigger actual recovery
    const conversations = await smartRecoveryService.findConversationsNeedingResponse();
    
    const analysis = {
      totalFound: conversations.length,
      byPriority: {
        high: conversations.filter(c => c.priority >= 30).length,
        medium: conversations.filter(c => c.priority >= 15 && c.priority < 30).length,
        low: conversations.filter(c => c.priority < 15).length
      },
      averagePriority: conversations.length > 0 
        ? conversations.reduce((sum, c) => sum + c.priority, 0) / conversations.length 
        : 0,
      conversations: conversations.slice(0, 10).map(c => ({
        phone: c.phone,
        priority: Math.round(c.priority * 10) / 10,
        lastActivity: c.lastActivity,
        messagePreview: (c.lastMessage.content || c.lastMessage.text || '').substring(0, 50),
        messageAge: Math.round((Date.now() - (c.lastMessage.timestamp || 0)) / (1000 * 60 * 60) * 10) / 10 + 'h'
      }))
    };
    
    res.json(analysis);
  } catch (error) {
    console.error('Error getting recovery analysis:', error);
    res.status(500).json({ error: 'Failed to get recovery analysis' });
  }
});

// Configure recovery settings
router.get('/settings', (req, res) => {
  const settings = {
    maxRecoveryAge: smartRecoveryService.maxRecoveryAge / (1000 * 60 * 60), // In hours
    maxBatchSize: smartRecoveryService.maxBatchSize,
    batchDelay: smartRecoveryService.batchDelay / 1000, // In seconds
    enabled: true // Recovery is always enabled when WhatsApp connects
  };
  
  res.json(settings);
});

// Update recovery settings
router.put('/settings', (req, res) => {
  try {
    const { maxRecoveryAge, maxBatchSize, batchDelay } = req.body;
    
    // Validation
    if (maxRecoveryAge && (maxRecoveryAge < 1 || maxRecoveryAge > 48)) {
      return res.status(400).json({ error: 'maxRecoveryAge must be between 1 and 48 hours' });
    }
    
    if (maxBatchSize && (maxBatchSize < 1 || maxBatchSize > 10)) {
      return res.status(400).json({ error: 'maxBatchSize must be between 1 and 10' });
    }
    
    if (batchDelay && (batchDelay < 10 || batchDelay > 300)) {
      return res.status(400).json({ error: 'batchDelay must be between 10 and 300 seconds' });
    }
    
    // Update settings
    if (maxRecoveryAge) smartRecoveryService.maxRecoveryAge = maxRecoveryAge * 60 * 60 * 1000;
    if (maxBatchSize) smartRecoveryService.maxBatchSize = maxBatchSize;
    if (batchDelay) smartRecoveryService.batchDelay = batchDelay * 1000;
    
    res.json({ 
      success: true,
      message: 'Recovery settings updated',
      newSettings: {
        maxRecoveryAge: smartRecoveryService.maxRecoveryAge / (1000 * 60 * 60),
        maxBatchSize: smartRecoveryService.maxBatchSize,
        batchDelay: smartRecoveryService.batchDelay / 1000
      }
    });
  } catch (error) {
    console.error('Error updating recovery settings:', error);
    res.status(500).json({ error: 'Failed to update recovery settings' });
  }
});

export default router;