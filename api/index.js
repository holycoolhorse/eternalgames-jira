// Vercel serverless function entry point - Simple and reliable
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Simple app for Vercel serverless
const app = express();

// Basic middleware
app.use(helmet());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Handle OPTIONS requests
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.status(200).end();
});

// Initialize database
let dbInitialized = false;
const initDB = async () => {
  if (!dbInitialized) {
    try {
      const db = require('./config/database');
      await db.initialize();
      dbInitialized = true;
      console.log('Database initialized');
    } catch (error) {
      console.error('Database init error:', error);
      // Don't throw in production
    }
  }
};

// Routes with error handling
const setupRoutes = () => {
  try {
    console.log('Setting up routes...');
    
    // Load auth routes directly
    const authRoutes = require('./routes/auth-complete');
    app.use('/api/auth', authRoutes);
    console.log('Auth routes loaded successfully');
    
    // Load other routes with error handling
    try {
      const userRoutes = require('./routes/users-simple');
      app.use('/api/users', userRoutes);
      console.log('User routes loaded');
    } catch (err) {
      console.log('User routes not found, skipping');
    }
    
    try {
      const projectRoutes = require('./routes/projects-simple');
      app.use('/api/projects', projectRoutes);
      console.log('Project routes loaded');
    } catch (err) {
      console.log('Project routes not found, skipping');
    }
    
    try {
      const taskRoutes = require('./routes/tasks');
      app.use('/api/tasks', taskRoutes);
      console.log('Task routes loaded');
    } catch (err) {
      console.log('Task routes not found, skipping');
    }
    
    try {
      const uploadRoutes = require('./routes/upload');
      app.use('/api/upload', uploadRoutes);
      console.log('Upload routes loaded');
    } catch (err) {
      console.log('Upload routes not found, skipping');
    }
    
    console.log('Routes setup successfully');
  } catch (error) {
    console.error('Route setup error:', error);
  }
};

// Basic endpoints
app.get('/api/health', async (req, res) => {
  try {
    await initDB();
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      database: dbInitialized ? 'Connected' : 'Disconnected'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/ping', (req, res) => {
  res.json({ message: 'pong', timestamp: new Date().toISOString() });
});

// Environment debug endpoint
app.get('/api/env-debug', (req, res) => {
  const envVars = {
    DATABASE_URL: process.env.DATABASE_URL ? 'EXISTS' : 'MISSING',
    NODE_ENV: process.env.NODE_ENV || 'undefined',
    JWT_SECRET: process.env.JWT_SECRET ? 'EXISTS' : 'MISSING',
    ALL_ENV_KEYS: Object.keys(process.env).filter(key => key.includes('DATABASE')),
    VERCEL_ENV: process.env.VERCEL_ENV || 'undefined',
  };
  
  res.json({
    message: 'Environment debug info',
    environment: envVars,
    timestamp: new Date().toISOString()
  });
});

// Test auth routes
app.get('/api/auth/test', (req, res) => {
  res.json({ message: 'Auth routes working', timestamp: new Date().toISOString() });
});

// Database test route - SUPABASE ACTIVITY OLUŞTURACAK
app.get('/api/auth/db-test', async (req, res) => {
  try {
    await initDB();
    const db = require('./config/database');
    
    // Debug: Check if we're using PostgreSQL
    const isPostgreSQL = !!process.env.DATABASE_URL;
    console.log('Using PostgreSQL:', isPostgreSQL);
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
    
    if (isPostgreSQL) {
      // PostgreSQL syntax
      await db.query('CREATE TABLE IF NOT EXISTS eternalgames_activity (id SERIAL PRIMARY KEY, action TEXT, created_at TIMESTAMP DEFAULT NOW())');
      
      const action = 'EternalGames Jira - Database Test Activity - ' + new Date().toISOString();
      await db.query('INSERT INTO eternalgames_activity (action) VALUES ($1)', [action]);
      
      const result = await db.query('SELECT * FROM eternalgames_activity ORDER BY created_at DESC LIMIT 5');
      
      res.json({
        message: 'PostgreSQL Database test successful! Check Supabase dashboard now!',
        database: 'PostgreSQL',
        activity: result.rows,
        timestamp: new Date().toISOString()
      });
    } else {
      // SQLite fallback
      res.json({
        message: 'Using SQLite fallback - DATABASE_URL not found',
        database: 'SQLite',
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

// Setup routes
setupRoutes();

// Initialize database on startup
initDB();

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.originalUrl
  });
});

module.exports = app;
