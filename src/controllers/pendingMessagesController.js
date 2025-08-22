import express from 'express';
import messageTrackingService from '../services/messageTrackingService.js';
import pendingMessagesService from '../services/pendingMessagesService.js';

const router = express.Router();

// Get pending messages statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await pendingMessagesService.getPendingStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error getting pending stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error getting pending statistics',
      error: error.message 
    });
  }
});

// Get unresponded messages
router.get('/unresponded', async (req, res) => {
  try {
    const olderThanMinutes = parseInt(req.query.olderThan) || 10;
    const unrespended = await messageTrackingService.getUnrespondedMessages(olderThanMinutes);
    
    res.json({ 
      success: true, 
      unrespended,
      count: unrespended.length 
    });
  } catch (error) {
    console.error('Error getting unresponded messages:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error getting unresponded messages',
      error: error.message 
    });
  }
});

// Get conversation tracking context
router.get('/conversation/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    
    const context = await messageTrackingService.getConversationContext(phone, limit);
    res.json({ success: true, context });
  } catch (error) {
    console.error('Error getting conversation context:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error getting conversation context',
      error: error.message 
    });
  }
});

// Process pending messages manually
router.post('/process', async (req, res) => {
  try {
    // Trigger manual processing of pending messages
    await pendingMessagesService.processPendingMessagesOnConnection();
    
    res.json({ 
      success: true, 
      message: 'Pending messages processing started' 
    });
  } catch (error) {
    console.error('Error processing pending messages:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error processing pending messages',
      error: error.message 
    });
  }
});

// Mark conversation as manually handled
router.post('/mark-handled/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    await pendingMessagesService.markAllAsRead(phone);
    
    res.json({ 
      success: true, 
      message: `Marked all messages for ${phone} as handled` 
    });
  } catch (error) {
    console.error('Error marking conversation as handled:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error marking conversation as handled',
      error: error.message 
    });
  }
});

// Check if phone should receive response
router.get('/should-respond/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    const shouldRespond = await messageTrackingService.shouldRespondToPhone(phone);
    const hasRecent = await messageTrackingService.hasRecentResponse(phone, 30);
    
    res.json({ 
      success: true, 
      shouldRespond,
      hasRecentResponse: hasRecent 
    });
  } catch (error) {
    console.error('Error checking if should respond:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error checking response status',
      error: error.message 
    });
  }
});

// Get message tracking statistics
router.get('/tracking-stats', async (req, res) => {
  try {
    const stats = await messageTrackingService.getStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error getting tracking stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error getting tracking statistics',
      error: error.message 
    });
  }
});

// Cleanup old tracking records
router.delete('/cleanup/:days', async (req, res) => {
  try {
    const days = parseInt(req.params.days) || 7;
    await messageTrackingService.cleanupOldTracking(days);
    
    res.json({ 
      success: true, 
      message: `Cleaned up tracking records older than ${days} days` 
    });
  } catch (error) {
    console.error('Error cleaning up tracking records:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error cleaning up tracking records',
      error: error.message 
    });
  }
});

export default router;