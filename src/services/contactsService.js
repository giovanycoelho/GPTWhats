import db from '../config/database.js';
import { formatPhoneNumber } from '../utils/textUtils.js';

class ContactsService {
  async updateContact(phone, data) {
    try {
      const formattedPhone = this.cleanPhoneNumber(phone);
      const displayPhone = formatPhoneNumber(phone);
      
      const existingContact = await db.get(
        `SELECT id, message_count FROM contacts WHERE phone = ?`,
        [formattedPhone]
      );

      if (existingContact) {
        // Update existing contact
        await db.run(
          `UPDATE contacts 
           SET name = COALESCE(?, name),
               profile_pic = COALESCE(?, profile_pic),
               last_message_at = COALESCE(?, last_message_at),
               message_count = message_count + 1,
               updated_at = CURRENT_TIMESTAMP
           WHERE phone = ?`,
          [
            data.name,
            data.profilePic,
            data.lastMessageAt,
            formattedPhone
          ]
        );
      } else {
        // Create new contact
        await db.run(
          `INSERT INTO contacts (phone, name, profile_pic, last_message_at, message_count) 
           VALUES (?, ?, ?, ?, 1)`,
          [
            formattedPhone,
            data.name || displayPhone,
            data.profilePic || null,
            data.lastMessageAt || new Date().toISOString()
          ]
        );
      }

      return true;
    } catch (error) {
      console.error('Error updating contact:', error);
      return false;
    }
  }

  async getContact(phone) {
    try {
      const formattedPhone = this.cleanPhoneNumber(phone);
      const contact = await db.get(
        `SELECT * FROM contacts WHERE phone = ?`,
        [formattedPhone]
      );

      if (contact) {
        return {
          id: contact.id,
          phone: contact.phone,
          name: contact.name,
          profilePic: contact.profile_pic,
          lastMessageAt: contact.last_message_at,
          messageCount: contact.message_count,
          createdAt: contact.created_at,
          updatedAt: contact.updated_at
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting contact:', error);
      return null;
    }
  }

  async getAllContacts(page = 1, limit = 50, search = '') {
    try {
      const offset = (page - 1) * limit;
      let query = `SELECT * FROM contacts`;
      let countQuery = `SELECT COUNT(*) as total FROM contacts`;
      const params = [];

      if (search) {
        query += ` WHERE name LIKE ? OR phone LIKE ?`;
        countQuery += ` WHERE name LIKE ? OR phone LIKE ?`;
        params.push(`%${search}%`, `%${search}%`);
      }

      query += ` ORDER BY last_message_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const contacts = await db.all(query, params);
      const countResult = await db.get(countQuery, search ? [`%${search}%`, `%${search}%`] : []);

      return {
        contacts: contacts.map(contact => ({
          id: contact.id,
          phone: contact.phone,
          name: contact.name,
          profilePic: contact.profile_pic,
          lastMessageAt: contact.last_message_at,
          messageCount: contact.message_count,
          createdAt: contact.created_at,
          updatedAt: contact.updated_at
        })),
        total: countResult.total,
        page,
        limit,
        totalPages: Math.ceil(countResult.total / limit)
      };
    } catch (error) {
      console.error('Error getting all contacts:', error);
      return {
        contacts: [],
        total: 0,
        page: 1,
        limit,
        totalPages: 0
      };
    }
  }

  async deleteContact(phone) {
    try {
      const formattedPhone = this.cleanPhoneNumber(phone);
      const result = await db.run(
        `DELETE FROM contacts WHERE phone = ?`,
        [formattedPhone]
      );

      return result.changes > 0;
    } catch (error) {
      console.error('Error deleting contact:', error);
      return false;
    }
  }

  async getContactStats() {
    try {
      const stats = await db.get(`
        SELECT 
          COUNT(*) as total_contacts,
          COUNT(CASE WHEN last_message_at > datetime('now', '-1 day') THEN 1 END) as active_today,
          COUNT(CASE WHEN last_message_at > datetime('now', '-7 days') THEN 1 END) as active_week,
          AVG(message_count) as avg_messages_per_contact
        FROM contacts
      `);

      return {
        totalContacts: stats.total_contacts || 0,
        activeToday: stats.active_today || 0,
        activeThisWeek: stats.active_week || 0,
        avgMessagesPerContact: Math.round(stats.avg_messages_per_contact || 0)
      };
    } catch (error) {
      console.error('Error getting contact stats:', error);
      return {
        totalContacts: 0,
        activeToday: 0,
        activeThisWeek: 0,
        avgMessagesPerContact: 0
      };
    }
  }

  async getTopContacts(limit = 10) {
    try {
      const contacts = await db.all(`
        SELECT phone, name, message_count, last_message_at
        FROM contacts 
        ORDER BY message_count DESC 
        LIMIT ?
      `, [limit]);

      return contacts.map(contact => ({
        phone: contact.phone,
        name: contact.name,
        messageCount: contact.message_count,
        lastMessageAt: contact.last_message_at
      }));
    } catch (error) {
      console.error('Error getting top contacts:', error);
      return [];
    }
  }

  async updateProfilePicture(phone, profilePicUrl) {
    try {
      const formattedPhone = this.cleanPhoneNumber(phone);
      await db.run(
        `UPDATE contacts SET profile_pic = ?, updated_at = CURRENT_TIMESTAMP WHERE phone = ?`,
        [profilePicUrl, formattedPhone]
      );
      return true;
    } catch (error) {
      console.error('Error updating profile picture:', error);
      return false;
    }
  }

  async markAsBlocked(phone) {
    try {
      const formattedPhone = this.cleanPhoneNumber(phone);
      await db.run(
        `UPDATE contacts SET blocked = 1, updated_at = CURRENT_TIMESTAMP WHERE phone = ?`,
        [formattedPhone]
      );
      return true;
    } catch (error) {
      console.error('Error marking contact as blocked:', error);
      return false;
    }
  }

  cleanPhoneNumber(phone) {
    // Remove WhatsApp suffixes and clean phone number
    return phone
      .replace(/@s\.whatsapp\.net$/, '')
      .replace(/@g\.us$/, '')
      .replace(/[^\d+]/g, '');
  }

  formatContactName(phone, pushName) {
    if (pushName && pushName.trim()) {
      return pushName.trim();
    }
    
    return formatPhoneNumber(phone);
  }
}

export default new ContactsService();