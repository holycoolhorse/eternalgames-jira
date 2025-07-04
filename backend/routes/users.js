const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin only) 
router.get('/', authenticateToken, async (req, res) => {
  try {
    await db.initialize();
    
    const usersResult = await db.query(`
      SELECT id, email, name, role, created_at, updated_at 
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

// Get users for project assignment (members and admins only)
router.get('/assignable', authenticateToken, async (req, res) => {
  try {
    await db.initialize();
    
    const usersResult = await db.query(`
      SELECT id, name, email, role
      FROM users 
      WHERE role IN ('Admin', 'Member')
      ORDER BY name ASC
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

// Get single user
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    await db.initialize();
    
    const { id } = req.params;

    const userResult = await db.query(`
      SELECT id, email, name, role, created_at, updated_at 
      FROM users 
      WHERE id = $1
    `, [id]);

    if (!userResult.rows || userResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    const user = userResult.rows[0];

    res.json({ 
      success: true,
      user: user,
      message: 'User fetched successfully'
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching user',
      error: error.message 
    });
  }
});

// Update user role (admin only)
router.put('/:id/role', authenticateToken, [
  body('role').isIn(['Admin', 'Member', 'Reader']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        message: 'Validation error',
        errors: errors.array() 
      });
    }

    await db.initialize();
    
    const { id } = req.params;
    const { role } = req.body;

    // Prevent self-demotion from admin
    if (req.user.id === parseInt(id) && req.user.role === 'Admin' && role !== 'Admin') {
      return res.status(400).json({ 
        success: false,
        message: 'Cannot change your own admin role' 
      });
    }

    // Check if user exists
    const userResult = await db.query('SELECT id FROM users WHERE id = $1', [id]);
    if (!userResult.rows || userResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Update role
    await db.query(
      'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [role, id]
    );

    const updatedUserResult = await db.query(`
      SELECT id, email, name, role, created_at, updated_at 
      FROM users 
      WHERE id = $1
    `, [id]);

    res.json({
      success: true,
      message: 'User role updated successfully',
      user: updatedUserResult.rows[0]
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating user role',
      error: error.message 
    });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await db.initialize();
    
    const { id } = req.params;

    // Prevent self-deletion
    if (req.user.id === parseInt(id)) {
      return res.status(400).json({ 
        success: false,
        message: 'Cannot delete your own account' 
      });
    }

    // Check if user exists
    const userResult = await db.query('SELECT id FROM users WHERE id = $1', [id]);
    if (!userResult.rows || userResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Delete user (this will cascade to related records)
    await db.query('DELETE FROM users WHERE id = $1', [id]);

    res.json({ 
      success: true,
      message: 'User deleted successfully' 
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting user',
      error: error.message 
    });
  }
});

module.exports = router;
