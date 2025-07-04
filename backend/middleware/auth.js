const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Get user from database to ensure they still exist and get current role
    const user = await db.get('SELECT * FROM users WHERE id = ?', [decoded.id]);
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

const authorizeRole = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
};

const checkProjectAccess = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.params.id || req.body.projectId;
    
    if (!projectId) {
      return res.status(400).json({ message: 'Project ID required' });
    }

    // Check if user is admin (can access all projects)
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user is member of the project
    const membership = await db.get(
      'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
      [projectId, req.user.id]
    );

    if (!membership) {
      return res.status(403).json({ message: 'Access denied to this project' });
    }

    req.userProjectRole = membership.role;
    next();
  } catch (error) {
    console.error('Project access check error:', error);
    res.status(500).json({ message: 'Error checking project access' });
  }
};

module.exports = {
  authenticateToken,
  authorizeRole,
  checkProjectAccess
};
