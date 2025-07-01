import { Request, Response } from "express";
import Post from "../model/postModel.js";
import Gallery from "../model/galleryModel.js";
import postError from "../utils/error/postError.js";
import userError from "../utils/error/userError.js";
import galleryError from "../utils/error/galleryError.js";

// login required
const createPost = async (req: Request, res: Response) => {
    const { galleryId, title, content, isHidden, tempPassword } = req.body;
    const userid = req.user?.userid;
    const ip = req.ip;
    const userAgent = req.headers["user-agent"];

    const galleryExists = await Gallery.findOne({ galleryId });
    if (!galleryExists) {
        throw new galleryError.GalleryNotFoundError("Gallery not found");
    }

    if (typeof isHidden !== "boolean") {
        throw new postError.PostError("Invalid isHidden type");
    }
    if (isHidden && !tempPassword) {
        throw new postError.PostError("Temporary password is required for hidden posts");
    }
    if (tempPassword && !/^[a-zA-Z0-9]{8,}$/.test(tempPassword)) {
        throw new postError.PostError("Invalid temporary password format (must be at least 8 alphanumeric characters)");
    }
    if (!isHidden && tempPassword) {
        throw new postError.PostError("Temporary password is not allowed for public posts");
    }

    const postData = {
        galleryId,
        title,
        content,
        isHidden,
        author: isHidden ? `익명(${ip?.split(".").slice(0, 1).join(".")})` : userid,
        clientInfo: { ip, userAgent },
        ...(isHidden && { tempPassword }),
    };

    const post = new Post(postData);
    await post.save();

    res.status(201).json({
        success: true,
        post
    });
};

// login required
const getPosts = async (req: Request, res: Response) => {
    const { galleryId } = req.params;
    if (!(await Gallery.findOne({ galleryId }))) {
        throw new galleryError.GalleryNotFoundError("Gallery not found");
    }
    const { page, limit } = req.query;
    const posts = await Post.find({ galleryId }).skip((Number(page) - 1) * Number(limit)).limit(Number(limit));
    res.status(200).json({
        success: true,
        posts
    });
};

// login required
const getPost = async (req: Request, res: Response) => {
    const { postId, galleryId } = req.params;
    if (!(await Gallery.findOne({ galleryId }))) {
        throw new galleryError.GalleryNotFoundError("Gallery not found");
    }
    const post = await Post.findOne({ postId, galleryId });
    if (!post) throw new postError.PostNotFoundError("Post not found");
    res.status(200).json({
        success: true,
        post
    });
};

// login required
const updatePost = async (req: Request, res: Response) => {
    const { postId, galleryId, tempPassword } = req.params;
    const { title, content } = req.body;
    const userid = req.user?.userid;
    if (!(await Gallery.findOne({ galleryId }))) {
        throw new galleryError.GalleryNotFoundError("Gallery not found");
    }
    const post = await Post.findOne({ postId, galleryId });
    if (!post) throw new postError.PostNotFoundError("Post not found");
    if (post.author !== userid) throw new postError.PostNotAuthorError("Post not authorized");
    if (post.isHidden && post.tempPassword !== tempPassword) throw new postError.PostError("Invalid temp password");
    post.title = title;
    post.content = content;
    await post.save();
    res.status(200).json({
        success: true,
        post
    });
};

// login required
const deletePost = async (req: Request, res: Response) => {
    const { postId, galleryId, tempPassword } = req.params;
    const userid = req.user?.userid;
    const post = await Post.findOne({ postId, galleryId });
    const gallery = await Gallery.findOne({ galleryId });
    if (!post || !gallery) {
        throw new postError.PostNotFoundError("Post not found");
    }
    if (gallery.galleryAdmin === userid || gallery.galleryManager.includes(userid as string)) {
        await post.deleteOne();
        res.status(200).json({
            success: true,
            message: "Post deleted"
        });
        return;
    }
    if (post.author !== userid) {
        throw new postError.PostNotAuthorError("Post not authorized");
    }
    if (post.isHidden && post.tempPassword !== tempPassword) {
        throw new postError.PostError("Invalid temp password");
    }
    
    await post.deleteOne();
    res.status(200).json({
        success: true,
        message: "Post deleted"
    });
};

// login required
const likePost = async (req: Request, res: Response) => {
    const { postId, galleryId } = req.params;
    const userid = req.user?.userid;
    if (!(await Gallery.findOne({ galleryId }))) {
        throw new galleryError.GalleryNotFoundError("Gallery not found");
    }
    const post = await Post.findOne({ postId, galleryId });
    if (!post) throw new postError.PostNotFoundError("Post not found");
    await post.like(userid as string);
    res.status(200).json({
        success: true,
        message: "Post liked"
    });
};

// login required
const dislikePost = async (req: Request, res: Response) => {
    const { postId, galleryId } = req.params;
    const userid = req.user?.userid;
    if (!(await Gallery.findOne({ galleryId }))) {
        throw new galleryError.GalleryNotFoundError("Gallery not found");
    }
    const post = await Post.findOne({ postId, galleryId });
    if (!post) throw new postError.PostNotFoundError("Post not found");
    await post.dislike(userid as string);
    res.status(200).json({
        success: true,
        message: "Post disliked"
    });
};

export { createPost, getPosts, getPost, updatePost, deletePost, likePost, dislikePost };
