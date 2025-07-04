const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, authorizeRole, checkProjectAccess } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const projectValidation = [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Project name is required (max 100 chars)'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description too long (max 500 chars)'),
  body('key').trim().isLength({ min: 2, max: 10 }).withMessage('Project key must be 2-10 characters').matches(/^[A-Z]+$/).withMessage('Project key must contain only uppercase letters')
];

// Get all projects
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query;
    let params = [];

    if (req.user.role === 'admin') {
      // Admins can see all projects
      query = `
        SELECT p.*, u.name as owner_name,
               COUNT(DISTINCT pm.user_id) as member_count,
               COUNT(DISTINCT t.id) as task_count
        FROM projects p
        LEFT JOIN users u ON p.owner_id = u.id
        LEFT JOIN project_members pm ON p.id = pm.project_id
        LEFT JOIN tasks t ON p.id = t.project_id
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `;
    } else {
      // Regular users only see projects they're members of
      query = `
        SELECT p.*, u.name as owner_name,
               COUNT(DISTINCT pm.user_id) as member_count,
               COUNT(DISTINCT t.id) as task_count,
               pm2.role as user_role
        FROM projects p
        LEFT JOIN users u ON p.owner_id = u.id
        LEFT JOIN project_members pm ON p.id = pm.project_id
        LEFT JOIN tasks t ON p.id = t.project_id
        JOIN project_members pm2 ON p.id = pm2.project_id AND pm2.user_id = ?
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `;
      params = [req.user.id];
    }

    const projects = await db.all(query, params);
    res.json({ projects });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Error fetching projects' });
  }
});

// Get single project
router.get('/:id', authenticateToken, checkProjectAccess, async (req, res) => {
  try {
    const { id } = req.params;

    const project = await db.get(`
      SELECT p.*, u.name as owner_name, u.email as owner_email
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      WHERE p.id = ?
    `, [id]);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Get project members
    const members = await db.all(`
      SELECT u.id, u.name, u.email, u.avatar, pm.role
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = ?
      ORDER BY pm.role, u.name
    `, [id]);

    res.json({
      project: {
        ...project,
        members
      }
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ message: 'Error fetching project' });
  }
});

// Create new project
router.post('/', authenticateToken, authorizeRole(['admin', 'member']), projectValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, key } = req.body;

    // Check if project key already exists
    const existingProject = await db.get('SELECT id FROM projects WHERE key = ?', [key.toUpperCase()]);
    if (existingProject) {
      return res.status(400).json({ message: 'Project key already exists' });
    }

    // Create project
    const result = await db.run(
      'INSERT INTO projects (name, description, key, owner_id) VALUES (?, ?, ?, ?)',
      [name, description, key.toUpperCase(), req.user.id]
    );

    // Add creator as admin member
    await db.run(
      'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
      [result.id, req.user.id, 'admin']
    );

    const project = await db.get(`
      SELECT p.*, u.name as owner_name
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      WHERE p.id = ?
    `, [result.id]);

    res.status(201).json({
      message: 'Project created successfully',
      project
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ message: 'Error creating project' });
  }
});

// Update project
router.put('/:id', authenticateToken, checkProjectAccess, projectValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, description, key } = req.body;

    // Check permissions (only project admin or system admin can update)
    if (req.user.role !== 'admin' && req.userProjectRole !== 'admin') {
      return res.status(403).json({ message: 'Only project administrators can update projects' });
    }

    // Check if new key conflicts with existing projects
    if (key) {
      const existingProject = await db.get('SELECT id FROM projects WHERE key = ? AND id != ?', [key.toUpperCase(), id]);
      if (existingProject) {
        return res.status(400).json({ message: 'Project key already exists' });
      }
    }

    // Update project
    await db.run(
      'UPDATE projects SET name = ?, description = ?, key = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, description, key.toUpperCase(), id]
    );

    const updatedProject = await db.get(`
      SELECT p.*, u.name as owner_name
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      WHERE p.id = ?
    `, [id]);

    res.json({
      message: 'Project updated successfully',
      project: updatedProject
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ message: 'Error updating project' });
  }
});

// Delete project
router.delete('/:id', authenticateToken, checkProjectAccess, async (req, res) => {
  try {
    const { id } = req.params;

    // Check permissions (only project admin or system admin can delete)
    if (req.user.role !== 'admin' && req.userProjectRole !== 'admin') {
      return res.status(403).json({ message: 'Only project administrators can delete projects' });
    }

    // Delete project (this will cascade to related records)
    await db.run('DELETE FROM projects WHERE id = ?', [id]);

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ message: 'Error deleting project' });
  }
});

// Add member to project
router.post('/:id/members', authenticateToken, checkProjectAccess, [
  body('userId').isInt().withMessage('Valid user ID is required'),
  body('role').isIn(['admin', 'member', 'reader']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { userId, role } = req.body;

    // Check permissions (only project admin or system admin can add members)
    if (req.user.role !== 'admin' && req.userProjectRole !== 'admin') {
      return res.status(403).json({ message: 'Only project administrators can add members' });
    }

    // Check if user exists
    const user = await db.get('SELECT id, name FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is already a member
    const existingMember = await db.get(
      'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?',
      [id, userId]
    );
    if (existingMember) {
      return res.status(400).json({ message: 'User is already a member of this project' });
    }

    // Add member
    await db.run(
      'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
      [id, userId, role]
    );

    res.status(201).json({
      message: 'Member added successfully',
      member: {
        id: userId,
        name: user.name,
        role
      }
    });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ message: 'Error adding member' });
  }
});

// Update member role
router.put('/:id/members/:userId', authenticateToken, checkProjectAccess, [
  body('role').isIn(['admin', 'member', 'reader']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id, userId } = req.params;
    const { role } = req.body;

    // Check permissions (only project admin or system admin can update member roles)
    if (req.user.role !== 'admin' && req.userProjectRole !== 'admin') {
      return res.status(403).json({ message: 'Only project administrators can update member roles' });
    }

    // Update member role
    const result = await db.run(
      'UPDATE project_members SET role = ? WHERE project_id = ? AND user_id = ?',
      [role, id, userId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Member not found' });
    }

    res.json({ message: 'Member role updated successfully' });
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({ message: 'Error updating member role' });
  }
});

// Remove member from project
router.delete('/:id/members/:userId', authenticateToken, checkProjectAccess, async (req, res) => {
  try {
    const { id, userId } = req.params;

    // Check permissions (only project admin or system admin can remove members)
    if (req.user.role !== 'admin' && req.userProjectRole !== 'admin') {
      return res.status(403).json({ message: 'Only project administrators can remove members' });
    }

    // Prevent removing project owner
    const project = await db.get('SELECT owner_id FROM projects WHERE id = ?', [id]);
    if (project && project.owner_id === parseInt(userId)) {
      return res.status(400).json({ message: 'Cannot remove project owner' });
    }

    // Remove member
    const result = await db.run(
      'DELETE FROM project_members WHERE project_id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Member not found' });
    }

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ message: 'Error removing member' });
  }
});

// Get project statistics
router.get('/:id/stats', authenticateToken, checkProjectAccess, async (req, res) => {
  try {
    const { id } = req.params;

    const stats = await Promise.all([
      // Total tasks
      db.get('SELECT COUNT(*) as count FROM tasks WHERE project_id = ?', [id]),
      // Tasks by status
      db.all(`
        SELECT status, COUNT(*) as count 
        FROM tasks 
        WHERE project_id = ? 
        GROUP BY status
      `, [id]),
      // Tasks by priority
      db.all(`
        SELECT priority, COUNT(*) as count 
        FROM tasks 
        WHERE project_id = ? 
        GROUP BY priority
      `, [id]),
      // Tasks by type
      db.all(`
        SELECT type, COUNT(*) as count 
        FROM tasks 
        WHERE project_id = ? 
        GROUP BY type
      `, [id]),
      // Total members
      db.get('SELECT COUNT(*) as count FROM project_members WHERE project_id = ?', [id])
    ]);

    const [totalTasks, tasksByStatus, tasksByPriority, tasksByType, totalMembers] = stats;

    res.json({
      totalTasks: totalTasks.count,
      totalMembers: totalMembers.count,
      tasksByStatus: tasksByStatus.reduce((acc, item) => {
        acc[item.status] = item.count;
        return acc;
      }, {}),
      tasksByPriority: tasksByPriority.reduce((acc, item) => {
        acc[item.priority] = item.count;
        return acc;
      }, {}),
      tasksByType: tasksByType.reduce((acc, item) => {
        acc[item.type] = item.count;
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Get project stats error:', error);
    res.status(500).json({ message: 'Error fetching project statistics' });
  }
});

// Get project tasks
router.get('/:id/tasks', authenticateToken, checkProjectAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assignee, priority, type } = req.query;

    let query = `
      SELECT t.*, 
             p.name as project_name, p.key as project_key,
             (p.key || '-' || t.task_number) as key,
             assignee.name as assignee_name, assignee.avatar as assignee_avatar,
             reporter.name as reporter_name,
             COUNT(DISTINCT c.id) as comment_count,
             COUNT(DISTINCT a.id) as attachment_count
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users assignee ON t.assignee_id = assignee.id
      LEFT JOIN users reporter ON t.reporter_id = reporter.id
      LEFT JOIN comments c ON t.id = c.task_id
      LEFT JOIN attachments a ON t.id = a.task_id
      WHERE t.project_id = ?
    `;

    const params = [id];

    // Add filters
    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }
    if (assignee) {
      query += ' AND t.assignee_id = ?';
      params.push(assignee);
    }
    if (priority) {
      query += ' AND t.priority = ?';
      params.push(priority);
    }
    if (type) {
      query += ' AND t.type = ?';
      params.push(type);
    }

    query += ' GROUP BY t.id ORDER BY t.created_at DESC';

    const tasks = await db.all(query, params);
    res.json({ tasks });
  } catch (error) {
    console.error('Get project tasks error:', error);
    res.status(500).json({ message: 'Error fetching project tasks' });
  }
});

module.exports = router;
