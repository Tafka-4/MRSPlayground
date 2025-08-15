import express from 'express';
import dotenv from 'dotenv';
import { connectRedis, checkRedisConnection } from './utils/dbconnect/dbconnect.js';
import { initDatabase as initNovelDb } from './config/database.js';
import novelRouter from './router/novelRouter.js';
import episodeRouter from './router/episodeRouter.js';
import customErrorHandler from './utils/middleware/customErrorHandler.js';
import rateLimit from './utils/middleware/rateLimit.js';

dotenv.config();

const app = express();

const initializeConnections = async () => {
    if (process.env.NOVEL_USE_MYSQL === 'true') {
        await initNovelDb();
    }
    try {
        await connectRedis();
    } catch (error) {
        // continue without redis
    }
};

initializeConnections().catch(() => process.exit(1));

app.set('trust proxy', true);
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: 104857600 }));
app.use('/uploads', express.static('./uploads'));

app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'O, Authorization, Accept, Content-Type, Origin, X-Access-Token, X-Requested-With');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Origin', req.headers.origin as string);
    next();
});

app.use(rateLimit);

app.use('/novel/v1', novelRouter);
app.use('/episode/v1', episodeRouter);

app.get('/health', async (req: express.Request, res: express.Response) => {
    try {
        const mysqlStatus = 'connected';
        let redisStatus = 'disconnected';
        try {
            redisStatus = await checkRedisConnection() ? 'connected' : 'disconnected';
        } catch {
            redisStatus = 'error';
        }
        const isHealthy = mysqlStatus === 'connected';
        const status = isHealthy ? 'OK' : 'UNHEALTHY';
        const statusCode = isHealthy ? 200 : 503;
        res.status(statusCode).json({
            status,
            service: 'Novel API',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            dependencies: { mysql: 'novel-db', redis: redisStatus }
        });
    } catch (error) {
        res.status(503).json({
            status: 'ERROR',
            service: 'Novel API',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            error: 'Health check failed'
        });
    }
});

app.get('/', (req: express.Request, res: express.Response) => {
    res.status(200).json({
        service: 'Novel API',
        version: '1.0.0',
        endpoints: { novel: '/novel/v1', episode: '/episode/v1' },
        health: '/health'
    });
});

app.use(customErrorHandler);

app.use('*', (req: express.Request, res: express.Response) => {
    res.status(404).json({ error: 'Endpoint not found', path: req.originalUrl, method: req.method });
});

app.listen(5002, '0.0.0.0', () => {
    console.log('Novel API is running on port 5002');
});


