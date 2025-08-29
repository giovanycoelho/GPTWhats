import express from 'express';
import followupService from '../services/followupService.js';

const router = express.Router();

// Get followup settings
router.get('/settings', async (req, res) => {
  try {
    const settings = await followupService.getSettings();
    res.json(settings);
  } catch (error) {
    console.error('Error getting followup settings:', error);
    res.status(500).json({ error: 'Failed to get followup settings' });
  }
});

// Update followup settings
router.put('/settings', async (req, res) => {
  try {
    const {
      enabled,
      generate_prompt,
      no_generate_prompt,
      inactivity_hours,
      delay_hours,
      max_followups_per_conversation,
      followup_interval_hours
    } = req.body;

    // Validate input
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }

    if (!generate_prompt || typeof generate_prompt !== 'string' || generate_prompt.trim().length < 10) {
      return res.status(400).json({ error: 'generate_prompt must be a non-empty string with at least 10 characters' });
    }

    if (!no_generate_prompt || typeof no_generate_prompt !== 'string' || no_generate_prompt.trim().length < 10) {
      return res.status(400).json({ error: 'no_generate_prompt must be a non-empty string with at least 10 characters' });
    }

    if (!Number.isInteger(inactivity_hours) || inactivity_hours < 1 || inactivity_hours > 168) {
      return res.status(400).json({ error: 'inactivity_hours must be an integer between 1 and 168' });
    }

    if (!Number.isInteger(delay_hours) || delay_hours < 1 || delay_hours > 72) {
      return res.status(400).json({ error: 'delay_hours must be an integer between 1 and 72' });
    }

    if (!Number.isInteger(max_followups_per_conversation) || max_followups_per_conversation < 1 || max_followups_per_conversation > 5) {
      return res.status(400).json({ error: 'max_followups_per_conversation must be an integer between 1 and 5' });
    }

    if (!Number.isInteger(followup_interval_hours) || followup_interval_hours < 24 || followup_interval_hours > 720) {
      return res.status(400).json({ error: 'followup_interval_hours must be an integer between 24 and 720' });
    }

    const success = await followupService.updateSettings({
      enabled,
      generate_prompt: generate_prompt.trim(),
      no_generate_prompt: no_generate_prompt.trim(),
      inactivity_hours,
      delay_hours,
      max_followups_per_conversation,
      followup_interval_hours
    });

    if (success) {
      res.json({ success: true, message: 'Followup settings updated successfully' });
    } else {
      res.status(500).json({ error: 'Failed to update followup settings' });
    }
  } catch (error) {
    console.error('Error updating followup settings:', error);
    res.status(500).json({ error: 'Failed to update followup settings' });
  }
});

// Get followup statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await followupService.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting followup stats:', error);
    res.status(500).json({ error: 'Failed to get followup stats' });
  }
});

// Get followup queue (for debugging/monitoring)
router.get('/queue', async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    
    let query = `SELECT * FROM followup_queue`;
    let params = [];
    
    if (status) {
      query += ` WHERE status = ?`;
      params.push(status);
    }
    
    query += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(parseInt(limit));

    const db = (await import('../config/database.js')).default;
    const queue = await db.all(query, params);
    
    res.json(queue);
  } catch (error) {
    console.error('Error getting followup queue:', error);
    res.status(500).json({ error: 'Failed to get followup queue' });
  }
});

// Get followup history
router.get('/history', async (req, res) => {
  try {
    const { phone, limit = 20 } = req.query;
    
    let query = `SELECT * FROM followup_history`;
    let params = [];
    
    if (phone) {
      query += ` WHERE phone = ?`;
      params.push(phone);
    }
    
    query += ` ORDER BY sent_at DESC LIMIT ?`;
    params.push(parseInt(limit));

    const db = (await import('../config/database.js')).default;
    const history = await db.all(query, params);
    
    res.json(history);
  } catch (error) {
    console.error('Error getting followup history:', error);
    res.status(500).json({ error: 'Failed to get followup history' });
  }
});

// Manual trigger followup analysis for a phone (for testing)
router.post('/analyze/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    
    if (!phone || !phone.includes('@')) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    await followupService.scheduleFollowupAnalysis(phone);
    
    res.json({ 
      success: true, 
      message: `Followup analysis scheduled for ${phone}` 
    });
  } catch (error) {
    console.error('Error triggering followup analysis:', error);
    res.status(500).json({ error: 'Failed to trigger followup analysis' });
  }
});

// Delete/cancel a pending followup
router.delete('/queue/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const db = (await import('../config/database.js')).default;
    const result = await db.run(`
      DELETE FROM followup_queue 
      WHERE id = ? AND status IN ('pending', 'scheduled_for_analysis', 'scheduled_for_send')
    `, [id]);

    if (result.changes > 0) {
      res.json({ success: true, message: 'Followup cancelled successfully' });
    } else {
      res.status(404).json({ error: 'Followup not found or cannot be cancelled' });
    }
  } catch (error) {
    console.error('Error cancelling followup:', error);
    res.status(500).json({ error: 'Failed to cancel followup' });
  }
});

// Force process followup queue (for debugging)
router.post('/process', async (req, res) => {
  try {
    // Trigger immediate processing
    await followupService.processFollowupQueue();
    
    res.json({ 
      success: true, 
      message: 'Followup queue processing triggered' 
    });
  } catch (error) {
    console.error('Error processing followup queue:', error);
    res.status(500).json({ error: 'Failed to process followup queue' });
  }
});

// Cleanup old followup records
router.post('/cleanup', async (req, res) => {
  try {
    await followupService.cleanup();
    
    res.json({ 
      success: true, 
      message: 'Followup cleanup completed' 
    });
  } catch (error) {
    console.error('Error cleaning up followup records:', error);
    res.status(500).json({ error: 'Failed to cleanup followup records' });
  }
});

export default router;