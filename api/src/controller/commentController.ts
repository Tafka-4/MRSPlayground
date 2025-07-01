import { Request, Response } from "express";
import Comment from "../model/commentModel.js";
import commentError from "../utils/error/commentError.js";
import Episode from "../model/episodeModel.js";
import Novel from "../model/novelModel.js";
import Post from "../model/postModel.js";
import Gallery from "../model/galleryModel.js";
import postError from "../utils/error/postError.js";
import episodeError from "../utils/error/episodeError.js";
import galleryError from "../utils/error/galleryError.js";
import novelError from "../utils/error/novelError.js";

// login required
export const createComment = async (req: Request, res: Response) => {
    const { galleryId, novelId, targetId, targetType, content, parentId, isHidden, tempPassword } = req.body;
    const userid = req.user?.userid;
    const ip = req.ip;
    const userAgent = req.headers["user-agent"];

    if (galleryId && novelId) throw new commentError.CommentError("Cannot have both galleryId and novelId");
    if (!galleryId && !novelId) throw new commentError.CommentError("Must have either galleryId or novelId");

    if (galleryId) await findGalleryById(galleryId);
    if (novelId) await findNovelById(novelId);

    await findTargetById(targetId, targetType);

    if (typeof isHidden !== "boolean") {
        throw new commentError.CommentError("Invalid isHidden type");
    }
    if (isHidden && !tempPassword) {
        throw new commentError.CommentError("Temporary password is required for hidden comments");
    }
    if (tempPassword && !/^[a-zA-Z0-9]{8,}$/.test(tempPassword)) {
        throw new commentError.CommentError("Invalid temporary password format (must be at least 8 alphanumeric characters)");
    }
    if (!isHidden && tempPassword) {
        throw new commentError.CommentError("Temporary password is not allowed for public comments");
    }

    const commentData = {
        galleryId,
        novelId,
        commentTargetId: targetId,
        commentTargetType: targetType,
        commentParentId: parentId,
        content,
        isHidden,
        author: isHidden ? `익명(${ip?.split(".").slice(0, 1).join(".")})` : userid,
        clientInfo: { ip, userAgent },
        ...(isHidden && { tempPassword }),
    };

    const comment = new Comment(commentData);
    const savedComment = await saveAndReturnComment(comment);

    res.status(201).json({
        success: true,
        comment: savedComment
    });
};

// login required
export const getComments = async (req: Request, res: Response) => {
    const { galleryId, novelId, targetId, targetType } = req.params;
    const { page, limit } = req.query;

    if (galleryId && galleryId !== "undefined") await findGalleryById(galleryId);
    if (novelId && novelId !== "undefined") await findNovelById(novelId);

    await findTargetById(targetId, targetType);

    let query: any = {
        commentTargetId: targetId,
        commentTargetType: targetType,
    };

    if (galleryId && galleryId !== "undefined") {
        query.galleryId = galleryId;
    }
    if (novelId && novelId !== "undefined") {
        query.novelId = novelId;
    }

    const comments = await Comment.find(query)
        .populate("commentTargetId")
        .populate("commentParentId")
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .exec();

    res.status(200).json({
        success: true,
        comments
    });
};

// login required
export const getComment = async (req: Request, res: Response) => {
    const { commentId } = req.params;
    const comment = await Comment.findOne({ commentId }).populate("commentTargetId").populate("commentParentId").exec();
    if (!comment) throw new commentError.CommentNotFoundError("Comment not found");
    res.status(200).json({
        success: true,
        comment
    });
};

// login required
export const updateComment = async (req: Request, res: Response) => {
    const { commentId, tempPassword } = req.params;
    const { content } = req.body;
    const userid = req.user?.userid;
    const comment = await Comment.findOne({ commentId });
    if (!comment) throw new commentError.CommentNotFoundError("Comment not found");
    if (comment.author !== userid) {
        throw new commentError.CommentNotAuthorError("Comment not authorized");
    }
    if (comment.isHidden && comment.tempPassword !== tempPassword) {
        throw new commentError.CommentError("Invalid temp password");
    }

    if (comment.isDeleted) {
        throw new commentError.CommentError("Cannot update deleted comment");
    }

    const hasReplies = await Comment.findOne({
        commentParentId: commentId,
        isDeleted: false,
    });

    if (hasReplies) {
        throw new commentError.CommentError("Cannot update comment with replies");
    }

    comment.content = content;
    await comment.save();
    res.status(200).json({
        success: true,
        message: "Comment updated successfully"
    });
};

// login required
export const deleteComment = async (req: Request, res: Response) => {
    const { commentId, tempPassword } = req.params;
    const userid = req.user?.userid;
    const comment = await Comment.findOne({ commentId });
    if (!comment) throw new commentError.CommentNotFoundError("Comment not found");

    let isGalleryManager = false;
    if (comment.galleryId) {
        const gallery = await Gallery.findOne({ galleryId: comment.galleryId });
        if (
            gallery &&
            (gallery.galleryAdmin === userid || gallery.galleryManager.includes(userid as string))
        ) {
            isGalleryManager = true;
        }
    }

    let isNovelAuthor = false;
    if (comment.novelId) {
        const novel = await Novel.findOne({ novelId: comment.novelId });
        if (novel && novel.author === userid) {
            isNovelAuthor = true;
        }
    }

    if (isGalleryManager || isNovelAuthor) {
        await Comment.deleteOne({ commentId });
        return res.status(200).json({
            success: true,
            message: "Comment deleted successfully"
        });
    }

    if (comment.author !== userid) {
        throw new commentError.CommentNotAuthorError("Comment not authorized");
    }
    if (comment.isHidden && comment.tempPassword !== tempPassword) {
        throw new commentError.CommentError("Invalid temp password");
    }

    const hasReplies = await Comment.findOne({
        commentParentId: commentId,
        isDeleted: false,
    });

    if (hasReplies) {
        comment.content = "삭제된 댓글입니다.";
        comment.isDeleted = true;
        await comment.save();
        return res.status(200).json({
            success: true,
            message: "Comment content updated due to existing replies"
        });
    }

    await Comment.deleteOne({ commentId });
    res.status(200).json({
        success: true,
        message: "Comment deleted successfully"
    });
};

// login required
export const likeComment = async (req: Request, res: Response) => {
    const { commentId } = req.params;
    const userid = req.user?.userid;
    const comment = await Comment.findOne({ commentId });
    if (!comment) throw new commentError.CommentNotFoundError("Comment not found");
    await comment.like(userid as string);
    res.status(200).json({
        success: true,
        message: "Comment liked successfully"
    });
};

// login required
export const dislikeComment = async (req: Request, res: Response) => {
    const { commentId } = req.params;
    const userid = req.user?.userid;
    const comment = await Comment.findOne({ commentId });
    if (!comment) throw new commentError.CommentNotFoundError("Comment not found");
    await comment.dislike(userid as string);
    res.status(200).json({
        success: true,
        message: "Comment disliked successfully"
    });
};

export const getCommentsWithPagination = async (req: Request, res: Response) => {
    const { galleryId, novelId, targetId, targetType } = req.params;
    const { page = 1, limit = 10, sort = "latest" } = req.query;

    if (galleryId && galleryId !== "undefined") await findGalleryById(galleryId);
    if (novelId && novelId !== "undefined") await findNovelById(novelId);

    await findTargetById(targetId, targetType);

    let query: any = {
        commentTargetId: targetId,
        commentTargetType: targetType,
        isDeleted: false,
    };

    if (galleryId && galleryId !== "undefined") {
        query.galleryId = galleryId;
    }
    if (novelId && novelId !== "undefined") {
        query.novelId = novelId;
    }

    let sortOption: any = {};
    switch (sort) {
        case "latest":
            sortOption = { createdAt: -1 };
            break;
        case "oldest":
            sortOption = { createdAt: 1 };
            break;
        case "likes":
            sortOption = { likes: -1 };
            break;
        default:
            sortOption = { createdAt: -1 };
    }

    const totalComments = await Comment.countDocuments(query);

    const comments = await Comment.find(query)
        .sort(sortOption)
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .populate("commentTargetId")
        .populate("commentParentId")
        .exec();

    const totalPages = Math.ceil(totalComments / Number(limit));

    res.status(200).json({
        success: true,
        comments,
        pagination: {
            currentPage: Number(page),
            totalPages,
            totalComments,
            hasNext: Number(page) < totalPages,
            hasPrev: Number(page) > 1,
        }
    });
};

const findTargetById = async (targetId: string, targetType: string) => {
    let target;
    switch (targetType) {
        case "post":
            target = await Post.findOne({ postId: targetId });
            if (!target) throw new postError.PostNotFoundError("Post not found");
            break;
        case "episode":
            target = await Episode.findOne({ episodeId: targetId });
            if (!target) throw new episodeError.EpisodeNotFoundError("Episode not found");
            break;
        default:
            throw new commentError.CommentError("Invalid target type");
    }
    return target;
};

const findGalleryById = async (galleryId: string) => {
    const gallery = await Gallery.findOne({ galleryId });
    if (!gallery) throw new galleryError.GalleryNotFoundError("Gallery not found");
    return gallery;
};

const findNovelById = async (novelId: string) => {
    const novel = await Novel.findOne({ novelId });
    if (!novel) throw new novelError.NovelNotFoundError("Novel not found");
    return novel;
};

// login required
const saveAndReturnComment = async (comment: any) => {
    await comment.save();
    const populatedComment = await Comment.findOne({
        commentId: comment.commentId,
    })
        .populate("commentTargetId")
        .populate("commentParentId")
        .exec();
    return populatedComment;
};