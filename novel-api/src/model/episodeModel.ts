import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { mongoose, redisClient } from '../utils/dbconnect/dbconnect.js';
import episodeError from '../utils/error/episodeError.js';

dotenv.config();

export interface IEpisode extends mongoose.Document {
  episodeId: string;
  episodeNumber: number;
  novelId: string;
  title: string;
  content: string;
  author: string;
  authorComment: string | null;
  viewCount: number;
  likeCount: number;
  dislikeCount: number;
  createdAt: Date;
  updatedAt: Date;
  imageUploaded: boolean;
  like(userId: string): Promise<void>;
  dislike(userId: string): Promise<void>;
  increaseViewCount(): Promise<void>;
}

const episodeSchema = new mongoose.Schema({
  episodeId: { type: String, required: true, unique: true, default: uuidv4 },
  episodeNumber: { type: Number, required: true },
  novelId: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: String, required: true },
  authorComment: { type: String, required: false, default: null },
  viewCount: { type: Number, default: 0 },
  likeCount: { type: Number, default: 0 },
  dislikeCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  imageUploaded: { type: Boolean, default: false }
});

const Episode = mongoose.model<IEpisode>('Episode', episodeSchema);

episodeSchema.pre('save', async function (this: IEpisode, next: (err?: any) => void) {
  if (this.imageUploaded) {
    fs.rmSync(`./uploads/episode/${this.novelId}/${this.episodeId}`, { recursive: true, force: true });
  }
  const uploadFiles = this.content.match(/<img src="data:image\/(png|jpeg|webp|gif);base64,([^"]+)"/g);
  if (!uploadFiles) {
    next();
    return;
  }
  for (const file of uploadFiles) {
    const typeMatch = file.match(/data:image\/(png|jpeg|webp|gif);base64,/);
    if (!typeMatch) continue;
    const imageType = typeMatch[1];
    const base64Data = file
      .replace(/^<img src="data:image\/(png|jpeg|webp|gif);base64,/, '')
      .replace(/"$/, '');
    const diskDir = path.join('.', 'uploads', 'episode', this.novelId, this.episodeId);
    const fileName = `${uuidv4()}.${imageType}`;
    const diskPath = path.join(diskDir, fileName);
    const publicPath = `/uploads/episode/${this.novelId}/${this.episodeId}/${fileName}`;
    try {
      const fileBuffer = Buffer.from(base64Data, 'base64');
      if (fileBuffer.length > 10 * 1024 * 1024) {
        throw new episodeError.EpisodeUploadFailedError('Image size is too large');
      }
      fs.mkdirSync(diskDir, { recursive: true });
      fs.writeFileSync(diskPath, fileBuffer);
      this.content = this.content.replace(file, `<img src="${publicPath}">`);
    } catch (error) {
      throw new episodeError.EpisodeUploadFailedError('Failed to upload image');
    }
  }
  this.imageUploaded = true;
  this.updatedAt = new Date();
  next();
});

episodeSchema.pre('deleteOne', { document: true, query: false }, async function (this: IEpisode, next: (err?: any) => void) {
  try {
    if (this.imageUploaded) {
      fs.rmSync(`./uploads/episode/${this.novelId}/${this.episodeId}`, { recursive: true, force: true });
    }
  } catch (error) {
    throw new episodeError.EpisodeUploadFailedError('Failed to delete image from S3');
  }
  await redisClient.del(`${this.novelId}:${this.episodeId}:likes`);
  await redisClient.del(`${this.novelId}:${this.episodeId}:dislikes`);
  next();
});

episodeSchema.methods.like = async function (this: IEpisode, userId: string): Promise<void> {
  const resultLike = await redisClient.sAdd(`${this.novelId}:${this.episodeId}:likes`, userId);
  const resultDislike = await redisClient.sRem(`${this.novelId}:${this.episodeId}:dislikes`, userId);
  if (resultDislike) {
    this.dislikeCount--;
  }
  if (!resultLike) {
    throw new episodeError.EpisodeInteractionFailedError('Already liked');
  }
  this.likeCount++;
};

episodeSchema.methods.dislike = async function (this: IEpisode, userId: string): Promise<void> {
  const resultDislike = await redisClient.sAdd(`${this.novelId}:${this.episodeId}:dislikes`, userId);
  const resultLike = await redisClient.sRem(`${this.novelId}:${this.episodeId}:likes`, userId);
  if (resultLike) {
    this.likeCount--;
  }
  if (!resultDislike) {
    throw new episodeError.EpisodeInteractionFailedError('Already disliked');
  }
  this.dislikeCount++;
};

export default Episode;


