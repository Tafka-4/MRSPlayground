import mongoose from "mongoose";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { redisClient } from "../utils/dbconnect/dbconnect.js";
import galleryError from "../utils/error/galleryError.js";
import { createHmac } from "crypto";

interface IGallery {
    galleryId: string;
    thumbnail: string;
    title: string;
    description: string;
    galleryAdmin: string;
    galleryManager: string[];
    subscribers: string[];
    createdAt: Date;
    updatedAt: Date;
    subscribe(userid: string): Promise<void>;
    unsubscribe(userid: string): Promise<void>;
    galleryAdminChange(admin: string): Promise<void>;
    galleryManagerAdd(manager: string): Promise<void>;
    galleryManagerDelete(manager: string): Promise<void>;
    galleryThumbnailUpload(thumbnail: Express.Multer.File): Promise<string>;
    galleryThumbnailDelete(): Promise<void>;
    getGalleryBlockUsers(): Promise<string[]>;
    getGalleryBlockIPs(): Promise<string[]>;
    addGalleryBlockUser(userid: string, time: number): Promise<void>;
    deleteGalleryBlockUser(userid: string): Promise<void>;
    addGalleryBlockIP(ip: string, time: number): Promise<void>;
    deleteGalleryBlockIP(ip: string): Promise<void>;
};

const gallerySchema = new mongoose.Schema({
    galleryId: { type: String, required: true, unique: true, default: uuidv4() },
    thumbnail: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    galleryAdmin: { type: String, required: true },
    galleryManager: { type: [String], required: true },
    subscribers: { type: Number, default: 0 },
    blockUsers: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

const Gallery = mongoose.model<IGallery>("Gallery", gallerySchema);

gallerySchema.pre("save", async function (next) {
    this.updatedAt = new Date();
    next();
});

gallerySchema.pre("deleteOne", { document: true, query: false }, async function (next) {
    if (this.thumbnail) {
        fs.unlinkSync(this.thumbnail);
    }
    await redisClient.del(`gallery:${this.galleryId}:subscribers`);
    next();
});

gallerySchema.methods.subscribe = async function (userid: string) {
    const result = await redisClient.sAdd(`gallery:${this.galleryId}:subscribers`, userid);
    if (result) {
        this.subscribers++;
        await this.save();
    }
};

gallerySchema.methods.unsubscribe = async function (userid: string) {
    const result = await redisClient.sRem(`gallery:${this.galleryId}:subscribers`, userid);
    if (result) {
        this.subscribers--;
        await this.save();
    }
};

gallerySchema.methods.galleryAdminChange = async function (admin: string) {
    this.galleryAdmin = admin;
    await this.save();
};

gallerySchema.methods.galleryManagerAdd = async function (manager: string) {
    if (this.galleryAdmin === manager) {
        throw new galleryError.GalleryIsNotAdminError("You are the admin of this gallery");
    }
    if (this.galleryManager.includes(manager)) {
        throw new galleryError.GalleryInteractionFailedError("You are already a manager of this gallery");
    }
    this.galleryManager.push(manager);
    await this.save();
};

gallerySchema.methods.galleryManagerDelete = async function (manager: string) {
    if (this.galleryAdmin === manager) {
        throw new galleryError.GalleryIsNotAdminError("You are the admin of this gallery");
    }
    if (!this.galleryManager.includes(manager)) {
        throw new galleryError.GalleryInteractionFailedError("You are not a manager of this gallery");
    }
    this.galleryManager = this.galleryManager.filter((m: string) => m !== manager);
    await this.save();
};

gallerySchema.methods.galleryThumbnailUpload = async function (thumbnail: Express.Multer.File) {
    if (this.thumbnail) {
        fs.unlinkSync(`./uploads/gallery/${this.thumbnail}`);
    }
    const extension = thumbnail.originalname.split(".").pop();
    if (!extension) {
        throw new galleryError.GalleryImageUploadFailedError("Invalid file extension");
    }
    if (extension !== "png" && extension !== "jpg" && extension !== "jpeg") {
        throw new galleryError.GalleryImageUploadFailedError("Invalid file extension");
    }
    const filename = `${createHmac("sha256", process.env.JWT_SECRET as string).update(this.galleryId).digest("hex")}.${extension}`;
    const filePath = `./uploads/gallery/${filename}`;
    fs.writeFileSync(filePath, thumbnail.buffer);
    this.thumbnail = filePath;
    await this.save();
    return filePath;
};

gallerySchema.methods.galleryThumbnailDelete = async function () {
    if (this.thumbnail) {
        fs.unlinkSync(`./uploads/gallery/${this.thumbnail}`);
    }
    this.thumbnail = "";
    await this.save();
};

gallerySchema.methods.getGalleryBlockUsers = async function () {
    return await redisClient.sMembers(`gallery:${this.galleryId}:blockUsers`);
};

gallerySchema.methods.getGalleryBlockIPs = async function () {
    return await redisClient.sMembers(`gallery:${this.galleryId}:blockIPs`);
};

gallerySchema.methods.addGalleryBlockUser = async function (userid: string, time: number) {
    const result = await redisClient.sAdd(`gallery:${this.galleryId}:blockUsers`, userid);
    if (result) {
        await redisClient.expire(`gallery:${this.galleryId}:blockUsers`, time);
    }
};

gallerySchema.methods.deleteGalleryBlockUser = async function (userid: string) {
    const result = await redisClient.sRem(`gallery:${this.galleryId}:blockUsers`, userid);
    if (result) {
        await this.save();
    }
};

gallerySchema.methods.addGalleryBlockIP = async function (ip: string, time: number) {
    const result = await redisClient.sAdd(`gallery:${this.galleryId}:blockIPs`, ip);
    if (result) {
        await redisClient.expire(`gallery:${this.galleryId}:blockIPs`, time);
    }
};

gallerySchema.methods.deleteGalleryBlockIP = async function (ip: string) {
    const result = await redisClient.sRem(`gallery:${this.galleryId}:blockIPs`, ip);
    if (result) {
        await this.save();
    }
};

export default Gallery;
