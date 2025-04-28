import dotenv from "dotenv";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { createHmac } from "crypto";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { redisClient } from "../utils/dbconnect/dbconnect.js";
import userError from "../utils/error/userError.js";

dotenv.config();

export interface IUser extends mongoose.Document {
    userid: string;
    username: string;
    password: string;
    email: string;
    isVerified: boolean;
    authority: "user" | "admin";
    description?: string;
    wroteNovels: string[];
    favoriteNovels: string[];
    profileImage?: string;
    comparePassword(candidatePassword: string): Promise<boolean>;
    generateTokens(): Promise<{ accessToken: string, refreshToken: string }>;
    verifyToken(token: string): Promise<jwt.JwtPayload>;
    logout(): Promise<number>;
    refresh(checkRefreshToken: string): Promise<string>;
    uploadProfileImage(file: Express.Multer.File): Promise<string>;
    deleteProfileImage(): Promise<void>;
}

const userSchema = new mongoose.Schema({
    userid: { type: String, required: true, unique: true, default: uuidv4() },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    isVerified: { type: Boolean, default: false },
    authority: { type: String, required: true, enum: ["user", "admin"], default: "user" },
    description: { type: String, required: false, default: "" },
    profileImage: { type: String, required: false, default: "" },
    wroteNovels: { type: [String], required: false, default: [] },
    favoriteNovels: { type: [String], required: false, default: [] },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

const User = mongoose.model<IUser>("User", userSchema);

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    this.updatedAt = new Date();
    next();
});

userSchema.pre("updateOne", async function (next) {
    const update = this.getUpdate() as mongoose.UpdateQuery<IUser>;
    if (update && update.$set && update.$set.password) {
        update.$set.password = await bcrypt.hash(update.$set.password as string, 10);
    }
    this.set({ updatedAt: new Date() });
    next();
});

userSchema.pre("findOneAndUpdate", async function (next) {
    const update = this.getUpdate() as mongoose.UpdateQuery<IUser>;
    if (update && update.$set && update.$set.password) {
        update.$set.password = await bcrypt.hash(update.$set.password as string, 10);
    }
    this.set({ updatedAt: new Date() });
    next();
});

userSchema.pre("deleteOne", { document: true, query: false }, async function (next) {
    if (this.profileImage) {
        fs.unlinkSync(this.profileImage);
    }
    await redisClient.del(`${this.userid}:refreshToken`);
    await redisClient.del(`${this.userid}:favorites`);
    next();
});

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean | null> {
    return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateTokens = async function (): Promise<{ accessToken: string, refreshToken: string }> {
    const accessToken = jwt.sign({ userid: this.userid }, process.env.JWT_SECRET as string, { expiresIn: "1h" });
    const refreshToken = jwt.sign({ userid: this.userid }, process.env.JWT_SECRET as string, { expiresIn: "7d" });
    await redisClient.set(`${this.userid}:refreshToken`, refreshToken, { EX: 60 * 60 * 24 });
    return { accessToken, refreshToken };
};

userSchema.methods.verifyToken = async function (token: string): Promise<jwt.JwtPayload> {
    try {
        return jwt.verify(token, process.env.JWT_SECRET as string) as jwt.JwtPayload;
    } catch (error) {
        throw new userError.UserTokenVerificationFailedError("Token verification failed");
    }
};

userSchema.methods.logout = async function (): Promise<void> {
    await redisClient.del(`${this.userid}:refreshToken`);
};

userSchema.methods.refresh = async function (checkRefreshToken: string): Promise<string> {
    const refreshToken = await redisClient.get(`${this.userid}:refreshToken`);
    if (!refreshToken) throw new userError.UserNotLoginError("Unauthorized");
    if (refreshToken !== checkRefreshToken) throw new userError.UserTokenVerificationFailedError("Token verification failed");
    const accessToken = jwt.sign({ userid: this.userid }, process.env.JWT_SECRET as string, { expiresIn: "1h" });
    return accessToken;
};

userSchema.methods.uploadProfileImage = async function (file: Express.Multer.File): Promise<string> {
    const extension = file.originalname.split(".").pop();
    if (!extension) {
        throw new userError.UserImageUploadFailedError("Invalid file extension");
    }
    if (extension !== "png" && extension !== "jpg" && extension !== "jpeg") {
        throw new userError.UserImageUploadFailedError("Invalid file extension");
    }
    const filename = `${createHmac("sha256", process.env.JWT_SECRET as string).update(this.userid).digest("hex")}.${extension}`;
    const filePath = `./uploads/profile/${filename}`;
    fs.writeFileSync(filePath, file.buffer);
    this.profileImage = filePath;
    await this.save();
    return filePath;
};

userSchema.methods.deleteProfileImage = async function (): Promise<void> {
    if (!this.profileImage) {
        throw new userError.UserImageDeleteFailedError("Profile image not found");
    }
    fs.unlinkSync(this.profileImage);
    this.profileImage = "";
    await this.save();
};

export default User;


