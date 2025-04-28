import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import { createHmac } from "crypto";
import { mongoose, redisClient } from "../utils/dbconnect/dbconnect.js";
import User from "./userModel.js";
import novelError from "../utils/error/novelError.js";
import userError from "../utils/error/userError.js";
dotenv.config();

export interface INovel extends mongoose.Document {
    novelId: string;
    title: string;
    description: string;
    thumbnailImage: string;
    episodeCount: number;
    viewCount: number;
    likeCount: number;
    dislikeCount: number;
    favoriteCount: number;
    author: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    like(userId: string): Promise<void>;
    dislike(userId: string): Promise<void>;
    favorite(userId: string): Promise<void>;
    increaseViewCount(): Promise<void>;
    increaseEpisode(): Promise<void>;
    decreaseEpisode(): Promise<void>;
    uploadThumbnailImage(file: Express.Multer.File): Promise<string>;
    deleteThumbnailImage(): Promise<void>;
}

const novelSchema = new mongoose.Schema({
    novelId: { type: String, required: true, unique: true, default: uuidv4() },
    title: { type: String, required: true },
    description: { type: String, required: true },
    thumbnailImage: { type: String, required: true },
    episodeCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    likeCount: { type: Number, default: 0 },
    dislikeCount: { type: Number, default: 0 },
    favoriteCount: { type: Number, default: 0 },
    author: { type: String, required: true },
    status: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

const Novel = mongoose.model<INovel>("Novel", novelSchema);

novelSchema.pre("save", async function (next) {
    this.updatedAt = new Date();
    next();
});

novelSchema.pre("deleteOne", { document: true, query: false }, async function (next) {
    if (this.thumbnailImage) {
        fs.unlinkSync(this.thumbnailImage);
    }
    await redisClient.del(`${this.novelId}:likes`);
    await redisClient.del(`${this.novelId}:dislikes`);
    await redisClient.del(`${this.novelId}:favorites`);
    next();
});

novelSchema.methods.like = async function (userId: string): Promise<void> {
    const resultLike = await redisClient.sAdd(`${this.novelId}:likes`, userId);
    const resultDislike = await redisClient.sRem(`${this.novelId}:dislikes`, userId);
    if (resultDislike) {
        this.dislikeCount--;
    }
    if (!resultLike) {
        throw new novelError.NovelInteractionFailedError("Already liked");
    }
    this.likeCount++;
    await this.save();
};

novelSchema.methods.dislike = async function (userId: string): Promise<void> {
    const resultDislike = await redisClient.sAdd(`${this.novelId}:dislikes`, userId);
    const resultLike = await redisClient.sRem(`${this.novelId}:likes`, userId);
    if (resultLike) {
        this.likeCount--;
    }
    if (!resultDislike) {
        throw new novelError.NovelInteractionFailedError("Already disliked");
    }
    this.dislikeCount++;
    await this.save();
};

novelSchema.methods.favorite = async function (userId: string): Promise<void> {
    const resultFavorite = await redisClient.sAdd(`${this.novelId}:favorites`, userId);
    if (!resultFavorite) {
        throw new novelError.NovelInteractionFailedError("Already favorited");
    }
    this.favoriteCount++;
    const user = await User.findOne({ userid: userId });
    if (!user) {
        throw new userError.UserNotFoundError("User not found");
    }
    user.favoriteNovels.push(this.novelId);
    await user.save();
    await this.save();
};

novelSchema.methods.increaseViewCount = async function (): Promise<void> {
    this.viewCount++;
    await this.save();
};

novelSchema.methods.increaseEpisode = async function (): Promise<void> {
    this.episodeCount++;
    await this.save();
};

novelSchema.methods.decreaseEpisode = async function (): Promise<void> {
    this.episodeCount--;
    await this.save();
};

novelSchema.methods.uploadThumbnailImage = async function (file: Express.Multer.File): Promise<string> {
    const extension = file.originalname.split(".").pop();
    if (!extension) {
        throw new novelError.NovelImageUploadFailedError("Invalid file extension");
    }
    if (extension !== "png" && extension !== "jpg" && extension !== "jpeg") {
        throw new novelError.NovelImageUploadFailedError("Invalid file extension");
    }
    const filename = `${createHmac("sha256", process.env.JWT_SECRET as string).update(this.novelId).digest("hex")}.${extension}`;
    const filePath = `./uploads/novel/${filename}`;
    fs.writeFileSync(filePath, file.buffer);
    this.thumbnailImage = filePath;
    await this.save();
    return filePath;
};

novelSchema.methods.deleteThumbnailImage = async function (): Promise<void> {
    if (!this.thumbnailImage) {
        throw new novelError.NovelImageDeleteFailedError("Thumbnail image not found");
    }
    fs.unlinkSync(this.thumbnailImage);
    this.thumbnailImage = "";
    await this.save();
};

export default Novel;
