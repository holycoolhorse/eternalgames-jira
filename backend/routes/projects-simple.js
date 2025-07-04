const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Simple debug endpoint for projects
router.get('/debug', authenticateToken, async (req, res) => {
  try {
    await db.initialize();
    
    // Simple query to get all projects for admin
    const result = await db.query('SELECT * FROM projects ORDER BY created_at DESC');
    
    res.json({
      message: 'Projects debug',
      user: req.user,
      projects: result.rows || [],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Projects debug error:', error);
    res.status(500).json({
      message: 'Projects debug failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get all projects - Simplified version
router.get('/', authenticateToken, async (req, res) => {
  try {
    await db.initialize();
    
    // Simple query to get all projects
    const result = await db.query(`
      SELECT p.*, u.name as owner_name
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      ORDER BY p.created_at DESC
    `);
    
    res.json({
      success: true,
      projects: result.rows || [],
      message: 'Projects fetched successfully'
    });
    
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching projects',
      error: error.message 
    });
  }
});

// Create new project
router.post('/', authenticateToken, [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Project name is required'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description too long'),
  body('key').optional().trim().isLength({ min: 2, max: 10 }).withMessage('Project key must be 2-10 characters')
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
    
    const { name, description, key } = req.body;
    const projectKey = key || name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5);
    
    // Check if project with same key exists
    const existingProjectResult = await db.query('SELECT id FROM projects WHERE key = $1', [projectKey]);
    const existingProject = existingProjectResult.rows[0];
    if (existingProject) {
      return res.status(400).json({ 
        success: false,
        message: 'Project with this key already exists' 
      });
    }

    // Create project
    const result = await db.query(`
      INSERT INTO projects (name, description, key, owner_id, created_by) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING *
    `, [name, description, projectKey, req.user.id, req.user.id]);

    const project = result.rows[0];

    // Add creator as project member with admin role
    try {
      await db.query(`
        INSERT INTO project_members (project_id, user_id, role) 
        VALUES ($1, $2, $3)
      `, [project.id, req.user.id, 'Admin']);
    } catch (memberError) {
      console.log('Project member creation failed, but project created:', memberError.message);
    }

    res.status(201).json({
      success: true,
      project: project,
      message: 'Project created successfully'
    });

  } catch (error) {
    console.error('Create project error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      user: req.user
    });
    res.status(500).json({ 
      success: false,
      message: 'Error creating project',
      error: error.message 
    });
  }
});

// Get single project
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    await db.initialize();
    
    const { id } = req.params;
    
    const projectResult = await db.query(`
      SELECT p.*, u.name as owner_name
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      WHERE p.id = $1
    `, [id]);

    const project = projectResult.rows[0];
    if (!project) {
      return res.status(404).json({ 
        success: false,
        message: 'Project not found' 
      });
    }

    // Get project members
    const membersResult = await db.query(`
      SELECT pm.role, pm.created_at, pm.user_id, u.name, u.email
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = $1
      ORDER BY pm.created_at ASC
    `, [id]);

    project.members = membersResult.rows || [];

    res.json({
      success: true,
      project: project,
      message: 'Project fetched successfully'
    });

  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching project',
      error: error.message 
    });
  }
});

// Get project members
router.get('/:id/members', authenticateToken, async (req, res) => {
  try {
    await db.initialize();
    
    const { id } = req.params;
    
    const membersResult = await db.query(`
      SELECT pm.role, pm.created_at, u.id as user_id, u.name as name, u.email
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = $1
      ORDER BY pm.created_at ASC
    `, [id]);

    res.json({
      success: true,
      members: membersResult.rows || [],
      message: 'Project members fetched successfully'
    });

  } catch (error) {
    console.error('Get project members error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching project members',
      error: error.message 
    });
  }
});

// Add project member
router.post('/:id/members', authenticateToken, [
  body('userId').isInt().withMessage('User ID is required'),
  body('role').isIn(['Admin', 'Member', 'Reader']).withMessage('Valid role required')
], async (req, res) => {
  try {
    console.log('Add member request:', req.body);
    console.log('Project ID:', req.params.id);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ 
        success: false,
        message: 'Validation error',
        errors: errors.array() 
      });
    }

    await db.initialize();
    
    const { id } = req.params;
    const { userId, role } = req.body;
    
    console.log('Adding member - Project ID:', id, 'User ID:', userId, 'Role:', role);
    
    // Check if user is already a member
    const existingMemberResult = await db.query(
      'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (existingMemberResult.rows.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: 'User is already a member of this project' 
      });
    }
    
    // Add member
    await db.query(`
      INSERT INTO project_members (project_id, user_id, role) 
      VALUES ($1, $2, $3)
    `, [id, userId, role]);

    res.status(201).json({
      success: true,
      message: 'Project member added successfully'
    });

  } catch (error) {
    console.error('Add project member error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error adding project member',
      error: error.message 
    });
  }
});

// Get project tasks
router.get('/:id/tasks', authenticateToken, async (req, res) => {
  try {
    await db.initialize();
    
    const { id } = req.params;
    
    const tasksResult = await db.query(`
      SELECT t.*, u.name as assigned_to_name, p.name as project_name, p.key as project_key
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.project_id = $1
      ORDER BY t.created_at DESC
    `, [id]);

    res.json({
      success: true,
      tasks: tasksResult.rows || [],
      message: 'Project tasks fetched successfully'
    });

  } catch (error) {
    console.error('Get project tasks error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching project tasks',
      error: error.message 
    });
  }
});

module.exports = router;
