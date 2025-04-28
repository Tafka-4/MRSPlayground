import { Request, Response } from "express";
import Comment from "../model/commentModel.js";
import commentError from "../utils/error/commentError.js";
import Episode from "../model/episodeModel.js";
import Novel from "../model/novelModel.js";
import Post from "../model/postModel.js";
import Gallery from "../model/galleryModel.js";

// login required
export const createComment = async (req: Request, res: Response) => {
    const { content, commentType, commentTypeRefId, parentCommentId, tempPassword, isHidden } = req.body;

    if (!content || !commentType || !commentTypeRefId) {
        throw new commentError.CommentError("Invalid comment: Missing required fields");
    }

    switch (commentType) {
        case "episode":
            const episode = await Episode.findOne({ episodeId: commentTypeRefId });
            if (!episode) {
                throw new commentError.CommentNotFoundError("Invalid comment: Episode not found");
            }
            break;
        case "novel":
            const novel = await Novel.findOne({ novelId: commentTypeRefId });
            if (!novel) {
                throw new commentError.CommentNotFoundError("Invalid comment: Novel not found");
            }
            break;
        case "post":
            const post = await Post.findOne({ postId: commentTypeRefId });
            if (!post) {
                throw new commentError.CommentNotFoundError("Invalid comment: Post not found");
            }
            const gallery = await Gallery.findOne({ galleryId: post.galleryId });
            if (!gallery) {
                throw new commentError.CommentNotFoundError("Invalid comment: Gallery not found");
            }
            const blockUsers = await gallery.getGalleryBlockUsers();
            const blockIPs = await gallery.getGalleryBlockIPs();
            if (blockUsers.includes(req.user?.userid as string) || blockIPs.includes(req.ip as string)) {
                throw new commentError.CommentInteractionFailedError("You are blocked from commenting on this post");
            }
            break;
        default:
            throw new commentError.CommentError("Invalid comment Type");
    }
    
    let author;
    let comment;

    if (isHidden) {
        author = `익명(${req.ip?.split(".").slice(0, 1).join(".")})`;
        if (!tempPassword) {
            throw new commentError.CommentError("Invalid comment: Temp password is required");
        }
    }
    if (parentCommentId) {
        const parentComment = await Comment.findOne({ commentId: parentCommentId });
        comment = await Comment.create({ content, commentType, commentTypeRefId, author: author, parentCommentId, tempPassword, isHidden, clientInfo: { ip: req.ip, userAgent: req.headers["user-agent"] } });
        if (!parentComment) {
            throw new commentError.CommentNotFoundError("Invalid comment: Parent comment not found");
        }
        await parentComment.addChildComment(comment.commentId);
    } else {
        comment = await Comment.create({ content, commentType, commentTypeRefId, author: author, tempPassword, isHidden, clientInfo: { ip: req.ip, userAgent: req.headers["user-agent"] } });
    }
    res.status(201).json(comment);
};

// login required
export const getComments = async (req: Request, res: Response) => {
    const { commentType, commentTypeRefId, limit, page, sort } = req.query;
    const limitNumber = parseInt(limit as string) || 10;
    const pageNumber = parseInt(page as string) || 1;
    const sortType = sort as "asc" | "desc" | "likes" | "childComments" || "desc";
    if (!commentType || !commentTypeRefId) {
        throw new commentError.CommentError("Invalid comment: Missing required fields");
    }

    let sortOptions: any = {};
    switch (sortType) {
        case "asc":
            sortOptions.createdAt = 1;
            break;
        case "likes":
            sortOptions.likes = -1;
            break;
        case "childComments":
            sortOptions.childCommentCount = -1;
            break;
        case "desc":
        default:
            sortOptions.createdAt = -1;
            break;
    }

    if (commentType === "post") {
        const post = await Post.findOne({ postId: commentTypeRefId });
        if (!post) {
            throw new commentError.CommentNotFoundError("Invalid comment: Post not found");
        }
        const gallery = await Gallery.findOne({ galleryId: post.galleryId });
        if (!gallery) {
            throw new commentError.CommentNotFoundError("Invalid comment: Gallery not found");
        }
        const blockUsers = await gallery.getGalleryBlockUsers();
        const blockIPs = await gallery.getGalleryBlockIPs();
        if (blockUsers.includes(req.user?.userid as string) || blockIPs.includes(req.ip as string)) {
            throw new commentError.CommentInteractionFailedError("You are blocked from commenting on this post");
        }
    }

    const query = { commentType, commentTypeRefId, parentCommentId: null };

    const comments = await Comment.find(query)
        .sort(sortOptions)
        .limit(limitNumber)
        .skip((pageNumber - 1) * limitNumber);

    const totalComments = await Comment.countDocuments(query);

    res.status(200).json({
        comments,
        totalPages: Math.ceil(totalComments / limitNumber),
        currentPage: pageNumber,
    });
};

// login required
export const getComment = async (req: Request, res: Response) => {
    const { commentId } = req.params;
    const comment = await Comment.findOne({ commentId });
    if (!comment) {
        throw new commentError.CommentError("Comment not found");
    }
    res.status(200).json(comment);
};

// login required
export const updateComment = async (req: Request, res: Response) => {
    const { commentId } = req.params;
    const { content } = req.body;
    const comment = await Comment.findOne({ commentId });
    
    if (!comment) {
        throw new commentError.CommentError("Comment not found");
    }
    
    if (comment.commentType === "post") {
        const post = await Post.findOne({ postId: comment.commentTypeRefId });
        if (!post) {
            throw new commentError.CommentNotFoundError("Invalid comment: Post not found");
        }
        const gallery = await Gallery.findOne({ galleryId: post.galleryId });
        if (!gallery) {
            throw new commentError.CommentNotFoundError("Invalid comment: Gallery not found");
        }
        const blockUsers = await gallery.getGalleryBlockUsers();
        const blockIPs = await gallery.getGalleryBlockIPs();
        if (blockUsers.includes(req.user?.userid as string) || blockIPs.includes(req.ip as string)) {
            throw new commentError.CommentInteractionFailedError("You are blocked from commenting on this post");
        }
    }
    if (comment.isHidden) {
        const { tempPassword } = req.body;
        if (!tempPassword || tempPassword !== comment.tempPassword) {
            throw new commentError.CommentError("Invalid password for hidden comment");
        }
    } else {
        if (comment.author !== req.user?.userid) {
            throw new commentError.CommentError("You are not authorized to update this comment");
        }
    }
    
    comment.content = content;
    await comment.save();
    
    res.status(200).json({ message: "Comment updated successfully" });
};

// login required
export const deleteComment = async (req: Request, res: Response) => {
    const { commentId } = req.params;
    const comment = await Comment.findOne({ commentId });
    
    if (!comment) {
        throw new commentError.CommentError("Comment not found");
    }

    if (comment.commentType === "post") {
        const post = await Post.findOne({ postId: comment.commentTypeRefId });
        if (!post) {
            throw new commentError.CommentNotFoundError("Invalid comment: Post not found");
        }
        const gallery = await Gallery.findOne({ galleryId: post.galleryId });
        if (!gallery) {
            throw new commentError.CommentNotFoundError("Invalid comment: Gallery not found");
        }
        const blockUsers = await gallery.getGalleryBlockUsers();
        const blockIPs = await gallery.getGalleryBlockIPs();
        if (blockUsers.includes(req.user?.userid as string) || blockIPs.includes(req.ip as string)) {
            throw new commentError.CommentInteractionFailedError("You are blocked from commenting on this post");
        }
    }
    
    if (comment.isHidden) {
        const { tempPassword } = req.body;
        if (!tempPassword || tempPassword !== comment.tempPassword) {
            throw new commentError.CommentError("Invalid password for hidden comment");
        }
    } else {
        if (comment.author !== req.user?.userid) {
            throw new commentError.CommentError("You are not authorized to delete this comment");
        }
    }
    
    // 자식 댓글이 있는 경우, 댓글을 삭제하지 않고 내용만 변경
    if (comment.childComments && comment.childComments.length > 0) {
        comment.content = "삭제된 댓글입니다.";
        await comment.save();
        return res.status(200).json({ message: "Comment content updated due to existing replies" });
    }
    
    // 부모 댓글이 있는 경우, 부모 댓글에서 이 댓글 참조 제거
    if (comment.parentCommentId) {
        const parentComment = await Comment.findOne({ commentId: comment.parentCommentId });
        if (parentComment) {
            await parentComment.removeChildComment(commentId);
        }
    }
    
    await comment.deleteOne();
    res.status(200).json({ message: "Comment deleted successfully" });
};

// login required
export const likeComment = async (req: Request, res: Response) => {
    const { commentId } = req.params;
    const comment = await Comment.findOne({ commentId });
    if (!comment) {
        throw new commentError.CommentError("Comment not found");
    }

    if (comment.commentType === "post") {
        const post = await Post.findOne({ postId: comment.commentTypeRefId });
        if (!post) {
            throw new commentError.CommentNotFoundError("Invalid comment: Post not found");
        }
        const gallery = await Gallery.findOne({ galleryId: post.galleryId });
        if (!gallery) {
            throw new commentError.CommentNotFoundError("Invalid comment: Gallery not found");
        }
        const blockUsers = await gallery.getGalleryBlockUsers();
        const blockIPs = await gallery.getGalleryBlockIPs();
        if (blockUsers.includes(req.user?.userid as string) || blockIPs.includes(req.ip as string)) {
            throw new commentError.CommentInteractionFailedError("You are blocked from commenting on this post");
        }
    }
    
    await comment.like(req.user?.userid as string);
    await comment.save();
    
    res.status(200).json({ message: "Comment liked successfully" });
};

// login required
export const dislikeComment = async (req: Request, res: Response) => {
    const { commentId } = req.params;
    const comment = await Comment.findOne({ commentId });
    if (!comment) {
        throw new commentError.CommentError("Comment not found");
    }
    if (comment.commentType === "post") {
        const post = await Post.findOne({ postId: comment.commentTypeRefId });
        if (!post) {
            throw new commentError.CommentNotFoundError("Invalid comment: Post not found");
        }
        const gallery = await Gallery.findOne({ galleryId: post.galleryId });
        if (!gallery) {
            throw new commentError.CommentNotFoundError("Invalid comment: Gallery not found");
        }
        const blockUsers = await gallery.getGalleryBlockUsers();
        const blockIPs = await gallery.getGalleryBlockIPs();
        if (blockUsers.includes(req.user?.userid as string) || blockIPs.includes(req.ip as string)) {
            throw new commentError.CommentInteractionFailedError("You are blocked from commenting on this post");
        }
    }
    await comment.dislike(req.user?.userid as string);
    await comment.save();
    
    res.status(200).json({ message: "Comment disliked successfully" });
};

// login required
export const getChildComments = async (req: Request, res: Response) => {
    const { commentId } = req.params;
    const { limit, page, sort } = req.query;
    const limitNumber = parseInt(limit as string) || 10;
    const pageNumber = parseInt(page as string) || 1;
    const sortType = sort as "asc" | "desc" | "likes" || "asc";
    
    const parentComment = await Comment.findOne({ commentId });
    if (!parentComment) {
        throw new commentError.CommentError("Parent comment not found");
    }
    if (parentComment.commentType === "post") {
        const post = await Post.findOne({ postId: parentComment.commentTypeRefId });
        if (!post) {
            throw new commentError.CommentNotFoundError("Invalid comment: Post not found");
        }
        const gallery = await Gallery.findOne({ galleryId: post.galleryId });
        if (!gallery) {
            throw new commentError.CommentNotFoundError("Invalid comment: Gallery not found");
        }
        const blockUsers = await gallery.getGalleryBlockUsers();
        const blockIPs = await gallery.getGalleryBlockIPs();
        if (blockUsers.includes(req.user?.userid as string) || blockIPs.includes(req.ip as string)) {
            throw new commentError.CommentInteractionFailedError("You are blocked from commenting on this post");
        }
    }

    let sortOptions: any = {};
    switch (sortType) {
        case "desc":
            sortOptions.createdAt = -1;
            break;
        case "likes":
            sortOptions.likeCount = -1;
            break;
        case "asc":
        default:
            sortOptions.createdAt = 1;
            break;
    }
    
    const comments = await Comment.find({ parentCommentId: commentId })
        .sort(sortOptions)
        .limit(limitNumber)
        .skip((pageNumber - 1) * limitNumber);
    
    const totalComments = await Comment.countDocuments({ parentCommentId: commentId });
    
    res.status(200).json({
        comments,
        totalPages: Math.ceil(totalComments / limitNumber),
        currentPage: pageNumber,
    });
};