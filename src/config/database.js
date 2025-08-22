import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';

const dbPath = process.env.DB_PATH || './database.sqlite';

class Database {
  constructor() {
    this.db = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
        } else {
          console.log('✅ Database connected successfully');
          resolve();
        }
      });
    });
  }

  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

const db = new Database();

export const initializeDatabase = async () => {
  await db.connect();
  
  // Create tables
  const tables = [
    // Configuration table
    `CREATE TABLE IF NOT EXISTS config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Contacts table
    `CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT UNIQUE NOT NULL,
      name TEXT,
      profile_pic TEXT,
      last_message_at DATETIME,
      message_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Conversations table
    `CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      messages TEXT, -- JSON string of messages
      last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Dashboard metrics table
    `CREATE TABLE IF NOT EXISTS metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date DATE NOT NULL,
      messages_sent INTEGER DEFAULT 0,
      messages_received INTEGER DEFAULT 0,
      conversations_started INTEGER DEFAULT 0,
      online_time INTEGER DEFAULT 0, -- in seconds
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Message queue table for delayed processing
    `CREATE TABLE IF NOT EXISTS message_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      message_data TEXT, -- JSON string
      process_at DATETIME NOT NULL,
      processed BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // External notifications settings
    `CREATE TABLE IF NOT EXISTS external_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      enabled BOOLEAN DEFAULT FALSE,
      whatsapp_links_enabled BOOLEAN DEFAULT FALSE,
      custom_rules_enabled BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Custom notification rules
    `CREATE TABLE IF NOT EXISTS notification_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      trigger_prompt TEXT NOT NULL,
      target_phone TEXT NOT NULL,
      enabled BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Notification logs
    `CREATE TABLE IF NOT EXISTS notification_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL, -- 'whatsapp_link' or 'custom_rule'
      source_phone TEXT NOT NULL,
      target_phone TEXT NOT NULL,
      rule_id INTEGER,
      content TEXT,
      sent BOOLEAN DEFAULT FALSE,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (rule_id) REFERENCES notification_rules (id)
    )`
  ];

  for (const tableSQL of tables) {
    try {
      await db.run(tableSQL);
    } catch (error) {
      console.error('Error creating table:', error);
    }
  }

  // Insert default configurations
  const defaultConfigs = [
    { key: 'openai_api_key', value: '' },
    { key: 'system_prompt', value: 'Você é um assistente útil e amigável. Responda de forma natural e humana, mantendo conversas fluidas e contextualizadas.' },
    { key: 'response_delay', value: '10000' },
    { key: 'audio_enabled', value: 'false' },
    { key: 'emoji_enabled', value: 'true' },
    { key: 'call_rejection_enabled', value: 'true' },
    { key: 'call_rejection_message', value: 'Desculpe, não posso atender chamadas no momento. Por favor, envie uma mensagem de texto.' },
    { key: 'max_response_length', value: '200' },
    { key: 'reasoning_effort', value: 'minimal' },
    { key: 'whatsapp_connected', value: 'false' }
  ];

  for (const config of defaultConfigs) {
    try {
      await db.run(
        `INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)`,
        [config.key, config.value]
      );
    } catch (error) {
      console.error('Error inserting default config:', error);
    }
  }

  // Initialize external notifications settings
  try {
    await db.run(
      `INSERT OR IGNORE INTO external_notifications (id, enabled, whatsapp_links_enabled, custom_rules_enabled) 
       VALUES (1, FALSE, FALSE, FALSE)`
    );
  } catch (error) {
    console.error('Error initializing external notifications:', error);
  }

  console.log('✅ Database initialized successfully');
};

export default db;