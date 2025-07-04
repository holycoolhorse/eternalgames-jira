const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Auth routes working!', timestamp: new Date().toISOString() });
});

// Database test route
router.get('/db-test', async (req, res) => {
  try {
    console.log('🔍 DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('🔍 NODE_ENV:', process.env.NODE_ENV);
    
    await db.initialize();
    
    // Create test table
    if (db.isPostgreSQL) {
      await db.query('CREATE TABLE IF NOT EXISTS eternalgames_test (id SERIAL PRIMARY KEY, message TEXT, created_at TIMESTAMP DEFAULT NOW())');
      
      // Insert test data
      const message = 'EternalGames Jira - Supabase Test - ' + new Date().toISOString();
      await db.query('INSERT INTO eternalgames_test (message) VALUES ($1)', [message]);
      
      // Get data
      const result = await db.query('SELECT * FROM eternalgames_test ORDER BY created_at DESC LIMIT 3');
      
      res.json({
        message: '🎉 SUPABASE POSTGRESQL ÇALIŞIYOR! Dashboard\'ta görebilirsin!',
        database: 'PostgreSQL (Supabase)',
        test_data: result.rows,
        database_url_exists: !!process.env.DATABASE_URL,
        timestamp: new Date().toISOString()
      });
    } else {
      res.json({
        message: 'Using SQLite fallback',
        database: 'SQLite',
        database_url_exists: !!process.env.DATABASE_URL,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({
      message: 'Database test failed',
      error: error.message,
      database_url_exists: !!process.env.DATABASE_URL,
      timestamp: new Date().toISOString()
    });
  }
});

// Database debug route
router.get('/db-debug', async (req, res) => {
  try {
    const envVars = {
      DATABASE_URL: process.env.DATABASE_URL ? 'EXISTS' : 'MISSING',
      NODE_ENV: process.env.NODE_ENV || 'undefined',
      JWT_SECRET: process.env.JWT_SECRET ? 'EXISTS' : 'MISSING',
      ALL_ENV_KEYS: Object.keys(process.env).filter(key => key.includes('DATABASE')),
    };
    
    res.json({
      message: 'Environment debug info',
      environment: envVars,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      message: 'Debug failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// User registration
router.post('/register', async (req, res) => {
  try {
    await db.initialize();
    
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Email, password, and name are required' });
    }

    // Check if user exists
    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows && existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Check user limit (max 10 users)
    const userCount = await db.query('SELECT COUNT(*) as count FROM users');
    const count = userCount.rows[0].count;
    if (parseInt(count) >= 10) {
      return res.status(400).json({ message: 'Maximum user limit (10) reached' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Get role (first user is admin, others are members)
    const role = parseInt(count) === 0 ? 'Admin' : 'Member';

    // Create user
    const result = await db.query(
      'INSERT INTO users (email, password_hash, username, role) VALUES ($1, $2, $3, $4) RETURNING id',
      [email, hashedPassword, name, role]
    );

    const userId = result.rows[0].id;

    // Generate JWT token
    const token = jwt.sign(
      { id: userId, email, role },
      process.env.JWT_SECRET || 'eternalgames-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: '🎉 User created successfully!',
      token,
      user: {
        id: userId,
        email,
        name,
        role
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
});

// User login
router.post('/login', async (req, res) => {
  try {
    await db.initialize();
    
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'eternalgames-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      message: '🎉 Login successful!',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.username,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    await db.initialize();
    
    const userResult = await db.query('SELECT id, username, email, role, created_at FROM users WHERE id = $1', [req.user.id]);
    const user = userResult.rows[0];
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.username,
        role: user.role,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: 'Error fetching user profile' });
  }
});

module.exports = router;
