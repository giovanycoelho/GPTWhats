import db from '../config/database.js';

class ConfigService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 300000; // 5 minutes
  }

  async get(key) {
    try {
      // Check cache first
      const cached = this.cache.get(key);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.value;
      }

      // Get from database
      const result = await db.get(
        `SELECT value FROM config WHERE key = ?`,
        [key]
      );

      const value = result?.value || null;
      
      // Update cache
      this.cache.set(key, {
        value,
        timestamp: Date.now()
      });

      return value;
    } catch (error) {
      console.error('Error getting config:', error);
      return null;
    }
  }

  async set(key, value) {
    try {
      await db.run(
        `INSERT OR REPLACE INTO config (key, value, updated_at) 
         VALUES (?, ?, CURRENT_TIMESTAMP)`,
        [key, value]
      );

      // Update cache
      this.cache.set(key, {
        value,
        timestamp: Date.now()
      });

      return true;
    } catch (error) {
      console.error('Error setting config:', error);
      return false;
    }
  }

  async getAll() {
    try {
      const configs = await db.all(`SELECT key, value FROM config`);
      const result = {};
      
      configs.forEach(config => {
        result[config.key] = config.value;
      });

      return result;
    } catch (error) {
      console.error('Error getting all configs:', error);
      return {};
    }
  }

  async setMultiple(configs) {
    try {
      for (const [key, value] of Object.entries(configs)) {
        await this.set(key, value);
      }
      return true;
    } catch (error) {
      console.error('Error setting multiple configs:', error);
      return false;
    }
  }

  clearCache() {
    this.cache.clear();
  }

  async delete(key) {
    try {
      await db.run(`DELETE FROM config WHERE key = ?`, [key]);
      this.cache.delete(key);
      return true;
    } catch (error) {
      console.error('Error deleting config:', error);
      return false;
    }
  }
}

export default new ConfigService();