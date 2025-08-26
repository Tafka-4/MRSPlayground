import { mongoose } from '../utils/dbconnect/dbconnect.js';

export interface INotice extends mongoose.Document {
    noticeId: string;
    novelId: string;
    author: string;
    title: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
}

const noticeSchema = new mongoose.Schema({
    noticeId: { type: String, required: true, unique: true },
    novelId: { type: String, required: true, index: true },
    author: { type: String, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

noticeSchema.pre('save', function (this: any, next: (err?: any) => void) {
    this.updatedAt = new Date();
    next();
});

const Notice = mongoose.model<INotice>('Notice', noticeSchema);

export default Notice;


