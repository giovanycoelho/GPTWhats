import db from '../config/database.js';

// Get external notifications settings
export async function getSettings(req, res) {
  try {
    const settings = await db.get(
      `SELECT * FROM external_notifications WHERE id = 1`
    );
    
    res.json({
      success: true,
      settings: settings || {
        enabled: false,
        whatsapp_links_enabled: false,
        custom_rules_enabled: false
      }
    });
  } catch (error) {
    console.error('Error getting external notifications settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting settings',
      error: error.message
    });
  }
}

// Update external notifications settings
export async function updateSettings(req, res) {
  try {
    const { enabled, whatsapp_links_enabled, custom_rules_enabled } = req.body;
    
    await db.run(
      `INSERT OR REPLACE INTO external_notifications (id, enabled, whatsapp_links_enabled, custom_rules_enabled, updated_at) 
       VALUES (1, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [enabled, whatsapp_links_enabled, custom_rules_enabled]
    );
    
    res.json({
      success: true,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating external notifications settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating settings',
      error: error.message
    });
  }
}

// Get all notification rules
export async function getRules(req, res) {
  try {
    const rules = await db.all(
      `SELECT * FROM notification_rules ORDER BY created_at DESC`
    );
    
    res.json({
      success: true,
      rules
    });
  } catch (error) {
    console.error('Error getting notification rules:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting rules',
      error: error.message
    });
  }
}

// Create notification rule
export async function createRule(req, res) {
  try {
    const { name, description, trigger_prompt, target_phone } = req.body;
    
    if (!name || !trigger_prompt || !target_phone) {
      return res.status(400).json({
        success: false,
        message: 'Name, trigger_prompt and target_phone are required'
      });
    }
    
    const result = await db.run(
      `INSERT INTO notification_rules (name, description, trigger_prompt, target_phone) 
       VALUES (?, ?, ?, ?)`,
      [name, description, trigger_prompt, target_phone]
    );
    
    res.json({
      success: true,
      message: 'Rule created successfully',
      id: result.lastID
    });
  } catch (error) {
    console.error('Error creating notification rule:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating rule',
      error: error.message
    });
  }
}

// Update notification rule
export async function updateRule(req, res) {
  try {
    const { id } = req.params;
    const { name, description, trigger_prompt, target_phone } = req.body;
    
    await db.run(
      `UPDATE notification_rules 
       SET name = ?, description = ?, trigger_prompt = ?, target_phone = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [name, description, trigger_prompt, target_phone, id]
    );
    
    res.json({
      success: true,
      message: 'Rule updated successfully'
    });
  } catch (error) {
    console.error('Error updating notification rule:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating rule',
      error: error.message
    });
  }
}

// Delete notification rule
export async function deleteRule(req, res) {
  try {
    const { id } = req.params;
    
    await db.run(`DELETE FROM notification_rules WHERE id = ?`, [id]);
    
    res.json({
      success: true,
      message: 'Rule deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification rule:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting rule',
      error: error.message
    });
  }
}

// Toggle rule enabled status
export async function toggleRule(req, res) {
  try {
    const { id } = req.params;
    const { enabled } = req.body;
    
    await db.run(
      `UPDATE notification_rules SET enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [enabled, id]
    );
    
    res.json({
      success: true,
      message: `Rule ${enabled ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error) {
    console.error('Error toggling notification rule:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling rule',
      error: error.message
    });
  }
}

// Get notification logs
export async function getLogs(req, res) {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    const logs = await db.all(
      `SELECT nl.*, nr.name as rule_name 
       FROM notification_logs nl 
       LEFT JOIN notification_rules nr ON nl.rule_id = nr.id 
       ORDER BY nl.created_at DESC 
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    
    const countResult = await db.get(
      `SELECT COUNT(*) as total FROM notification_logs`
    );
    
    res.json({
      success: true,
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting notification logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting logs',
      error: error.message
    });
  }
}