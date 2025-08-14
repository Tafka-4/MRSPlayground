import dotenv from 'dotenv';
import redis from 'redis';
import mongoose from 'mongoose';

dotenv.config();

const redisConfig: any = {
	url: process.env.REDIS_URL || 'redis://redis:6379',
	socket: { connectTimeout: 10000, lazyConnect: true, keepAlive: true, reconnectDelayOnFailover: 1000, maxRetriesPerRequest: 3 },
	retryDelayOnFailover: 1000,
	maxRetriesPerRequest: 3,
	lazyConnect: true
};

if (process.env.REDIS_PASSWORD) {
	redisConfig.password = process.env.REDIS_PASSWORD;
}

const mongoConfigOptions: mongoose.ConnectOptions = { serverSelectionTimeoutMS: 10000, socketTimeoutMS: 45000 };

const redisClient = redis.createClient(redisConfig);

let isReconnecting = false;

redisClient.on('error', async () => {
	if (!isReconnecting && !redisClient.isOpen) {
		isReconnecting = true;
		setTimeout(async () => {
			try {
				await redisClient.connect();
				isReconnecting = false;
			} catch {
				isReconnecting = false;
			}
		}, 5000);
	}
});

const checkRedisConnection = async (): Promise<boolean> => {
	try {
		if (!redisClient.isOpen) return false;
		const result = await redisClient.ping();
		return result === 'PONG';
	} catch {
		return false;
	}
};

const waitForRedis = async (maxRetries: number = 30, retryInterval: number = 2000): Promise<void> => {
	let retries = 0;
	while (retries < maxRetries) {
		try {
			if (redisClient.isOpen) {
				try { await redisClient.disconnect(); } catch {}
			}
			await redisClient.connect();
			const isConnected = await checkRedisConnection();
			if (isConnected) return;
			throw new Error('Redis ping failed');
		} catch (error) {
			retries++;
			if (retries >= maxRetries) throw error instanceof Error ? error : new Error(String(error));
			try { if (redisClient.isOpen) await redisClient.disconnect(); } catch {}
			await new Promise((resolve) => setTimeout(resolve, retryInterval));
		}
	}
};

const connectRedis = async () => { await waitForRedis(); };

const connectMongo = async () => {
	let mongoUri = process.env.MONGO_URI;
	if (!mongoUri) {
		if (process.env.MONGO_USER && process.env.MONGO_PW) {
			mongoUri = `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PW}@mongodb:27017/mrsplayground?authSource=admin`;
		} else {
			mongoUri = `mongodb://mongodb:27017/mrsplayground?authSource=admin`;
		}
	}
	await mongoose.connect(mongoUri, mongoConfigOptions);
};

process.on('SIGINT', async () => { if (redisClient.isOpen) await redisClient.disconnect(); process.exit(0); });
process.on('SIGTERM', async () => { if (redisClient.isOpen) await redisClient.disconnect(); process.exit(0); });

export { redisClient, mongoose, connectRedis, connectMongo, checkRedisConnection };


