import express from "express";
import dotenv from "dotenv";
import { connectMongo, connectRedis } from "./utils/dbconnect/dbconnect.js";
import novelRouter from "./router/novelRouter.js";
import galleryRouter from "./router/galleryRouter.js";
import postRouter from "./router/postRouter.js";
import commentRouter from "./router/commentRouter.js";
import episodeRouter from "./router/episodeRouter.js";
import emojiRouter from "./router/emojiRouter.js";
import customErrorHandler from "./utils/middleware/customErrorHandler.js";
import rateLimit from "./utils/middleware/rateLimit.js";

dotenv.config();

const app = express();

connectMongo();
connectRedis();

// Trust proxy for Nginx
app.set('trust proxy', true);

app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: 104857600 }));
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Headers", "O, Authorization, Accept, Content-Type, Origin, X-Access-Token, X-Requested-With");
    res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    next();
});

app.use(customErrorHandler);
app.use(rateLimit);

// Main API routes (accessed via /api/* through Nginx)
app.use("/novel/v1", novelRouter);
app.use("/gallery/v1", galleryRouter);
app.use("/post/v1", postRouter);
app.use("/comment/v1", commentRouter);
app.use("/episode/v1", episodeRouter);
app.use("/emoji/v1", emojiRouter);

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        service: 'API Gateway',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Root endpoint info
app.get('/', (req, res) => {
    res.status(200).json({
        service: 'MRS Playground API Gateway',
        version: '1.0.0',
        endpoints: {
            novel: '/novel/v1',
            gallery: '/gallery/v1',
            post: '/post/v1',
            comment: '/comment/v1',
            episode: '/episode/v1',
            emoji: '/emoji/v1'
        },
        health: '/health'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method
    });
});

app.listen(5000, '0.0.0.0', () => {
    console.log("API Gateway is running on port 5000");
});