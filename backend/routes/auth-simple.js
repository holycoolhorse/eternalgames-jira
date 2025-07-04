const express = require('express');
const router = express.Router();

// Database import
const db = require('../config/database');

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Auth routes working!', timestamp: new Date().toISOString() });
});

// Database test route
router.get('/db-test', async (req, res) => {
  try {
    await db.initialize();
    
    // Test tablosu oluştur
    await db.query('CREATE TABLE IF NOT EXISTS test_activity (id SERIAL PRIMARY KEY, message TEXT, created_at TIMESTAMP DEFAULT NOW())');
    
    // Test verisi ekle
    const message = 'EternalGames Jira database test - ' + new Date().toISOString();
    await db.query('INSERT INTO test_activity (message) VALUES ($1)', [message]);
    
    // Verileri listele
    const result = await db.query('SELECT * FROM test_activity ORDER BY created_at DESC LIMIT 3');
    
    res.json({
      message: 'Database test successful!',
      data: result.rows,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      message: 'Database test failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Simple register test
router.post('/register-test', (req, res) => {
  res.json({ 
    message: 'Register endpoint working!', 
    body: req.body,
    timestamp: new Date().toISOString() 
  });
});

module.exports = router;
