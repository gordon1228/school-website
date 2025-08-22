import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import dotenv from 'dotenv';
import path from 'path';

// Import database configuration
import { initializeDatabase, testConnection } from './config/database';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
  name: process.env.SESSION_NAME || 'sessionId',
}));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check with database status
app.get('/health', async (req, res) => {
  try {
    const dbConnected = await testConnection();
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      database: dbConnected ? 'Connected' : 'Disconnected'
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'ERROR', 
      timestamp: new Date().toISOString(),
      database: 'Error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Database test endpoint
app.get('/test-db', async (req, res) => {
  try {
    const dbConnected = await testConnection();
    if (dbConnected) {
      res.json({ 
        success: true, 
        message: 'Database connection successful',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Database connection failed'
      });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Database test error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Routes will be added here
app.get('/', (req, res) => {
  res.json({ 
    message: 'School Website API Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      testDb: '/test-db'
    }
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({ 
    success: false,
    message: 'Something went wrong!',
    ...(process.env.NODE_ENV === 'development' && { error: err.message })
  });
});

// Initialize server with database
const startServer = async () => {
  try {
    // Initialize database connection
    await initializeDatabase();
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📧 Environment: ${process.env.NODE_ENV}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/health`);
      console.log(`🔍 Database test: http://localhost:${PORT}/test-db`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  try {
    const { closeDatabase } = await import('./config/database');
    await closeDatabase();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Start the server
startServer();