import express from 'express';
import contactsService from '../services/contactsService.js';

const router = express.Router();

// Get all contacts with pagination and search
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || '';

    const result = await contactsService.getAllContacts(page, limit, search);
    
    res.json({ 
      success: true, 
      ...result
    });
  } catch (error) {
    console.error('Error getting contacts:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error getting contacts',
      error: error.message 
    });
  }
});

// Get specific contact
router.get('/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    const contact = await contactsService.getContact(phone);
    
    if (contact) {
      res.json({ success: true, contact });
    } else {
      res.status(404).json({ 
        success: false, 
        message: 'Contact not found' 
      });
    }
  } catch (error) {
    console.error('Error getting contact:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error getting contact',
      error: error.message 
    });
  }
});

// Update contact
router.put('/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    const updateData = req.body;
    
    const success = await contactsService.updateContact(phone, updateData);
    
    if (success) {
      res.json({ success: true, message: 'Contact updated' });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update contact' 
      });
    }
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating contact',
      error: error.message 
    });
  }
});

// Delete contact
router.delete('/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    const success = await contactsService.deleteContact(phone);
    
    if (success) {
      res.json({ success: true, message: 'Contact deleted' });
    } else {
      res.status(404).json({ 
        success: false, 
        message: 'Contact not found or failed to delete' 
      });
    }
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting contact',
      error: error.message 
    });
  }
});

// Get contact statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await contactsService.getContactStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error getting contact stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error getting contact stats',
      error: error.message 
    });
  }
});

// Get top contacts by message count
router.get('/stats/top', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const topContacts = await contactsService.getTopContacts(limit);
    
    res.json({ success: true, contacts: topContacts });
  } catch (error) {
    console.error('Error getting top contacts:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error getting top contacts',
      error: error.message 
    });
  }
});

// Block contact
router.post('/:phone/block', async (req, res) => {
  try {
    const { phone } = req.params;
    const success = await contactsService.markAsBlocked(phone);
    
    if (success) {
      res.json({ success: true, message: 'Contact blocked' });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to block contact' 
      });
    }
  } catch (error) {
    console.error('Error blocking contact:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error blocking contact',
      error: error.message 
    });
  }
});

// Export contacts
router.get('/export/csv', async (req, res) => {
  try {
    const { contacts } = await contactsService.getAllContacts(1, 10000); // Get all contacts
    
    // Generate CSV
    const csvHeaders = 'Name,Phone,Message Count,Last Message At,Created At\n';
    const csvRows = contacts.map(contact => 
      `"${contact.name}","${contact.phone}","${contact.messageCount}","${contact.lastMessageAt}","${contact.createdAt}"`
    ).join('\n');
    
    const csv = csvHeaders + csvRows;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="contacts.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting contacts:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error exporting contacts',
      error: error.message 
    });
  }
});

export default router;