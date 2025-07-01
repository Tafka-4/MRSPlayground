import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

console.log('Redis 연결 설정:');
console.log('REDIS_URL:', process.env.REDIS_URL || 'redis://redis:6379');
console.log('REDIS_PASSWORD 설정됨:', !!process.env.REDIS_PASSWORD);

const redisConfig: any = {
    url: process.env.REDIS_URL || 'redis://redis:6379',
    socket: {
        connectTimeout: 10000
    }
};

if (process.env.REDIS_PASSWORD) {
    redisConfig.password = process.env.REDIS_PASSWORD;
    console.log('Redis 비밀번호로 연결 시도');
} else {
    console.log('Redis 비밀번호 없이 연결 시도');
}

export const redisClient = createClient(redisConfig);

redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
    console.log('Redis 클라이언트가 서버에 연결을 시도하고 있습니다...');
});

redisClient.on('ready', () => {
    console.log('Redis 클라이언트가 준비되었습니다!');
});

redisClient.on('end', () => {
    console.log('Redis 연결이 종료되었습니다.');
});

export const checkRedisConnection = async (): Promise<boolean> => {
    try {
        if (!redisClient.isOpen) {
            return false;
        }
        await redisClient.ping();
        return true;
    } catch (error) {
        console.error('Redis 연결 확인 실패:', error);
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
            console.error(`Redis 연결 오류 (시도 ${retries}/${maxRetries}):`, error instanceof Error ? error.message : String(error));

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
