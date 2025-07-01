import { redisClient, mongoose } from "../utils/dbconnect/dbconnect.js";
import commentError from "../utils/error/commentError.js";
import { parseEmojiToImgTag } from "../utils/internalEmojiTagParser.js";
import { v4 as uuidv4 } from "uuid";

interface IComment extends mongoose.Document {
    commentId: string;
    galleryId?: string;
    novelId?: string;
    commentTargetId: string;
    commentTargetType: string;
    commentParentId: string | null;
    childComments: string[];
    content: string;
    commentType: string;
    commentTypeRefId: string;
    likeCount: number;
    dislikeCount: number;
    author: string;
    isHidden: boolean;
    isDeleted: boolean;
    tempPassword: string | null;
    clientInfo: {
        ip: string;
        userAgent: string;
    };
    createdAt: Date;
    updatedAt: Date;
    like(userId: string): Promise<void>;
    dislike(userId: string): Promise<void>;
    addChildComment(childCommentId: string): Promise<void>;
    removeChildComment(childCommentId: string): Promise<void>;
}

const commentSchema = new mongoose.Schema({
    commentId: { type: String, required: true, unique: true, default: uuidv4() },
    galleryId: { type: String, required: false },
    novelId: { type: String, required: false },
    commentTargetId: { type: String, required: true },
    commentTargetType: { type: String, enum: ["episode", "post", "novel"], required: true },
    parentCommentId: { type: String, required: false, default: null },
    childComments: { type: [String], required: false, default: [] },
    content: { type: String, required: true },
    commentType: { type: String, enum: ["episode", "post", "novel"], required: true },
    commentTypeRefId: { type: String, required: true },
    likeCount: { type: Number, required: false, default: 0 },
    dislikeCount: { type: Number, required: false, default: 0 },
    author: { type: String, required: true },
    isHidden: { type: Boolean, required: false, default: false },
    isDeleted: { type: Boolean, required: false, default: false },
    tempPassword: { type: String, required: false, default: null },
    clientInfo: {
        ip: { type: String, required: false },
        userAgent: { type: String, required: false },
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

commentSchema.pre("save", async function (next) {
    this.updatedAt = new Date();
    this.content = await parseEmojiToImgTag(this.content, true);
    next();
});

commentSchema.methods.like = async function (userId: string): Promise<void> {
    const resultLike = await redisClient.sAdd(`${this.commentId}:likes`, userId);
    const resultDislike = await redisClient.sRem(`${this.commentId}:dislikes`, userId);
    if (resultDislike) {
        this.dislikeCount--;
    }
    if (!resultLike) {
        throw new commentError.CommentInteractionFailedError("Already liked");
    }
    this.likeCount++;
};

commentSchema.methods.dislike = async function (userId: string): Promise<void> {
    const resultDislike = await redisClient.sAdd(`${this.commentId}:dislikes`, userId);
    const resultLike = await redisClient.sRem(`${this.commentId}:likes`, userId);
    if (resultLike) {
        this.likeCount--;
    }
    if (!resultDislike) {
        throw new commentError.CommentInteractionFailedError("Already disliked");
    }
    this.dislikeCount++;
};

commentSchema.methods.addChildComment = async function (childCommentId: string): Promise<void> {
    this.childComments.push(childCommentId);
    await this.save();
};

commentSchema.methods.removeChildComment = async function (childCommentId: string): Promise<void> {
    this.childComments = this.childComments.filter((id: string) => id.toString() !== childCommentId);
    await this.save();
};


const Comment = mongoose.model<IComment>("Comment", commentSchema);

export default Comment;