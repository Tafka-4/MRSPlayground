import express from "express";
import dotenv from "dotenv";
import { connectMongo, connectRedis } from "./utils/dbconnect/dbconnect.js";
import userRouter from "./router/userRouter.js";
import authRouter from "./router/authRouter.js";
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

app.use("/user/v1", userRouter);
app.use("/auth/v1", authRouter);
app.use("/novel/v1", novelRouter);
app.use("/gallery/v1", galleryRouter);
app.use("/post/v1", postRouter);
app.use("/comment/v1", commentRouter);
app.use("/episode/v1", episodeRouter);
app.use("/emoji/v1", emojiRouter);

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});