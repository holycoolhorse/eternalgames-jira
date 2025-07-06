const { Pool } = require('pg');
const fs = require('fs');

// For Supabase SSL connection
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

class Database {
  constructor() {
    this.pool = null;
    this.initialized = false;
    this.isPostgreSQL = false;
    this.db = null;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      console.log('🔄 Database initialization starting...');
      console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
      
      // PostgreSQL connection
      if (process.env.DATABASE_URL) {
        console.log('✅ Using PostgreSQL (Supabase)');
        
        // Supabase requires SSL but with self-signed certificates
        this.pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: {
            rejectUnauthorized: false,
            require: true
          },
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000,
        });
        
        this.isPostgreSQL = true;
        
        // Test connection
        const client = await this.pool.connect();
        console.log('✅ Connected to PostgreSQL database');
        client.release();

        // Create tables
        await this.createTables();
        console.log('✅ PostgreSQL tables created/verified');
      } else {
        console.log('⚠️ DATABASE_URL not found, using SQLite fallback');
        // Fallback to SQLite for local development
        const sqlite3 = require('sqlite3').verbose();
        const path = require('path');
        
        const dbPath = path.join(__dirname, '..', 'database.sqlite');
        this.db = new sqlite3.Database(dbPath);
        this.isPostgreSQL = false;
        await this.createSQLiteTables();
        console.log('✅ SQLite tables created/verified');
      }
      
      this.initialized = true;
      console.log('✅ Database initialization complete');
      
    } catch (error) {
      console.error('❌ Database initialization error:', error);
      // Don't throw error - let the application continue
    }
  }

  async createTables() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'Member',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        key VARCHAR(10) NOT NULL,
        owner_id INTEGER REFERENCES users(id),
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS project_members (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id),
        user_id INTEGER REFERENCES users(id),
        role VARCHAR(50) DEFAULT 'Member',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, user_id)
      )`,
      `CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'To Do',
        priority VARCHAR(50) DEFAULT 'Medium',
        project_id INTEGER REFERENCES projects(id),
        assigned_to INTEGER REFERENCES users(id),
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        task_id INTEGER REFERENCES tasks(id),
        user_id INTEGER REFERENCES users(id),
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS password_resets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        token VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    // Additional ALTER TABLE statements for existing tables
    const alterTables = [
      `ALTER TABLE projects ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES users(id)`,
      `ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id)`,
      `ALTER TABLE projects ADD COLUMN IF NOT EXISTS key VARCHAR(10)`,
      `ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255)`
    ];

    const client = await this.pool.connect();
    try {
      // Create tables first
      for (const sql of tables) {
        await client.query(sql);
      }
      
      // Then alter existing tables
      for (const sql of alterTables) {
        try {
          await client.query(sql);
        } catch (error) {
          // Ignore errors for columns that already exist
          if (!error.message.includes('already exists')) {
            console.error('ALTER TABLE error:', error.message);
          }
        }
      }
      
      // Update existing users to have name field equal to username
      try {
        await client.query(`UPDATE users SET name = username WHERE name IS NULL`);
      } catch (error) {
        console.error('Update users name error:', error.message);
      }
      
      console.log('PostgreSQL tables created/updated successfully');
    } catch (error) {
      console.error('Failed to create PostgreSQL tables:', error);
    } finally {
      client.release();
    }
  }

  async createSQLiteTables() {
    // SQLite fallback for local development
    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'Member',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`,
      `CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'To Do',
        priority TEXT DEFAULT 'Medium',
        project_id INTEGER,
        assigned_to INTEGER,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id),
        FOREIGN KEY (assigned_to) REFERENCES users (id),
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`,
      `CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER,
        user_id INTEGER,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,
      `CREATE TABLE IF NOT EXISTS password_resets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        token TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`
    ];

    for (const sql of tables) {
      await new Promise((resolve, reject) => {
        this.db.run(sql, (err) => {
          if (err) {
            console.error('SQLite table creation error:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }
  }

  getDb() {
    if (this.isPostgreSQL && this.pool) {
      return this.pool; // PostgreSQL
    }
    return this.db; // SQLite fallback
  }

  async query(text, params = []) {
    // Ensure database is initialized
    if (!this.initialized) {
      await this.initialize();
    }
    
    if (this.isPostgreSQL && this.pool) {
      // PostgreSQL
      const client = await this.pool.connect();
      try {
        const result = await client.query(text, params);
        return result;
      } finally {
        client.release();
      }
    } else if (this.db) {
      // SQLite fallback
      return new Promise((resolve, reject) => {
        this.db.all(text, params, (err, rows) => {
          if (err) reject(err);
          else resolve({ rows });
        });
      });
    } else {
      throw new Error('Database not initialized');
    }
  }

  async get(text, params = []) {
    const result = await this.query(text, params);
    return result.rows && result.rows.length > 0 ? result.rows[0] : null;
  }

  async run(text, params = []) {
    const result = await this.query(text, params);
    if (this.isPostgreSQL) {
      return {
        id: result.rows && result.rows.length > 0 ? result.rows[0].id : null,
        changes: result.rowCount || 0
      };
    } else {
      return result;
    }
  }

  async all(text, params = []) {
    const result = await this.query(text, params);
    return result.rows || [];
  }
}

const database = new Database();
module.exports = database;
