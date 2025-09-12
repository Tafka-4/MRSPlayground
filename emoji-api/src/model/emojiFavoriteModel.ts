import mongoose from 'mongoose';

interface IEmojiFavorite extends mongoose.Document {
    userId: string;
    packageId: string;
    createdAt: Date;
}

const emojiFavoriteSchema = new mongoose.Schema<IEmojiFavorite>({
    userId: { type: String, required: true },
    packageId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

emojiFavoriteSchema.index({ userId: 1, packageId: 1 }, { unique: true });

const EmojiFavorite = mongoose.model<IEmojiFavorite>('EmojiFavorite', emojiFavoriteSchema, 'emoji_favorites');

export default EmojiFavorite;


