import dotenv from "dotenv";
import redis from "redis";
import mongoose from "mongoose";
dotenv.config();

const redisConfig: redis.RedisClientOptions = {
    url: process.env.REDIS_URL || `redis://redis:6379`,
    password: process.env.REDIS_PASSWORD,
    legacyMode: false,
};

const mongoConfigOptions: mongoose.ConnectOptions = {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
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
        const mongoUri = process.env.MONGO_URI ||
                        `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PW}@mongodb:27017/mrsplayground?authSource=admin`;
        await mongoose.connect(mongoUri, mongoConfigOptions);
        console.log("MongoDB connected");
    } catch (err) {
        console.error("MongoDB connection error:", err);
        setTimeout(connectMongo, 5000);
    }
};

// MongoDB connection event handlers
mongoose.connection.on('connected', () => {
    console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('Mongoose disconnected from MongoDB');
});

export { redisClient, mongoose, connectRedis, connectMongo };
