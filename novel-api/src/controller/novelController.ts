import { Request, Response } from 'express';
import crypto from 'crypto';
import { escape } from 'html-escaper';
import Novel from '../model/novelModel.js';
import { useNovelRepo } from '../repo/novelRepo.js';
import novelError from '../utils/error/novelError.js';
import userError from '../utils/error/userError.js';

const callUserService = async (endpoint: string, options: RequestInit = {}) => {
    const userServiceUrl = process.env.USER_SERVICE_URL || 'http://user-api:3001';
    const response = await fetch(`${userServiceUrl}${endpoint}`, {
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        ...options
    });
    if (!response.ok) throw new Error(`User Service error: ${response.status}`);
    return response.json();
};

export const createNovel = async (req: Request, res: Response) => {
    const { title, description, thumbnailImage, visibility, accessCode } = req.body as any;
    const userId = req.user?.userid;
    if (!userId) throw new userError.UserNotLoginError('Login required to create novel');
    if (!title || !description) throw new novelError.NovelError('Title and description are required');

    const repo = useNovelRepo();
    const novel = await repo.create({
        novelId: crypto.randomUUID(),
        title: escape(title),
        description: escape(description),
        thumbnailImage: escape(thumbnailImage || ''),
        author: userId,
        status: 'ongoing',
        visibility: visibility === 'code' || visibility === 'private' ? visibility : 'public',
        accessCodeHash: visibility === 'code' && accessCode ? crypto.createHash('sha256').update(String(accessCode)).digest('hex') : ''
    } as any);

    try {
        await callUserService(`/api/users/add-novel`, { method: 'PUT', body: JSON.stringify({ userid: userId, novelId: novel.novelId }) });
    } catch (e) {
        console.warn('User service add-novel failed, continuing');
    }

    res.status(201).json({ success: true, novel });
};

export const getNovel = async (req: Request, res: Response) => {
    const { novelId } = req.params as { novelId: string };
    const repo = useNovelRepo();
    const novel = await repo.findById(novelId);
    if (!novel) throw new novelError.NovelNotFoundError('Novel not found');
    // Access control for visibility
    if (novel.visibility === 'private') {
        const userId = req.user?.userid;
        if (!userId || userId !== novel.author) throw new userError.UserForbiddenError('This novel is private');
    } else if (novel.visibility === 'code') {
        const code = (req.query.code as string | undefined) || (req.headers['x-access-code'] as string | undefined) || '';
        if (!code) {
            // allow author
            const userId = req.user?.userid;
            if (!userId || userId !== novel.author) throw new userError.UserForbiddenError('Access code required');
        } else {
            const ok = crypto.createHash('sha256').update(String(code)).digest('hex') === (novel as any).accessCodeHash;
            if (!ok) throw new userError.UserForbiddenError('Invalid access code');
        }
    }
    await repo.increaseView(novelId);
    res.status(200).json({ success: true, novel });
};

export const updateNovel = async (req: Request, res: Response) => {
    const { novelId } = req.params as { novelId: string };
    const { title, description, visibility, accessCode } = req.body as any;
    const userId = req.user?.userid;
    if (!userId) throw new userError.UserNotLoginError('Login required');

    const updateData: any = {};
    if (title) updateData.title = escape(title);
    if (description) updateData.description = escape(description);
    if (visibility) updateData.visibility = visibility === 'code' || visibility === 'private' ? visibility : 'public';
    if (typeof accessCode !== 'undefined') updateData.accessCodeHash = accessCode ? crypto.createHash('sha256').update(String(accessCode)).digest('hex') : '';
    if (Object.keys(updateData).length === 0) throw new novelError.NovelError('No fields provided for update');
    updateData.updatedAt = new Date();

    const repo = useNovelRepo();
    const updatedNovel = await repo.updateIfAuthor(novelId, userId!, updateData);
    if (!updatedNovel) throw new userError.UserForbiddenError('You are not allowed to update this novel');
    res.status(200).json({ success: true, novel: updatedNovel });
};

export const deleteNovel = async (req: Request, res: Response) => {
    const { novelId } = req.params as { novelId: string };
    const userId = req.user?.userid;
    if (!userId) throw new userError.UserNotLoginError('Login required');

    const repo = useNovelRepo();
    const ok = await repo.deleteIfAuthor(novelId, userId!);
    if (!ok) throw new userError.UserForbiddenError('You are not allowed to delete this novel');
    await callUserService(`/api/users/remove-novel`, { method: 'PUT', body: JSON.stringify({ userid: userId, novelId }) }).catch(() => null);
    res.status(200).json({ success: true, message: 'Novel deleted successfully' });
};

export const likeNovel = async (req: Request, res: Response) => {
    const { novelId } = req.params as { novelId: string };
    const userId = req.user?.userid;
    if (!userId) throw new userError.UserNotLoginError('Login required to like novel');
    const novel = await Novel.findOne({ novelId });
    if (!novel) throw new novelError.NovelNotFoundError('Novel not found');
    await novel.like(userId);
    res.status(200).json({ success: true, message: 'Novel liked successfully', likeCount: novel.likeCount, dislikeCount: novel.dislikeCount });
};

export const dislikeNovel = async (req: Request, res: Response) => {
    const { novelId } = req.params as { novelId: string };
    const userId = req.user?.userid;
    if (!userId) throw new userError.UserNotLoginError('Login required to dislike novel');
    const novel = await Novel.findOne({ novelId });
    if (!novel) throw new novelError.NovelNotFoundError('Novel not found');
    await novel.dislike(userId);
    res.status(200).json({ success: true, message: 'Novel disliked successfully', likeCount: novel.likeCount, dislikeCount: novel.dislikeCount });
};

export const favoriteNovel = async (req: Request, res: Response) => {
    const { novelId } = req.params as { novelId: string };
    const userId = req.user?.userid;
    if (!userId) throw new userError.UserNotLoginError('Login required to favorite novel');
    const novel = await Novel.findOne({ novelId });
    if (!novel) throw new novelError.NovelNotFoundError('Novel not found');
    await novel.favorite(userId);
    res.status(200).json({ success: true, message: 'Novel favorited successfully', favoriteCount: novel.favoriteCount });
};

export const uploadThumbnailImage = async (req: Request, res: Response) => {
    const { novelId } = req.params as { novelId: string };
    const userId = req.user?.userid;
    const file = req.file as Express.Multer.File | undefined;
    console.log('[controller:uploadThumbnailImage] start', {
        url: (req as any)?.originalUrl,
        method: (req as any)?.method,
        hasFile: !!file,
        fieldname: file?.fieldname,
        originalname: file?.originalname,
        mimetype: file?.mimetype,
        size: (file as any)?.size,
        hasBuffer: !!file?.buffer
    });
    if (!file) {
        console.log('[controller:uploadThumbnailImage] no file on req.file');
        throw new novelError.NovelError('No file uploaded');
    }
    if (!userId) throw new userError.UserNotLoginError('Login required');
    const novel = await Novel.findOne({ novelId }).select('author thumbnailImage');
    if (!novel) throw new novelError.NovelNotFoundError('Novel not found');
    if (userId !== novel.author) throw new userError.UserForbiddenError('You are not allowed to upload thumbnail image for this novel');
    const uploadResult = await novel.uploadThumbnailImage(file);
    console.log('[controller:uploadThumbnailImage] upload done', { location: uploadResult });
    novel.thumbnailImage = uploadResult;
    await novel.save();
    res.status(200).json({ success: true, message: 'Thumbnail image uploaded successfully', location: uploadResult });
};

export const deleteThumbnailImage = async (req: Request, res: Response) => {
    const { novelId } = req.params as { novelId: string };
    const userId = req.user?.userid;
    if (!userId) throw new userError.UserNotLoginError('Login required');
    const novel = await Novel.findOne({ novelId }).select('author thumbnailImage');
    if (!novel) throw new novelError.NovelNotFoundError('Novel not found');
    if (userId !== novel.author) throw new userError.UserForbiddenError('You are not allowed to delete thumbnail image for this novel');
    if (!novel.thumbnailImage || novel.thumbnailImage === '') throw new novelError.NovelError('No thumbnail image to delete');
    await novel.deleteThumbnailImage();
    res.status(200).json({ success: true, message: 'Thumbnail image deleted successfully' });
};

export const getNovelList = async (req: Request, res: Response) => {
    const { query, limit, page, sort, status, size } = req.query as Record<string, string | undefined>;
    const limitNumber = parseInt(limit || size || '') || 10;
    const pageNumber = parseInt(page || '') || 1;
    if (limitNumber < 1 || limitNumber > 100) throw new novelError.NovelError('Limit must be between 1 and 100');

    const filter: any = {};
    if (query) filter.title = { $regex: query, $options: 'i' };
    if (status) filter.status = status;

    let sortOptions: any = { createdAt: -1 };
    switch (sort) {
        case 'views':
            sortOptions = { viewCount: -1 };
            break;
        case 'likes':
            sortOptions = { likeCount: -1 };
            break;
        case 'favorites':
            sortOptions = { favoriteCount: -1 };
            break;
        case 'episodes':
            sortOptions = { episodeCount: -1 };
            break;
        case 'recent':
            sortOptions = { updatedAt: -1 };
            break;
    }

    const novels = await Novel.find(filter).sort(sortOptions).limit(limitNumber).skip((pageNumber - 1) * limitNumber);
    const totalNovels = await Novel.countDocuments(filter);
    res.status(200).json({ success: true, novels, totalPages: Math.ceil(totalNovels / limitNumber), currentPage: pageNumber });
};

export const getNovelListByAuthor = async (req: Request, res: Response) => {
    const { author } = req.params as { author: string };
    const novels = await Novel.find({ author });
    res.status(200).json({ success: true, novels });
};


