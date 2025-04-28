import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import sharp from "sharp";
import { createHmac } from "crypto";
import emojiError from "../utils/error/emojiError.js";

interface IEmojiPackage extends mongoose.Document {
    packageId: string;
    packageName: string;
    packageDescription: string;
    useCount: number;
    packageEmojis: Record<string, string>;
    author: string;
    createdAt: Date;
    updatedAt: Date;
    uploadEmojis(emojis: Express.Multer.File[]): Promise<void>;
    addEmojis(emojis: Express.Multer.File[]): Promise<void>;
    deleteEmojis(emojis: string[]): Promise<void>;
    getEmojis(): string[];
    getEmoji(emojiId: string): string;
    increaseUseCount(): Promise<void>;
}

const emojiPackageSchema = new mongoose.Schema({
    packageId: { type: String, required: true, unique: true, default: uuidv4() },
    packageName: { type: String, required: true },
    packageDescription: { type: String, required: true },
    useCount: { type: Number, default: 0 },
    author: { type: String, required: true },
    packageEmojis: { type: Object, required: true, default: {} },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

emojiPackageSchema.pre("save", async function (next) {
    this.updatedAt = new Date();
    next();
});

emojiPackageSchema.pre("deleteOne", { document: true, query: false }, async function (next) {
    fs.rmSync(`./uploads/emojis/${this.packageId}`, { recursive: true, force: true });
    next();
});

emojiPackageSchema.methods.uploadEmojis = async function (emojis: Express.Multer.File[]) {
    const emojiPaths: Record<string, string> = {};
    for (const emoji of emojis) {
        const extension = emoji.originalname.split(".").pop();
        if (!extension) {
            throw new emojiError.EmojiInvalidExtensionError("Invalid file extension");
        }
        if (extension !== "png" && extension !== "jpg" && extension !== "jpeg" && extension !== "gif" && extension !== "webp") {
            throw new emojiError.EmojiInvalidExtensionError("Invalid file extension");
        }
        if (emoji.size > 1024 * 1024 * 10) {
            throw new emojiError.EmojiUploadFailedError("Emoji is too large");
        }
        const resizedEmojiBuffer = await sharp(emoji.buffer).resize({ width: 200, height: 200 }).withMetadata().toBuffer();
        const filename = `${createHmac("sha256", process.env.JWT_SECRET as string).update(uuidv4()).digest("hex")}.${extension}`;
        const emojiPath = `./uploads/emojis/${this.packageId}/${filename}`;
        fs.writeFileSync(emojiPath, resizedEmojiBuffer);
        emojiPaths[uuidv4()] = emojiPath;
    }
    this.packageEmojis = emojiPaths;
    await this.save();
}

emojiPackageSchema.methods.addEmojis = async function (emojis: Express.Multer.File[]) {
    const emojiPaths: Record<string, string> = {};
    for (const emoji of emojis) {
        const extension = emoji.originalname.split(".").pop();
        if (!extension) {
            throw new emojiError.EmojiInvalidExtensionError("Invalid file extension");
        }
        if (extension !== "png" && extension !== "jpg" && extension !== "jpeg" && extension !== "gif" && extension !== "webp") {
            throw new emojiError.EmojiInvalidExtensionError("Invalid file extension");
        }
        if (emoji.size > 1024 * 1024 * 10) {
            throw new emojiError.EmojiUploadFailedError("Emoji is too large");
        }
        const resizedEmojiBuffer = await sharp(emoji.buffer).resize({ width: 200, height: 200 }).withMetadata().toBuffer();
        const filename = `${createHmac("sha256", process.env.JWT_SECRET as string).update(uuidv4()).digest("hex")}.${extension}`;
        const emojiPath = `./uploads/emojis/${this.packageId}/${filename}`;
        fs.writeFileSync(emojiPath, resizedEmojiBuffer);
        emojiPaths[uuidv4()] = emojiPath;
    }
    this.packageEmojis = { ...this.packageEmojis, ...emojiPaths };
    await this.save();
}

emojiPackageSchema.methods.deleteEmojis = async function (emojis: string[]) {
    const objectKeys = Object.keys(this.packageEmojis);
    for (const emoji of emojis) {
        if (!objectKeys.includes(emoji)) {
            throw new emojiError.EmojiNotFoundError("Emoji not found");
        }
        fs.unlinkSync(this.packageEmojis[objectKeys.findIndex(key => key === emoji)]);
        delete this.packageEmojis[objectKeys.findIndex(key => key === emoji)];
    }
    await this.save();
}

emojiPackageSchema.methods.getEmojis = function () {
    return Object.keys(this.packageEmojis);
}

emojiPackageSchema.methods.getEmoji = function (emojiId: string) {
    const objectKeys = Object.keys(this.packageEmojis);
    if (!objectKeys.includes(emojiId)) {
        throw new emojiError.EmojiNotFoundError("Emoji not found");
    }
    return this.packageEmojis[objectKeys.findIndex(key => key === emojiId)];
}

emojiPackageSchema.methods.increaseUseCount = async function () {
    this.useCount++;
    await this.save();
}

const EmojiPackage = mongoose.model<IEmojiPackage>("EmojiPackage", emojiPackageSchema);

export default EmojiPackage;

