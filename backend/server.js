const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Route imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const uploadRoutes = require('./routes/upload');

// Database initialization
const db = require('./config/database');

// Initialize database on startup
db.initialize().then(() => {
  console.log('Database initialized successfully');
}).catch(error => {
  console.error('Database initialization failed:', error);
});

const app = express();
const PORT = process.env.PORT || 3000;

// Global error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Security middleware
app.use(helmet());

// CORS configuration optimized for production - More permissive for Vercel
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (process.env.NODE_ENV === 'production') {
      // In production, allow Vercel domains and specified frontend URL
      const allowedOrigins = [
        process.env.FRONTEND_URL,
        'https://eternalgames-jira-9qft2hof2-mehmet-umut-kocs-projects.vercel.app',
        'https://eternalgames-jira-7m233svrv-mehmet-umut-kocs-projects.vercel.app',
        'https://eternalgames-jira-456d4vt3j-mehmet-umut-kocs-projects.vercel.app'
      ].filter(Boolean);
      
      // Also allow any vercel.app domain for this project
      if (origin.includes('eternalgames-jira') && origin.includes('vercel.app')) {
        return callback(null, true);
      }
      
      // Allow preview deployments
      if (origin.includes('vercel.app') && origin.includes('mehmet-umut-kocs-projects')) {
        return callback(null, true);
      }
      
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      console.log('CORS blocked origin:', origin);
      return callback(new Error('Not allowed by CORS'), false);
    } else {
      // Development - allow all localhost ports
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
      return callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

app.use(cors(corsOptions));

// Rate limiting optimized for production
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 200 : 1000, // Reasonable limit for production
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request timeout middleware for Vercel
app.use((req, res, next) => {
  // Set timeout to 25 seconds (less than Vercel's 30s limit)
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({ 
        error: 'Request timeout',
        message: 'The request took too long to process'
      });
    }
  }, 25000);
  
  res.on('finish', () => {
    clearTimeout(timeout);
  });
  
  next();
});

// Logging - more minimal in production
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Static files (for uploaded files) - Vercel optimized
const path = require('path');
const uploadPath = process.env.NODE_ENV === 'production' 
  ? '/tmp/uploads'  // Vercel temp directory
  : path.join(__dirname, 'uploads');

app.use('/uploads', express.static(uploadPath));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/upload', uploadRoutes);

// Error handling middleware - Enhanced for Vercel
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  
  // Handle specific error types
  if (err.code === 'ENOENT') {
    return res.status(500).json({ 
      message: 'File not found error',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
  
  if (err.code === 'SQLITE_ERROR') {
    return res.status(500).json({ 
      message: 'Database error',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Database unavailable'
    });
  }
  
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler for API routes only
app.use('/api/*', (req, res) => {
  console.log(`API route not found: ${req.method} ${req.path}`);
  res.status(404).json({ 
    message: 'API route not found',
    path: req.path,
    method: req.method
  });
});

// Health check with more detailed response
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: 'SQLite',
    version: '1.0.0'
  });
});

// Initialize database and start server - Vercel compatible
const initializeApp = async () => {
  try {
    await db.initialize();
    console.log('✅ Database initialized successfully');
    
    if (process.env.NODE_ENV !== 'production') {
      app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
      });
    } else {
      console.log('🚀 Server ready for production');
    }
  } catch (err) {
    console.error('❌ Failed to initialize database:', err);
    // Don't throw in production - let Vercel handle it
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
};

// Vercel serverless function compatibility
let dbInitialized = false;

const initDatabase = async () => {
  if (!dbInitialized) {
    try {
      await db.initialize();
      dbInitialized = true;
      console.log('✅ Database initialized for serverless');
      return true;
    } catch (err) {
      console.error('❌ Database init failed:', err);
      return false;
    }
  }
  return true;
};

// Middleware to ensure database is initialized
app.use(async (req, res, next) => {
  try {
    const dbReady = await initDatabase();
    if (!dbReady) {
      return res.status(500).json({ 
        error: 'Database initialization failed',
        message: 'Please try again in a moment'
      });
    }
    next();
  } catch (error) {
    console.error('Database middleware error:', error);
    return res.status(500).json({
      error: 'Database error',
      message: 'Failed to initialize database connection'
    });
  }
});

// Pre-flight OPTIONS handler for all routes
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Max-Age', '86400');
  res.status(200).end();
});

// Keep-alive endpoint for Vercel functions
app.get('/api/ping', (req, res) => {
  res.json({ 
    message: 'pong', 
    timestamp: new Date().toISOString(),
    serverless: true
  });
});

// Development server initialization
if (process.env.NODE_ENV !== 'production') {
  const startDevelopmentServer = async () => {
    try {
      await initDatabase();
      app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
      });
    } catch (err) {
      console.error('❌ Failed to start development server:', err);
      process.exit(1);
    }
  };
  
  startDevelopmentServer();
}

module.exports = app;
