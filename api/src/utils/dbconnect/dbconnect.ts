import dotenv from "dotenv";
import redis from "redis";
import mongoose from "mongoose";
dotenv.config();

console.log('API Gateway Redis 연결 설정:');
console.log('REDIS_URL:', process.env.REDIS_URL || 'redis://redis:6379');
console.log('REDIS_PASSWORD 설정됨:', !!process.env.REDIS_PASSWORD);

const redisConfig: any = {
    url: process.env.REDIS_URL || 'redis://redis:6379',
    socket: {
        connectTimeout: 10000,
        lazyConnect: true,
        keepAlive: true,
        reconnectDelayOnFailover: 1000,
        maxRetriesPerRequest: 3
    },
    retryDelayOnFailover: 1000,
    maxRetriesPerRequest: 3,
    lazyConnect: true
};

if (process.env.REDIS_PASSWORD) {
    redisConfig.password = process.env.REDIS_PASSWORD;
    console.log('Redis 비밀번호로 연결 시도');
} else {
    console.log('Redis 비밀번호 없이 연결 시도');
}

const mongoConfigOptions: mongoose.ConnectOptions = {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
};

const redisClient = redis.createClient(redisConfig);

let isReconnecting = false;

redisClient.on('error', (error) => {
    console.error('Redis 클라이언트 오류:', error);
    
    if (!isReconnecting && !redisClient.isOpen) {
        isReconnecting = true;
        setTimeout(async () => {
            try {
                console.log('Redis 클라이언트 재연결 시도 중...');
                await redisClient.connect();
                isReconnecting = false;
            } catch (reconnectError) {
                console.error('Redis 재연결 실패:', reconnectError);
                isReconnecting = false;
            }
        }, 5000);
    }
});

redisClient.on('connect', () => {
    console.log('Redis 클라이언트 연결됨');
    isReconnecting = false;
});

redisClient.on('ready', () => {
    console.log('Redis 클라이언트 준비됨');
});

redisClient.on('end', () => {
    console.log('Redis 클라이언트 연결 종료됨');
});

redisClient.on('reconnecting', () => {
    console.log('Redis 클라이언트 자동 재연결 시도 중...');
});

const checkRedisConnection = async (): Promise<boolean> => {
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

const waitForRedis = async (
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

const connectRedis = async () => {
    try {
        console.log('API Gateway Redis 연결 초기화 시작...');
        await waitForRedis();
        console.log('API Gateway Redis 연결 완료');
    } catch (error) {
        console.error('API Gateway Redis 연결 실패:', error);
    }
};

const connectMongo = async () => {
    try {
        let mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            if (process.env.MONGO_USER && process.env.MONGO_PW) {
                mongoUri = `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PW}@mongodb:27017/mrsplayground?authSource=admin`;
            } else {
                mongoUri = `mongodb://mongodb:27017/mrsplayground?authSource=admin`;
            }
        }
        await mongoose.connect(mongoUri, mongoConfigOptions);
    } catch (err) {
        console.error("MongoDB connection error:", err);
        throw err;
    }
};

mongoose.connection.on('connected', () => {
    console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('Mongoose disconnected from MongoDB');
});

const disconnectRedis = async () => {
    try {
        if (redisClient.isOpen) {
            await redisClient.disconnect();
            console.log('API Gateway Redis 연결이 정상적으로 종료되었습니다');
        }
    } catch (error) {
        console.error('API Gateway Redis 연결 종료 중 오류:', error);
    }
};

process.on('SIGINT', async () => {
    console.log('API Gateway 종료 신호 받음 (SIGINT)');
    await disconnectRedis();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('API Gateway 종료 신호 받음 (SIGTERM)');
    await disconnectRedis();
    process.exit(0);
});

export { redisClient, mongoose, connectRedis, connectMongo, checkRedisConnection, disconnectRedis };
