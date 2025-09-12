import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { connectRedis, checkRedisConnection, mongoose } from './utils/dbconnect/dbconnect.js';
import novelRouter from './router/novelRouter.js';
import episodeRouter from './router/episodeRouter.js';
import noticeRouter from './router/noticeRouter.js';
import customErrorHandler from './utils/middleware/customErrorHandler.js';
import rateLimit from './utils/middleware/rateLimit.js';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '5002');

const initializeConnections = async () => {
    try {
        await connectRedis();
    } catch (error) {}
    try {
        const mongoUrl = process.env.MONGO_URL || 'mongodb://mongo:27017/novelapi';
        await mongoose.connect(mongoUrl, { dbName: process.env.MONGO_DB || 'novelapi' } as any);
        console.log('MongoDB connected');
    } catch (error) {
        console.error('MongoDB connection failed');
        process.exit(1);
    }
};

initializeConnections().catch(() => process.exit(1));

app.set('trust proxy', true);
app.use(
    cors({
        origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
            const baseDomain = process.env.BASE_DOMAIN || 'magicresearches.com';
            const schemes = process.env.NODE_ENV === 'production' ? ['https'] : ['https', 'http'];
            const allowed = new Set(
                schemes.flatMap((scheme) => [
                    `${scheme}://dev.${baseDomain}`,
                    `${scheme}://user.${baseDomain}`,
                    `${scheme}://novel.${baseDomain}`,
                    `${scheme}://community.${baseDomain}`,
                    `${scheme}://emoji.${baseDomain}`,
                    `${scheme}://${baseDomain}`
                ])
            );
            if (!origin) return callback(null, true);
            if (allowed.has(origin)) return callback(null, true);
            return callback(null, false);
        },
        credentials: true
    })
);

app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'O, Authorization, Accept, Content-Type, Origin, X-Access-Token, X-Requested-With, X-Request-ID');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    if (req.headers.origin) {
        res.header('Access-Control-Allow-Origin', req.headers.origin as string);
    }
    res.header('Vary', 'Origin');
    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }
    next();
});

app.use(cookieParser());
app.use(express.json({ limit: 104857600 }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('./uploads'));

app.use(rateLimit);

app.use('/api/v1/novels', novelRouter);
app.use('/api/v1/episodes', episodeRouter);
app.use('/api/v1/notices', noticeRouter);

app.get('/api/v1/health', async (req: express.Request, res: express.Response) => {
    try {
        let redisStatus = 'disconnected';
        try {
            redisStatus = await checkRedisConnection() ? 'connected' : 'disconnected';
        } catch {
            redisStatus = 'error';
        }
        const isHealthy = true;
        const status = isHealthy ? 'OK' : 'UNHEALTHY';
        const statusCode = isHealthy ? 200 : 503;
        res.status(statusCode).json({
            status,
            service: 'Novel API',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            dependencies: { redis: redisStatus }
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

app.get('/api/v1/', (req: express.Request, res: express.Response) => {
    res.status(200).json({
        service: 'Novel API',
        version: '1.0.0',
        endpoints: {
            novels: '/api/v1/novels',
            episodes: '/api/v1/episodes',
            health: '/api/v1/health'
        }
    });
});

app.use(customErrorHandler);

app.use('*', (req: express.Request, res: express.Response) => {
    res.status(404).json({ error: 'Endpoint not found', path: req.originalUrl, method: req.method });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Novel API is running on port ${PORT}`);
});


