import { Request, Response } from 'express';
import Comment from '../model/commentModel.js';
import commentError from '../utils/error/commentError.js';

const callNovelApi = async (endpoint: string, options: RequestInit = {}) => {
	const base = process.env.NOVEL_API_URL || 'http://novel-api:5002';
	const response = await fetch(`${base}${endpoint}`, { headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
	return response;
};

const callPostApi = async (endpoint: string, options: RequestInit = {}) => {
	const base = process.env.POST_API_URL || 'http://post-api:5003';
	const response = await fetch(`${base}${endpoint}`, { headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
	return response;
};

const callGalleryApi = async (endpoint: string, options: RequestInit = {}) => {
	const base = process.env.GALLERY_API_URL || 'http://gallery-api:5001';
	const response = await fetch(`${base}${endpoint}`, { headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
	return response;
};

export const createComment = async (req: Request, res: Response) => {
	const { galleryId, novelId, targetId, targetType, content, parentId, isHidden, tempPassword } = req.body;
	const userid = req.user?.userid;
	const ip = req.ip;
	const userAgent = req.headers['user-agent'];
	if (galleryId && novelId) throw new commentError.CommentError('Cannot have both galleryId and novelId');
	if (!galleryId && !novelId) throw new commentError.CommentError('Must have either galleryId or novelId');
	if (galleryId) await findGalleryById(galleryId);
	if (novelId) await findNovelById(novelId);
	await findTargetById(targetId, targetType);
	if (typeof isHidden !== 'boolean') throw new commentError.CommentError('Invalid isHidden type');
	if (isHidden && !tempPassword) throw new commentError.CommentError('Temporary password is required for hidden comments');
	if (tempPassword && !/^[a-zA-Z0-9]{8,}$/.test(tempPassword)) throw new commentError.CommentError('Invalid temporary password format (must be at least 8 alphanumeric characters)');
	if (!isHidden && tempPassword) throw new commentError.CommentError('Temporary password is not allowed for public comments');
	const commentData = { galleryId, novelId, commentTargetId: targetId, commentTargetType: targetType, commentParentId: parentId, content, isHidden, author: isHidden ? `익명(${ip?.split('.').slice(0, 1).join('.')})` : userid, clientInfo: { ip, userAgent }, ...(isHidden ? { tempPassword } : {}) };
	const comment = new Comment(commentData as any);
	const savedComment = await saveAndReturnComment(comment);
	res.status(201).json({ success: true, comment: savedComment });
};

export const getComments = async (req: Request, res: Response) => {
	const { galleryId, novelId, targetId, targetType, page = 1, limit = 20, sort = 'latest' } = req.query as any;
	if (galleryId && galleryId !== 'undefined') await findGalleryById(galleryId);
	if (novelId && novelId !== 'undefined') await findNovelById(novelId);
	if (!targetType) throw new commentError.CommentError('targetType is required');
	const query: any = { commentTargetType: targetType };
	if (targetId && targetId !== 'undefined') query.commentTargetId = targetId;
	if (galleryId && galleryId !== 'undefined') query.galleryId = galleryId;
	if (novelId && novelId !== 'undefined') query.novelId = novelId;
	let sortOption: any = { createdAt: -1 };
	if (sort === 'oldest') sortOption = { createdAt: 1 };
	if (sort === 'likes') sortOption = { likeCount: -1 };
	const pageNum = Number(page) || 1;
	const limitNum = Number(limit) || 20;
	const comments = await Comment.find(query)
		.sort(sortOption)
		.skip((pageNum - 1) * limitNum)
		.limit(limitNum)
		.exec();
	res.status(200).json({ success: true, comments });
};

export const getComment = async (req: Request, res: Response) => {
	const { commentId } = req.params as any;
	const comment = await Comment.findOne({ commentId }).populate('commentTargetId').populate('commentParentId').exec();
	if (!comment) throw new commentError.CommentNotFoundError('Comment not found');
	res.status(200).json({ success: true, comment });
};

export const updateComment = async (req: Request, res: Response) => {
	const { commentId, tempPassword } = req.params as any;
	const { content } = req.body;
	const userid = req.user?.userid;
	const comment = await Comment.findOne({ commentId });
	if (!comment) throw new commentError.CommentNotFoundError('Comment not found');
	if ((comment as any).author !== userid) throw new commentError.CommentNotAuthorError('Comment not authorized');
	if ((comment as any).isHidden && (comment as any).tempPassword !== tempPassword) throw new commentError.CommentError('Invalid temp password');
	if ((comment as any).isDeleted) throw new commentError.CommentError('Cannot update deleted comment');
	const hasReplies = await Comment.findOne({ commentParentId: commentId, isDeleted: false });
	if (hasReplies) throw new commentError.CommentError('Cannot update comment with replies');
	(comment as any).content = content;
	await (comment as any).save();
	res.status(200).json({ success: true, message: 'Comment updated successfully' });
};

export const deleteComment = async (req: Request, res: Response) => {
	const { commentId } = req.params as any;
	const tempPassword = (req.params as any).tempPassword ?? (req.query as any).tempPassword ?? (req.body as any)?.tempPassword;
	const userid = req.user?.userid;
	const comment = await Comment.findOne({ commentId });
	if (!comment) throw new commentError.CommentNotFoundError('Comment not found');
	let isGalleryManager = false;
	if ((comment as any).galleryId) {
		const resp = await callGalleryApi(`/api/v1/galleries/${(comment as any).galleryId}`);
		if (resp.ok) {
			const data: any = await resp.json();
			const gallery: any = data.gallery || data;
			if (gallery && (gallery.galleryAdmin === userid || (gallery.galleryManager || []).includes(userid as string))) isGalleryManager = true;
		}
	}
	let isNovelAuthor = false;
	if ((comment as any).novelId) {
		const resp = await callNovelApi(`/api/v1/novels/${(comment as any).novelId}`);
		if (resp.ok) {
			const novelResp: any = await resp.json();
			const novel = novelResp.novel || novelResp;
			if (novel && novel.author === userid) isNovelAuthor = true;
		}
	}
	if (isGalleryManager || isNovelAuthor) {
		await Comment.deleteOne({ commentId });
		return res.status(200).json({ success: true, message: 'Comment deleted successfully' });
	}
	if ((comment as any).author !== userid) throw new commentError.CommentNotAuthorError('Comment not authorized');
	if ((comment as any).isHidden && (comment as any).tempPassword !== tempPassword) throw new commentError.CommentError('Invalid temp password');
	const hasReplies = await Comment.findOne({ commentParentId: commentId, isDeleted: false });
	if (hasReplies) {
		(comment as any).content = '삭제된 댓글입니다.';
		(comment as any).isDeleted = true;
		await (comment as any).save();
		return res.status(200).json({ success: true, message: 'Comment content updated due to existing replies' });
	}
	await Comment.deleteOne({ commentId });
	res.status(200).json({ success: true, message: 'Comment deleted successfully' });
};

export const likeComment = async (req: Request, res: Response) => {
	const { commentId } = req.params as any;
	const userid = req.user?.userid;
	const comment = await Comment.findOne({ commentId });
	if (!comment) throw new commentError.CommentNotFoundError('Comment not found');
	await (comment as any).like(userid as string);
	res.status(200).json({ success: true, message: 'Comment liked successfully' });
};

export const dislikeComment = async (req: Request, res: Response) => {
	const { commentId } = req.params as any;
	const userid = req.user?.userid;
	const comment = await Comment.findOne({ commentId });
	if (!comment) throw new commentError.CommentNotFoundError('Comment not found');
	await (comment as any).dislike(userid as string);
	res.status(200).json({ success: true, message: 'Comment disliked successfully' });
};

export const getCommentsWithPagination = async (req: Request, res: Response) => {
	const { galleryId, novelId, targetId, targetType } = req.params as any;
	const { page = 1, limit = 10, sort = 'latest' } = req.query as any;
	if (galleryId && galleryId !== 'undefined') await findGalleryById(galleryId);
	if (novelId && novelId !== 'undefined') await findNovelById(novelId);
	await findTargetById(targetId, targetType);
	const query: any = { commentTargetId: targetId, commentTargetType: targetType, isDeleted: false };
	if (galleryId && galleryId !== 'undefined') query.galleryId = galleryId;
	if (novelId && novelId !== 'undefined') query.novelId = novelId;
	let sortOption: any = {};
	switch (sort) {
		case 'latest': sortOption = { createdAt: -1 }; break;
		case 'oldest': sortOption = { createdAt: 1 }; break;
		case 'likes': sortOption = { likes: -1 }; break;
		default: sortOption = { createdAt: -1 };
	}
	const totalComments = await Comment.countDocuments(query);
	const comments = await Comment.find(query).sort(sortOption).skip((Number(page) - 1) * Number(limit)).limit(Number(limit)).populate('commentTargetId').populate('commentParentId').exec();
	const totalPages = Math.ceil(totalComments / Number(limit));
	res.status(200).json({ success: true, comments, pagination: { currentPage: Number(page), totalPages, totalComments, hasNext: Number(page) < totalPages, hasPrev: Number(page) > 1 } });
};

const findTargetById = async (targetId: string, targetType: string) => {
	let target: any;
	switch (targetType) {
		case 'post': {
			const resp = await callPostApi(`/api/v1/posts/id/${targetId}`);
			if (!resp.ok) throw new commentError.CommentNotFoundError('Post not found');
			target = await resp.json();
			break;
		}
		case 'episode': {
			const resp = await callNovelApi(`/api/v1/episodes/${targetId}`);
			if (!resp.ok) throw new commentError.CommentNotFoundError('Episode not found');
			target = await resp.json();
			break;
		}
		default:
			throw new commentError.CommentError('Invalid target type');
	}
	return target;
};

const findGalleryById = async (galleryId: string) => {
	const resp = await callGalleryApi(`/api/v1/galleries/${galleryId}`);
	if (!resp.ok) throw new commentError.CommentNotFoundError('Gallery not found');
	return resp.json();
};

const findNovelById = async (novelId: string) => {
	const resp = await callNovelApi(`/api/v1/novels/${novelId}`);
	if (!resp.ok) throw new commentError.CommentNotFoundError('Novel not found');
	return resp.json();
};

const saveAndReturnComment = async (comment: any) => {
	await comment.save();
	const populatedComment = await Comment.findOne({ commentId: comment.commentId }).populate('commentTargetId').populate('commentParentId').exec();
	return populatedComment;
};


