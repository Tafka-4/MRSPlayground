import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './config/database.js';
import { connectRedis } from './config/redis.js';
import userRoutes from './routes/userRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001');

// Trust proxy for Nginx
app.set('trust proxy', true);

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes - User and Auth services
app.use('/api/users', userRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    service: 'User Service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root endpoint info
app.get('/', (req, res) => {
  res.status(200).json({
    service: 'MRS Playground User Service',
    version: '1.0.0',
    endpoints: {
      users: '/api/users',
      health: '/health'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Error handling (must be last)
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    await initDatabase();
    await connectRedis();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`User Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer(); 