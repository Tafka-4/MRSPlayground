import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

export const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://redis:6379'
});

redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
});

export const checkRedisConnection = async (): Promise<boolean> => {
    try {
        if (!redisClient.isOpen) {
            return false;
        }
        await redisClient.ping();
        return true;
    } catch (error) {
        return false;
    }
};

export const waitForRedis = async (
    maxRetries: number = 30,
    retryInterval: number = 2000
): Promise<void> => {
    let retries = 0;

    while (retries < maxRetries) {
        try {
            console.log(`Redis 연결 시도 중... (${retries + 1}/${maxRetries})`);

            if (!redisClient.isOpen) {
                await redisClient.connect();
            }

            const isConnected = await checkRedisConnection();
            if (isConnected) {
                console.log('Redis 연결 성공!');
                return;
            }

            throw new Error('Redis 연결 실패');
        } catch (error) {
            retries++;

            if (retries >= maxRetries) {
                console.error('Redis 연결 최대 재시도 횟수 초과:', error);
                throw new Error(
                    `Redis 연결에 실패했습니다. ${maxRetries}번 재시도 후에도 연결할 수 없습니다.`
                );
            }

            console.log(
                `Redis 연결 실패. ${
                    retryInterval / 1000
                }초 후 재시도... (${retries}/${maxRetries})`
            );

            try {
                if (redisClient.isOpen) {
                    await redisClient.disconnect();
                }
            } catch (disconnectError) {
                console.error('Redis 연결 해제 오류:', disconnectError);
            }

            await new Promise((resolve) => setTimeout(resolve, retryInterval));
        }
    }
};

export const connectRedis = async () => {
    try {
        await waitForRedis();
        console.log('Connected to Redis successfully');
    } catch (error) {
        console.error('Redis connection failed:', error);
        throw error;
    }
};
