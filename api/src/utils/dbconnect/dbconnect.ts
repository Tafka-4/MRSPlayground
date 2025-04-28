import dotenv from "dotenv";
import redis from "redis";
import mongoose from "mongoose";
dotenv.config();

const redisConfig: redis.RedisClientOptions = {
    url: `redis://:${process.env.REDIS_PW}@redis:6379`,
    legacyMode: false,
};

const mongoConfigOptions: mongoose.ConnectOptions = {
    serverSelectionTimeoutMS: 5000,
};

const redisClient = redis.createClient(redisConfig);

const connectRedis = async () => {
    try {
        await redisClient.connect();
        console.log("Redis connected");
    } catch (err) {
        console.error("Redis connection error:", err);
        setTimeout(connectRedis, 5000);
    }
};

const connectMongo = async () => {
    try {
        await mongoose.connect(
            `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PW}@mongodb:27017/myDatabase?retryWrites=true&w=majority`, 
            mongoConfigOptions
        );
        console.log("MongoDB connected");
    } catch (err) {
        console.error("MongoDB connection error:", err);
        setTimeout(connectMongo, 5000);
    }
};

export { redisClient, mongoose, connectRedis, connectMongo };
