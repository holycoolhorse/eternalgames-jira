const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Create new task
router.post('/', authenticateToken, [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title is required'),
  body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description too long'),
  body('priority').isIn(['Low', 'Medium', 'High']).withMessage('Priority must be Low, Medium, or High'),
  body('status').isIn(['TODO', 'IN_PROGRESS', 'DONE']).withMessage('Status must be TODO, IN_PROGRESS, or DONE'),
  body('project_id').isInt().withMessage('Project ID is required'),
  body('assigned_to').optional().isInt().withMessage('Assigned to must be a number')
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
    
    const { title, description, priority, status, project_id, assigned_to } = req.body;
    
    console.log('Creating task:', { title, description, priority, status, project_id, assigned_to });
    
    const result = await db.query(`
      INSERT INTO tasks (title, description, priority, status, project_id, assigned_to, created_by, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [title, description, priority, status, project_id, assigned_to, req.user.id]);

    res.status(201).json({
      success: true,
      task: result.rows[0],
      message: 'Task created successfully'
    });

  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error creating task',
      error: error.message 
    });
  }
});

// Get tasks for a project
router.get('/project/:projectId', authenticateToken, checkProjectAccess, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status, assignee, priority, type } = req.query;

    let query = `
      SELECT t.*, 
             p.name as project_name, p.key as project_key,
             (p.key || '-' || t.task_number) as key,
             assignee.username as assignee_name, assignee.avatar as assignee_avatar,
             reporter.username as reporter_name,
             COUNT(c.id) as comment_count,
             COUNT(a.id) as attachment_count
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users assignee ON t.assignee_id = assignee.id
      LEFT JOIN users reporter ON t.reporter_id = reporter.id
      LEFT JOIN comments c ON t.id = c.task_id
      LEFT JOIN attachments a ON t.id = a.task_id
      WHERE t.project_id = $1
    `;

    const params = [projectId];
    let paramIndex = 2;

    // Add filters
    if (status) {
      query += ` AND t.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    if (assignee) {
      query += ` AND t.assignee_id = $${paramIndex}`;
      params.push(assignee);
      paramIndex++;
    }
    if (priority) {
      query += ` AND t.priority = $${paramIndex}`;
      params.push(priority);
      paramIndex++;
    }
    if (type) {
      query += ` AND t.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    query += ' GROUP BY t.id, p.name, p.key, assignee.username, assignee.avatar, reporter.username ORDER BY t.created_at DESC';

    const result = await db.query(query, params);
    res.json({ success: true, tasks: result.rows || [] });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ success: false, message: 'Error fetching tasks' });
  }
});

// Get single task
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const task = await db.get(`
      SELECT t.*, 
             p.name as project_name, p.key as project_key,
             (p.key || '-' || t.task_number) as key,
             assignee.name as assignee_name, assignee.email as assignee_email, assignee.avatar as assignee_avatar,
             reporter.name as reporter_name, reporter.email as reporter_email
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users assignee ON t.assignee_id = assignee.id
      LEFT JOIN users reporter ON t.reporter_id = reporter.id
      WHERE t.id = ?
    `, [id]);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check project access
    req.params.projectId = task.project_id;
    await new Promise((resolve, reject) => {
      checkProjectAccess(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Get comments
    const comments = await db.all(`
      SELECT c.*, u.name as author_name, u.avatar as author_avatar
      FROM comments c
      LEFT JOIN users u ON c.author_id = u.id
      WHERE c.task_id = ?
      ORDER BY c.created_at ASC
    `, [id]);

    // Get attachments
    const attachments = await db.all(`
      SELECT a.*, u.name as uploaded_by_name
      FROM attachments a
      LEFT JOIN users u ON a.uploaded_by = u.id
      WHERE a.task_id = ?
      ORDER BY a.created_at ASC
    `, [id]);

    res.json({
      task: {
        ...task,
        comments,
        attachments
      }
    });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ message: 'Error fetching task' });
  }
});

// Create new task
router.post('/', authenticateToken, [
  body('projectId').isInt().withMessage('Project ID is required'),
  ...taskValidation
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, type, priority, projectId, assigneeId, dueDate } = req.body;

    // Check project access
    req.params.projectId = projectId;
    await new Promise((resolve, reject) => {
      checkProjectAccess(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Check permissions (readers cannot create tasks)
    if (req.userProjectRole === 'reader') {
      return res.status(403).json({ message: 'Readers cannot create tasks' });
    }

    // Validate assignee exists and is project member
    if (assigneeId) {
      const assignee = await db.get(`
        SELECT u.id FROM users u
        JOIN project_members pm ON u.id = pm.user_id
        WHERE u.id = ? AND pm.project_id = ?
      `, [assigneeId, projectId]);

      if (!assignee) {
        return res.status(400).json({ message: 'Assignee must be a project member' });
      }
    }

    // Get next task number for this project
    const lastTask = await db.get(
      'SELECT MAX(task_number) as max_number FROM tasks WHERE project_id = ?',
      [projectId]
    );
    const taskNumber = (lastTask?.max_number || 0) + 1;

    // Create task
    const result = await db.run(`
      INSERT INTO tasks (title, description, type, priority, project_id, assignee_id, reporter_id, due_date, task_number)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [title, description, type, priority, projectId, assigneeId, req.user.id, dueDate, taskNumber]);

    const newTask = await db.get(`
      SELECT t.*, 
             p.name as project_name, p.key as project_key,
             (p.key || '-' || t.task_number) as key,
             assignee.name as assignee_name, assignee.avatar as assignee_avatar,
             reporter.name as reporter_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users assignee ON t.assignee_id = assignee.id
      LEFT JOIN users reporter ON t.reporter_id = reporter.id
      WHERE t.id = ?
    `, [result.id]);

    // Create notification for assignee
    if (assigneeId && assigneeId !== req.user.id) {
      await db.run(`
        INSERT INTO notifications (user_id, title, message, type, task_id)
        VALUES (?, ?, ?, ?, ?)
      `, [
        assigneeId,
        'New Task Assigned',
        `You have been assigned task: ${title}`,
        'info',
        result.id
      ]);
    }

    res.status(201).json({
      message: 'Task created successfully',
      task: newTask
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Error creating task' });
  }
});

// Update task status
router.patch('/:id/status', authenticateToken, async (req, res) => {
  const { id } = req.params;
  let { status } = req.body;

  // Normalize status to match database constraint
  const validStatuses = {
    'TODO': 'todo',
    'IN_PROGRESS': 'in_progress', 
    'DONE': 'done',
    'todo': 'todo',
    'in_progress': 'in_progress',
    'done': 'done'
  };

  const normalizedStatus = validStatuses[status];
  if (!normalizedStatus) {
    return res.status(400).json({ message: 'Invalid status value' });
  }

  try {
    // First, get the task to find its project_id
    const task = await db.get('SELECT project_id FROM tasks WHERE id = ?', [id]);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Now, check if the user has access to this project
    req.params.projectId = task.project_id;
    await new Promise((resolve, reject) => {
      checkProjectAccess(req, res, (err) => {
        if (err) return reject(new Error('Access Denied'));
        resolve();
      });
    });

    // If access is granted, update the status
    const result = await db.run(
      'UPDATE tasks SET status = ? WHERE id = ?',
      [normalizedStatus, id]
    );

    if (result.changes === 0) {
      // This case might be redundant due to the check above, but good for safety
      return res.status(404).json({ message: 'Task not found or user cannot access' });
    }

    res.json({ message: 'Task status updated successfully' });

  } catch (error) {
    if (error.message === 'Access Denied') {
        return res.status(403).json({ message: 'You do not have permission to update tasks in this project.' });
    }
    console.error('Update task status error:', error);
    res.status(500).json({ message: 'Error updating task status' });
  }
});

// Update task details
router.put('/:id', authenticateToken, taskValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    let { title, description, type, priority, status, assigneeId, dueDate } = req.body;

    // Normalize status to match database constraint
    const validStatuses = {
      'TODO': 'todo',
      'IN_PROGRESS': 'in_progress', 
      'DONE': 'done',
      'todo': 'todo',
      'in_progress': 'in_progress',
      'done': 'done'
    };

    if (status && !validStatuses[status]) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    if (status) {
      status = validStatuses[status];
    }

    // Get current task to check project access
    const currentTask = await db.get('SELECT project_id, assignee_id FROM tasks WHERE id = ?', [id]);
    if (!currentTask) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check project access
    req.params.projectId = currentTask.project_id;
    await new Promise((resolve, reject) => {
      checkProjectAccess(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Check permissions (readers cannot update tasks)
    if (req.userProjectRole === 'reader') {
      return res.status(403).json({ message: 'Readers cannot update tasks' });
    }

    // Validate assignee exists and is project member
    if (assigneeId) {
      const assignee = await db.get(`
        SELECT u.id FROM users u
        JOIN project_members pm ON u.id = pm.user_id
        WHERE u.id = ? AND pm.project_id = ?
      `, [assigneeId, currentTask.project_id]);

      if (!assignee) {
        return res.status(400).json({ message: 'Assignee must be a project member' });
      }
    }

    // Update task
    await db.run(`
      UPDATE tasks 
      SET title = ?, description = ?, type = ?, priority = ?, status = ?, assignee_id = ?, due_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [title, description, type, priority, status, assigneeId, dueDate, id]);

    const updatedTask = await db.get(`
      SELECT t.*, 
             p.name as project_name, p.key as project_key,
             assignee.name as assignee_name, assignee.avatar as assignee_avatar,
             reporter.name as reporter_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users assignee ON t.assignee_id = assignee.id
      LEFT JOIN users reporter ON t.reporter_id = reporter.id
      WHERE t.id = ?
    `, [id]);

    // Create notification for new assignee
    if (assigneeId && assigneeId !== currentTask.assignee_id && assigneeId !== req.user.id) {
      await db.run(`
        INSERT INTO notifications (user_id, title, message, type, task_id)
        VALUES (?, ?, ?, ?, ?)
      `, [
        assigneeId,
        'Task Assigned',
        `You have been assigned task: ${title}`,
        'info',
        id
      ]);
    }

    res.json({
      message: 'Task updated successfully',
      task: updatedTask
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Error updating task' });
  }
});

// Delete task
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get current task to check project access
    const currentTask = await db.get('SELECT project_id FROM tasks WHERE id = ?', [id]);
    if (!currentTask) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check project access
    req.params.projectId = currentTask.project_id;
    await new Promise((resolve, reject) => {
      checkProjectAccess(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Check permissions (only project admin or system admin can delete tasks)
    if (req.user.role !== 'admin' && req.userProjectRole !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can delete tasks' });
    }

    // Delete task (this will cascade to related records)
    await db.run('DELETE FROM tasks WHERE id = ?', [id]);

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Error deleting task' });
  }
});

// Add comment to task
router.post('/:id/comments', authenticateToken, [
  body('content').trim().isLength({ min: 1, max: 1000 }).withMessage('Comment content is required (max 1000 chars)')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { content } = req.body;

    // Get current task to check project access
    const currentTask = await db.get('SELECT project_id FROM tasks WHERE id = ?', [id]);
    if (!currentTask) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check project access
    req.params.projectId = currentTask.project_id;
    await new Promise((resolve, reject) => {
      checkProjectAccess(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Add comment
    const result = await db.run(
      'INSERT INTO comments (content, task_id, author_id) VALUES (?, ?, ?)',
      [content, id, req.user.id]
    );

    const newComment = await db.get(`
      SELECT c.*, u.name as author_name, u.avatar as author_avatar
      FROM comments c
      LEFT JOIN users u ON c.author_id = u.id
      WHERE c.id = ?
    `, [result.id]);

    res.status(201).json({
      message: 'Comment added successfully',
      comment: newComment
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Error adding comment' });
  }
});

// Export tasks to CSV
router.get('/project/:projectId/export', authenticateToken, checkProjectAccess, async (req, res) => {
  try {
    const { projectId } = req.params;

    const tasks = await db.all(`
      SELECT 
        p.key || '-' || t.task_number as task_key,
        t.title,
        t.description,
        t.type,
        t.status,
        t.priority,
        assignee.name as assignee,
        reporter.name as reporter,
        t.due_date,
        t.created_at,
        t.updated_at
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users assignee ON t.assignee_id = assignee.id
      LEFT JOIN users reporter ON t.reporter_id = reporter.id
      WHERE t.project_id = ?
      ORDER BY t.task_number ASC
    `, [projectId]);

    // Convert to CSV
    const headers = ['Task Key', 'Title', 'Description', 'Type', 'Status', 'Priority', 'Assignee', 'Reporter', 'Due Date', 'Created', 'Updated'];
    const csvRows = [headers.join(',')];

    tasks.forEach(task => {
      const row = [
        task.task_key,
        `"${task.title.replace(/"/g, '""')}"`,
        `"${(task.description || '').replace(/"/g, '""')}"`,
        task.type,
        task.status,
        task.priority,
        task.assignee || '',
        task.reporter || '',
        task.due_date || '',
        task.created_at,
        task.updated_at
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=tasks.csv');
    res.send(csvContent);
  } catch (error) {
    console.error('Export tasks error:', error);
    res.status(500).json({ message: 'Error exporting tasks' });
  }
});

// Simple tasks endpoint for projects
router.get('/projects/:projectId/tasks', authenticateToken, async (req, res) => {
  try {
    await db.initialize();
    
    const { projectId } = req.params;
    
    // Get all tasks for the project
    const tasksResult = await db.query(`
      SELECT t.*, 
             u.username as assigned_to_name, 
             c.username as created_by_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN users c ON t.created_by = c.id
      WHERE t.project_id = $1
      ORDER BY t.created_at DESC
    `, [projectId]);
    
    res.json({
      success: true,
      tasks: tasksResult.rows || [],
      message: 'Tasks fetched successfully'
    });
    
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching tasks',
      error: error.message 
    });
  }
});

module.exports = router;
