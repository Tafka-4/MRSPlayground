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

redisClient.on('error', (error) => {
    console.error('Redis 클라이언트 오류:', error);
});

redisClient.on('connect', () => {
    console.log('Redis 클라이언트 연결됨');
});

redisClient.on('ready', () => {
    console.log('Redis 클라이언트 준비됨');
});

redisClient.on('end', () => {
    console.log('Redis 클라이언트 연결 종료됨');
});

redisClient.on('reconnecting', () => {
    console.log('Redis 클라이언트 재연결 시도 중...');
});

export const checkRedisConnection = async (): Promise<boolean> => {
    try {
        if (!redisClient.isOpen) {
            return false;
        }
        const result = await redisClient.ping();
        return result === 'PONG';
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

            if (redisClient.isOpen) {
                try {
                    await redisClient.disconnect();
                } catch (disconnectError) {
                    console.warn('기존 Redis 연결 정리 중 오류:', disconnectError);
                }
            }

                await redisClient.connect();

            const isConnected = await checkRedisConnection();
            if (isConnected) {
                console.log('Redis 연결 성공!');
                return;
            }

            throw new Error('Redis ping 실패');
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
                console.warn('Redis 연결 해제 오류:', disconnectError);
            }

            await new Promise((resolve) => setTimeout(resolve, retryInterval));
        }
    }
};

export const connectRedis = async () => {
    try {
        console.log('Redis 연결 초기화 시작...');
        await waitForRedis();
        console.log('Redis 연결 완료');
    } catch (error) {
        console.error('Redis 연결 실패:', error);
        throw error;
    }
};

export const disconnectRedis = async () => {
    try {
        if (redisClient.isOpen) {
            await redisClient.disconnect();
            console.log('Redis 연결이 정상적으로 종료되었습니다');
        }
    } catch (error) {
        console.error('Redis 연결 종료 중 오류:', error);
    }
};

// 프로세스 종료 시 Redis 연결 정리
process.on('SIGINT', disconnectRedis);
process.on('SIGTERM', disconnectRedis);
