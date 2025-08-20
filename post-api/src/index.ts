import express from 'express';
import dotenv from 'dotenv';
import { connectMongo, connectRedis, checkRedisConnection, mongoose } from './utils/dbconnect/dbconnect.js';
import postRouter from './router/postRouter.js';
import customErrorHandler from './utils/middleware/customErrorHandler.js';
import rateLimit from './utils/middleware/rateLimit.js';

dotenv.config();

const app = express();

const initializeConnections = async () => {
    try { await connectMongo(); } catch { process.exit(1); }
    try { await connectRedis(); } catch {}
};

initializeConnections().catch(() => process.exit(1));

app.set('trust proxy', true);
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: 104857600 }));
app.use('/uploads', express.static('./uploads'));

app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    const baseDomain = process.env.BASE_DOMAIN || 'magicresearches.com';
    const schemes = process.env.NODE_ENV === 'production' ? ['https'] : ['https', 'http'];
    const allowedOrigins = new Set(
        schemes.flatMap((scheme) => [
            `${scheme}://dev.${baseDomain}`,
            `${scheme}://novel.${baseDomain}`,
            `${scheme}://community.${baseDomain}`,
            `${scheme}://emoji.${baseDomain}`
        ])
    );
    const origin = req.headers.origin as string | undefined;
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'O, Authorization, Accept, Content-Type, Origin, X-Access-Token, X-Requested-With');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    if (origin && allowedOrigins.has(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Vary', 'Origin');
    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }
    next();
});

app.use(rateLimit);

app.use('/api/v1/posts', postRouter);

app.get('/api/v1/health', async (req: express.Request, res: express.Response) => {
    try {
        const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
        let redisStatus = 'disconnected';
        try { redisStatus = await checkRedisConnection() ? 'connected' : 'disconnected'; } catch { redisStatus = 'error'; }
        const isHealthy = mongoStatus === 'connected';
        const status = isHealthy ? 'OK' : 'UNHEALTHY';
        const statusCode = isHealthy ? 200 : 503;
        res.status(statusCode).json({ status, service: 'Post API', timestamp: new Date().toISOString(), uptime: process.uptime(), dependencies: { mongodb: mongoStatus, redis: redisStatus } });
    } catch {
        res.status(503).json({ status: 'ERROR', service: 'Post API', timestamp: new Date().toISOString(), uptime: process.uptime(), error: 'Health check failed' });
    }
});

app.get('/api/v1/', (req: express.Request, res: express.Response) => {
    res.status(200).json({ service: 'Post API', version: '1.0.0', endpoints: { posts: '/api/v1/posts', health: '/api/v1/health' } });
});

app.use(customErrorHandler);

app.use('*', (req: express.Request, res: express.Response) => {
    res.status(404).json({ error: 'Endpoint not found', path: req.originalUrl, method: req.method });
});

app.listen(5003, '0.0.0.0', () => {
    console.log('Post API is running on port 5003');
});


