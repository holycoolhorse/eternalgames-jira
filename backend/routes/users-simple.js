const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// Get users for project assignment
router.get('/assignable', authenticateToken, async (req, res) => {
  try {
    await db.initialize();
    
    const usersResult = await db.query(`
      SELECT id, username as name, email, role
      FROM users 
      WHERE role IN ('Admin', 'Member')
      ORDER BY username ASC
    `);

    res.json({ 
      success: true,
      users: usersResult.rows || [],
      message: 'Assignable users fetched successfully'
    });
  } catch (error) {
    console.error('Get assignable users error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching assignable users',
      error: error.message 
    });
  }
});

// Get all users (admin only)
router.get('/', authenticateToken, authorizeRole(['Admin']), async (req, res) => {
  try {
    await db.initialize();
    
    const usersResult = await db.query(`
      SELECT id, email, username as name, role, created_at
      FROM users 
      ORDER BY created_at DESC
    `);

    res.json({ 
      success: true,
      users: usersResult.rows || [],
      message: 'Users fetched successfully'
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching users',
      error: error.message 
    });
  }
});

module.exports = router;
