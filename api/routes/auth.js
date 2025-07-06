const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');

const router = express.Router();

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Test route for debugging
router.get('/test', (req, res) => {
  res.json({ message: 'Auth routes working', timestamp: new Date().toISOString() });
});

// Test register route
router.post('/register-test', (req, res) => {
  res.json({ message: 'Register route working', body: req.body, timestamp: new Date().toISOString() });
});

// Simple register route for testing
router.post('/register-simple', async (req, res) => {
  res.json({ message: 'Simple register route working', body: req.body, timestamp: new Date().toISOString() });
});

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Email, password, and name are required' });
    }

    // Check if user already exists
    const existingUser = await db.get('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Check user limit (max 10 users)
    const userCount = await db.get('SELECT COUNT(*) as count FROM users');
    if (userCount.count >= 10) {
      return res.status(400).json({ message: 'Maximum user limit (10) reached' });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Determine role (first user is admin)
    const role = userCount.count === 0 ? 'admin' : 'member';

    // Create user
    const result = await db.query(
      'INSERT INTO users (email, password_hash, username, role) VALUES ($1, $2, $3, $4) RETURNING id',
      [email, hashedPassword, name, role]
    );

    const userId = result.rows[0].id;

    // Generate JWT token
    const token = jwt.sign(
      { id: userId, email, role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: userId,
        email,
        name,
        role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Error creating user' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Login attempt for:', email);

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user
    const user = await db.get('SELECT * FROM users WHERE email = $1', [email]);
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    console.log('✅ User found:', user.email, 'Role:', user.role);

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      console.log('❌ Invalid password for:', email);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    console.log('✅ Password valid for:', email);

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    console.log('✅ Token generated for:', email);

    res.json({
      message: '🎉 Login successful!',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('💥 Login error:', error);
    res.status(500).json({ message: 'Error during login' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.get(
      'SELECT id, email, username, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ 
      user: {
        id: user.id,
        email: user.email,
        name: user.username,
        role: user.role,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Error fetching user data' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, avatar } = req.body;
    const updates = [];
    const values = [];

    if (name) {
      updates.push('username = $' + (values.length + 1));
      values.push(name);
    }

    if (avatar !== undefined) {
      updates.push('avatar = $' + (values.length + 1));
      values.push(avatar);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    values.push(req.user.id);

    await db.query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length}`,
      values
    );

    const updatedUser = await db.get(
      'SELECT id, email, username, role FROM users WHERE id = $1',
      [req.user.id]
    );

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.username,
        role: updatedUser.role
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
});

// Change password
router.put('/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new passwords are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    // Get current user with password
    const user = await db.get('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    
    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, req.user.id]
    );

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ message: 'Error changing password' });
  }
});

// Forgot password - generate reset token
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if user exists
    const user = await db.get('SELECT id, email, username FROM users WHERE email = $1', [email]);
    if (!user) {
      // Don't reveal if user exists for security
      return res.json({ message: 'If this email exists, you will receive a password reset link.' });
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

    // Delete any existing tokens for this user
    await db.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);

    // Save reset token
    await db.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiresAt.toISOString()]
    );

    // In a real application, you would send an email here
    console.log(`Password reset token for ${email}: ${token}`);

    res.json({ 
      message: 'If this email exists, you will receive a password reset link.',
      // Remove this in production - only for testing
      token: token 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Error processing password reset request' });
  }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: 'Token and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Find valid token
    const resetToken = await db.get(`
      SELECT prt.*, u.email, u.username 
      FROM password_reset_tokens prt 
      JOIN users u ON prt.user_id = u.id 
      WHERE prt.token = $1 AND prt.expires_at > CURRENT_TIMESTAMP AND prt.used = FALSE
    `, [token]);

    if (!resetToken) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update password
    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, resetToken.user_id]
    );

    // Mark token as used
    await db.query(
      'UPDATE password_reset_tokens SET used = TRUE WHERE id = $1',
      [resetToken.id]
    );

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
});

// Verify reset token (for frontend validation)
router.get('/verify-reset-token/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const resetToken = await db.get(`
      SELECT prt.*, u.email 
      FROM password_reset_tokens prt 
      JOIN users u ON prt.user_id = u.id 
      WHERE prt.token = $1 AND prt.expires_at > CURRENT_TIMESTAMP AND prt.used = FALSE
    `, [token]);

    if (!resetToken) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    res.json({ 
      message: 'Token is valid',
      email: resetToken.email 
    });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({ message: 'Error verifying token' });
  }
});

module.exports = router;
