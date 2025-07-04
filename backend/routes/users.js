const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const users = await db.all(`
      SELECT id, email, name, role, avatar, created_at, updated_at 
      FROM users 
      ORDER BY created_at DESC
    `);

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Get users for project assignment (members and admins only)
router.get('/assignable', authenticateToken, async (req, res) => {
  try {
    const users = await db.all(`
      SELECT id, name, email, avatar
      FROM users 
      WHERE role IN ('admin', 'member')
      ORDER BY name ASC
    `);

    res.json({ users });
  } catch (error) {
    console.error('Get assignable users error:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Get single user
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await db.get(`
      SELECT id, email, name, role, avatar, created_at, updated_at 
      FROM users 
      WHERE id = ?
    `, [id]);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Non-admin users can only view their own profile or basic info of others
    if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
      const publicUser = {
        id: user.id,
        name: user.name,
        avatar: user.avatar
      };
      return res.json({ user: publicUser });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Error fetching user' });
  }
});

// Update user role (admin only)
router.put('/:id/role', authenticateToken, authorizeRole(['admin']), [
  body('role').isIn(['admin', 'member', 'reader']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { role } = req.body;

    // Prevent self-demotion from admin
    if (req.user.id === parseInt(id) && role !== 'admin') {
      return res.status(400).json({ message: 'Cannot change your own admin role' });
    }

    // Check if user exists
    const user = await db.get('SELECT id FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update role
    await db.run(
      'UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [role, id]
    );

    const updatedUser = await db.get(`
      SELECT id, email, name, role, avatar, created_at, updated_at 
      FROM users 
      WHERE id = ?
    `, [id]);

    res.json({
      message: 'User role updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ message: 'Error updating user role' });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (req.user.id === parseInt(id)) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    // Check if user exists
    const user = await db.get('SELECT id FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete user (this will cascade to related records)
    await db.run('DELETE FROM users WHERE id = ?', [id]);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Error deleting user' });
  }
});

// Get user statistics
router.get('/:id/stats', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Non-admin users can only view their own stats
    if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const stats = await Promise.all([
      // Total tasks assigned
      db.get('SELECT COUNT(*) as count FROM tasks WHERE assignee_id = ?', [id]),
      // Tasks by status
      db.all(`
        SELECT status, COUNT(*) as count 
        FROM tasks 
        WHERE assignee_id = ? 
        GROUP BY status
      `, [id]),
      // Tasks by priority
      db.all(`
        SELECT priority, COUNT(*) as count 
        FROM tasks 
        WHERE assignee_id = ? 
        GROUP BY priority
      `, [id]),
      // Recent tasks
      db.all(`
        SELECT t.id, t.title, t.status, t.priority, p.name as project_name
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE t.assignee_id = ?
        ORDER BY t.updated_at DESC
        LIMIT 5
      `, [id])
    ]);

    const [totalTasks, tasksByStatus, tasksByPriority, recentTasks] = stats;

    res.json({
      totalTasks: totalTasks.count,
      tasksByStatus: tasksByStatus.reduce((acc, item) => {
        acc[item.status] = item.count;
        return acc;
      }, {}),
      tasksByPriority: tasksByPriority.reduce((acc, item) => {
        acc[item.priority] = item.count;
        return acc;
      }, {}),
      recentTasks: recentTasks
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Error fetching user statistics' });
  }
});

module.exports = router;
