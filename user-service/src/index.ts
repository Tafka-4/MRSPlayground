import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { initDatabase } from './config/database.js';
import { connectRedis } from './config/redis.js';
import userRoutes from './routes/userRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001');

app.set('trust proxy', true);

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// API v1 routes
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/auth', authRoutes);

app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    service: 'User Service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/v1/', (req, res) => {
  res.status(200).json({
    service: 'MRS Playground User API Service',
    version: '1.0.0',
    endpoints: {
      users: '/api/v1/users',
      auth: '/api/v1/auth',
      health: '/api/v1/health'
    }
  });
});

app.use(errorHandler);

app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

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