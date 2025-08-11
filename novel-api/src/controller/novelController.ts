import { Request, Response } from 'express';
import { escape } from 'html-escaper';
import Novel from '../model/novelModel.js';
import novelError from '../utils/error/novelError.js';
import userError from '../utils/error/userError.js';

const callUserService = async (endpoint: string, options: RequestInit = {}) => {
  const userServiceUrl = process.env.USER_SERVICE_URL || 'http://user-service:3001';
  const response = await fetch(`${userServiceUrl}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  if (!response.ok) throw new Error(`User Service error: ${response.status}`);
  return response.json();
};

export const createNovel = async (req: Request, res: Response) => {
  const { title, description, thumbnailImage } = req.body;
  const userId = req.user?.userid;
  if (!userId) throw new userError.UserNotLoginError('Login required to create novel');
  if (!title || !description) throw new novelError.NovelError('Title and description are required');

  const novel = await Novel.create({
    title: escape(title),
    description: escape(description),
    thumbnailImage: escape(thumbnailImage || ''),
    author: userId,
    status: 'ongoing'
  });

  try {
    await callUserService(`/api/users/add-novel`, { method: 'PUT', body: JSON.stringify({ userid: userId, novelId: novel.novelId }) });
  } catch {}

  res.status(201).json(novel);
};

export const getNovel = async (req: Request, res: Response) => {
  const { novelId } = req.params as { novelId: string };
  const novel = await Novel.findOne({ novelId });
  if (!novel) throw new novelError.NovelNotFoundError('Novel not found');
  await novel.increaseViewCount();
  res.status(200).json(novel);
};

export const updateNovel = async (req: Request, res: Response) => {
  const { novelId } = req.params as { novelId: string };
  const { title, description } = req.body;
  const userId = req.user?.userid;
  if (!userId) throw new userError.UserNotLoginError('Login required');

  const updateData: any = {};
  if (title) updateData.title = escape(title);
  if (description) updateData.description = escape(description);
  if (Object.keys(updateData).length === 0) throw new novelError.NovelError('No fields provided for update');
  updateData.updatedAt = new Date();

  const updatedNovel = await Novel.findOneAndUpdate({ novelId, author: userId }, { $set: updateData }, { new: true });
  if (!updatedNovel) {
    const exists = await Novel.exists({ novelId });
    if (!exists) throw new novelError.NovelNotFoundError('Novel not found');
    throw new userError.UserForbiddenError('You are not allowed to update this novel');
  }
  res.status(200).json(updatedNovel);
};

export const deleteNovel = async (req: Request, res: Response) => {
  const { novelId } = req.params as { novelId: string };
  const userId = req.user?.userid;
  if (!userId) throw new userError.UserNotLoginError('Login required');

  const novel = await Novel.findOne({ novelId }).select('author');
  if (!novel) throw new novelError.NovelNotFoundError('Novel not found');
  if (userId !== novel.author) throw new userError.UserForbiddenError('You are not allowed to delete this novel');

  const [deleteResult] = await Promise.all([
    Novel.deleteOne({ novelId }),
    callUserService(`/api/users/remove-novel`, { method: 'PUT', body: JSON.stringify({ userid: userId, novelId }) }).catch(() => null)
  ]);
  if (deleteResult.deletedCount === 0) throw new novelError.NovelError('Failed to delete novel');
  res.status(200).json({ message: 'Novel deleted successfully' });
};

export const likeNovel = async (req: Request, res: Response) => {
  const { novelId } = req.params as { novelId: string };
  const userId = req.user?.userid;
  if (!userId) throw new userError.UserNotLoginError('Login required to like novel');
  const novel = await Novel.findOne({ novelId });
  if (!novel) throw new novelError.NovelNotFoundError('Novel not found');
  await novel.like(userId);
  res.status(200).json({ message: 'Novel liked successfully', likeCount: novel.likeCount, dislikeCount: novel.dislikeCount });
};

export const dislikeNovel = async (req: Request, res: Response) => {
  const { novelId } = req.params as { novelId: string };
  const userId = req.user?.userid;
  if (!userId) throw new userError.UserNotLoginError('Login required to dislike novel');
  const novel = await Novel.findOne({ novelId });
  if (!novel) throw new novelError.NovelNotFoundError('Novel not found');
  await novel.dislike(userId);
  res.status(200).json({ message: 'Novel disliked successfully', likeCount: novel.likeCount, dislikeCount: novel.dislikeCount });
};

export const favoriteNovel = async (req: Request, res: Response) => {
  const { novelId } = req.params as { novelId: string };
  const userId = req.user?.userid;
  if (!userId) throw new userError.UserNotLoginError('Login required to favorite novel');
  const novel = await Novel.findOne({ novelId });
  if (!novel) throw new novelError.NovelNotFoundError('Novel not found');
  await novel.favorite(userId);
  res.status(200).json({ message: 'Novel favorited successfully', favoriteCount: novel.favoriteCount });
};

export const uploadThumbnailImage = async (req: Request, res: Response) => {
  const { novelId } = req.params as { novelId: string };
  const userId = req.user?.userid;
  const file = req.file as Express.Multer.File | undefined;
  if (!userId) throw new userError.UserNotLoginError('Login required');
  if (!file) throw new novelError.NovelError('No file uploaded');
  const novel = await Novel.findOne({ novelId }).select('author thumbnailImage');
  if (!novel) throw new novelError.NovelNotFoundError('Novel not found');
  if (userId !== novel.author) throw new userError.UserForbiddenError('You are not allowed to upload thumbnail image for this novel');
  const uploadResult = await novel.uploadThumbnailImage(file);
  novel.thumbnailImage = uploadResult;
  await novel.save();
  res.status(200).json({ message: 'Thumbnail image uploaded successfully', location: uploadResult });
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
  res.status(200).json({ message: 'Thumbnail image deleted successfully' });
};

export const getNovelList = async (req: Request, res: Response) => {
  const { query, limit, page, sort, genre, status } = req.query as Record<string, string | undefined>;
  const limitNumber = parseInt(limit || '') || 10;
  const pageNumber = parseInt(page || '') || 1;
  if (limitNumber < 1 || limitNumber > 100) throw new novelError.NovelError('Limit must be between 1 and 100');

  const filter: any = {};
  if (query) filter.title = { $regex: query, $options: 'i' };
  if (genre) filter.genre = genre;
  if (status) filter.status = status;

  let sortOptions: any = { createdAt: -1 };
  if (sort === 'views') sortOptions = { viewCount: -1 };
  else if (sort === 'likes') sortOptions = { likeCount: -1 };
  else if (sort === 'favorites') sortOptions = { favoriteCount: -1 };
  else if (sort === 'episodes') sortOptions = { episodeCount: -1 };
  else if (sort === 'recent') sortOptions = { updatedAt: -1 };

  const novels = await Novel.find(filter).sort(sortOptions).limit(limitNumber).skip((pageNumber - 1) * limitNumber);
  const totalNovels = await Novel.countDocuments(filter);
  res.status(200).json({ novels, totalPages: Math.ceil(totalNovels / limitNumber), currentPage: pageNumber });
};

export const getNovelListByAuthor = async (req: Request, res: Response) => {
  const { author } = req.params as { author: string };
  const novels = await Novel.find({ author });
  res.status(200).json(novels);
};


