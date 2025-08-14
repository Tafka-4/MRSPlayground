import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { connectMongo, connectRedis, checkRedisConnection, mongoose } from './utils/dbconnect/dbconnect.js';
import emojiRouter from './router/emojiRouter.js';
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
const uploadsEmojis = path.resolve(process.cwd(), 'uploads', 'emojis');
app.use('/uploads/emojis', (req, res, next) => {
  const reqPath = req.path;
  if (reqPath.includes('..')) return res.status(400).end();
  const abs = path.resolve(uploadsEmojis, '.' + reqPath);
  if (!abs.startsWith(uploadsEmojis)) return res.status(400).end();
  express.static(uploadsEmojis)(req, res, next);
});

app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
	res.header('Access-Control-Allow-Credentials', 'true');
	res.header('Access-Control-Allow-Headers', 'O, Authorization, Accept, Content-Type, Origin, X-Access-Token, X-Requested-With');
	res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
	res.header('Access-Control-Allow-Origin', req.headers.origin as string);
	next();
});

app.use(rateLimit);

app.use('/emoji/v1', emojiRouter);

app.get('/health', async (req: express.Request, res: express.Response) => {
	try {
		const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
		let redisStatus = 'disconnected';
		try { redisStatus = await checkRedisConnection() ? 'connected' : 'disconnected'; } catch { redisStatus = 'error'; }
		const isHealthy = mongoStatus === 'connected';
		const status = isHealthy ? 'OK' : 'UNHEALTHY';
		const statusCode = isHealthy ? 200 : 503;
		res.status(statusCode).json({ status, service: 'Emoji API', timestamp: new Date().toISOString(), uptime: process.uptime(), dependencies: { mongodb: mongoStatus, redis: redisStatus } });
	} catch {
		res.status(503).json({ status: 'ERROR', service: 'Emoji API', timestamp: new Date().toISOString(), uptime: process.uptime(), error: 'Health check failed' });
	}
});

app.get('/', (req: express.Request, res: express.Response) => {
	res.status(200).json({ service: 'Emoji API', version: '1.0.0', endpoints: { emoji: '/emoji/v1' }, health: '/health' });
});

app.use(customErrorHandler);

app.use('*', (req: express.Request, res: express.Response) => {
	res.status(404).json({ error: 'Endpoint not found', path: req.originalUrl, method: req.method });
});

app.listen(5005, '0.0.0.0', () => {
	console.log('Emoji API is running on port 5005');
});


