const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const { authenticateToken, checkProjectAccess } = require('../middleware/auth');

const router = express.Router();

// Vercel'de uploads directory için optimize edilmiş path
const uploadsDir = process.env.NODE_ENV === 'production' 
  ? '/tmp/uploads'  // Vercel temp directory
  : path.join(__dirname, '..', 'uploads');

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, name + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, documents, and text files are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 3 // Maximum 3 files per upload
  }
});

// Upload files to task
router.post('/task/:taskId', authenticateToken, upload.array('files', 3), async (req, res) => {
  try {
    const { taskId } = req.params;

    // Get task to check project access
    const task = await db.get('SELECT project_id FROM tasks WHERE id = ?', [taskId]);
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

    // Check permissions (readers cannot upload files)
    if (req.userProjectRole === 'reader') {
      return res.status(403).json({ message: 'Readers cannot upload files' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    // Check current attachment count
    const currentCount = await db.get(
      'SELECT COUNT(*) as count FROM attachments WHERE task_id = ?',
      [taskId]
    );

    if (currentCount.count + req.files.length > 3) {
      // Clean up uploaded files
      req.files.forEach(file => {
        fs.unlinkSync(file.path);
      });
      return res.status(400).json({ message: 'Maximum 3 files allowed per task' });
    }

    // Save file information to database
    const attachments = [];
    for (const file of req.files) {
      const result = await db.run(`
        INSERT INTO attachments (filename, original_name, size, mimetype, task_id, uploaded_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [file.filename, file.originalname, file.size, file.mimetype, taskId, req.user.id]);

      const attachment = await db.get(`
        SELECT a.*, u.name as uploaded_by_name
        FROM attachments a
        LEFT JOIN users u ON a.uploaded_by = u.id
        WHERE a.id = ?
      `, [result.id]);

      attachments.push(attachment);
    }

    res.status(201).json({
      message: 'Files uploaded successfully',
      attachments
    });
  } catch (error) {
    console.error('Upload error:', error);

    // Clean up uploaded files in case of error
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File size too large. Maximum 5MB per file.' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: 'Too many files. Maximum 3 files per upload.' });
    }
    if (error.message.includes('Invalid file type')) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: 'Error uploading files' });
  }
});

// Download file
router.get('/file/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get attachment info
    const attachment = await db.get(`
      SELECT a.*, t.project_id
      FROM attachments a
      JOIN tasks t ON a.task_id = t.id
      WHERE a.id = ?
    `, [id]);

    if (!attachment) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Check project access
    req.params.projectId = attachment.project_id;
    await new Promise((resolve, reject) => {
      checkProjectAccess(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const filePath = path.join(uploadsDir, attachment.filename);

    // Check if file exists on disk
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found on disk' });
    }

    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.original_name}"`);
    res.setHeader('Content-Type', attachment.mimetype);

    // Send file
    res.sendFile(filePath);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ message: 'Error downloading file' });
  }
});

// Delete attachment
router.delete('/attachment/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get attachment info
    const attachment = await db.get(`
      SELECT a.*, t.project_id
      FROM attachments a
      JOIN tasks t ON a.task_id = t.id
      WHERE a.id = ?
    `, [id]);

    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }

    // Check project access
    req.params.projectId = attachment.project_id;
    await new Promise((resolve, reject) => {
      checkProjectAccess(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Check permissions (only uploader, project admin, or system admin can delete)
    if (req.user.id !== attachment.uploaded_by && 
        req.user.role !== 'admin' && 
        req.userProjectRole !== 'admin') {
      return res.status(403).json({ message: 'Only the uploader or administrators can delete attachments' });
    }

    // Delete from database
    await db.run('DELETE FROM attachments WHERE id = ?', [id]);

    // Delete file from disk
    const filePath = path.join(uploadsDir, attachment.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    console.error('Delete attachment error:', error);
    res.status(500).json({ message: 'Error deleting attachment' });
  }
});

// Get task attachments
router.get('/task/:taskId/attachments', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;

    // Get task to check project access
    const task = await db.get('SELECT project_id FROM tasks WHERE id = ?', [taskId]);
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

    const attachments = await db.all(`
      SELECT a.*, u.name as uploaded_by_name
      FROM attachments a
      LEFT JOIN users u ON a.uploaded_by = u.id
      WHERE a.task_id = ?
      ORDER BY a.created_at ASC
    `, [taskId]);

    res.json({ attachments });
  } catch (error) {
    console.error('Get attachments error:', error);
    res.status(500).json({ message: 'Error fetching attachments' });
  }
});

module.exports = router;
