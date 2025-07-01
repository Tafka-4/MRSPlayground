import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { createServer, IncomingMessage } from 'http';
import { Socket } from 'net';
import url from 'url';
import { initDatabase } from './config/database.js';
import { connectRedis } from './config/redis.js';
import userRoutes from './routes/userRoutes.js';
import authRoutes from './routes/authRoutes.js';
import logRoutes from './routes/logRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { identify } from './middleware/identify.js';
import LogWebSocketServer from './websocket/logSocket.js';
import KeygenWebSocketServer from './websocket/keygenSocket.js';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001');

app.set('trust proxy', true);

app.use(
    cors({
        origin: true,
        credentials: true
    })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(identify);

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// API v1 routes
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/logs', logRoutes);
app.use('/api/v1/contact', contactRoutes);
app.use('/api/v1/feedback', feedbackRoutes);

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
            logs: '/api/v1/logs',
            contact: '/api/v1/contact',
            feedback: '/api/v1/feedback',
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

const makeUploadDir = () => {
    const uploadDir = path.join(process.cwd(), 'uploads/profile');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
};

const startServer = async () => {
    try {
        await initDatabase();
        await connectRedis();

        const server = createServer(app);

        const logWebSocketServer = new LogWebSocketServer();
        const keygenWebSocketServer = new KeygenWebSocketServer();

        // HTTP Upgrade... It was really hard to find this...
        server.on(
            'upgrade',
            (request: IncomingMessage, socket: Socket, head: Buffer) => {
                const pathname = request.url
                    ? url.parse(request.url).pathname
                    : undefined;

                if (pathname === '/ws/keygen') {
                    keygenWebSocketServer.wss.handleUpgrade(
                        request,
                        socket,
                        head,
                        (ws) => {
                            keygenWebSocketServer.wss.emit(
                                'connection',
                                ws,
                                request
                            );
                        }
                    );
                } else if (pathname === '/ws/logs') {
                    logWebSocketServer.wss.handleUpgrade(
                        request,
                        socket,
                        head,
                        (ws) => {
                            logWebSocketServer.wss.emit(
                                'connection',
                                ws,
                                request
                            );
                        }
                    );
                } else {
                    console.log(
                        `[WebSocket] Unknown path for upgrade: ${pathname}, destroying socket.`
                    );
                    socket.destroy();
                }
            }
        );

        server.listen(PORT, '0.0.0.0', () => {
            console.log(`User Service running on port ${PORT}`);
            console.log(
                `WebSocket endpoint available at ws://localhost:${PORT}/ws/logs`
            );
            console.log(
                `Keygen WebSocket endpoint available at ws://localhost:${PORT}/ws/keygen`
            );
        });

        process.on('SIGTERM', () => {
            console.log('SIGTERM received, shutting down gracefully');
            logWebSocketServer.stop();
            keygenWebSocketServer.stop();
            server.close(() => {
                process.exit(0);
            });
        });

        process.on('SIGINT', () => {
            console.log('SIGINT received, shutting down gracefully');
            logWebSocketServer.stop();
            keygenWebSocketServer.stop();
            server.close(() => {
                process.exit(0);
            });
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
makeUploadDir();
