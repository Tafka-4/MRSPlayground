import { Request, Response } from 'express';
import Novel from '../model/novelModel.js';
import Episode from '../model/episodeModel.js';
import novelError from '../utils/error/novelError.js';
import episodeError from '../utils/error/episodeError.js';
import userError from '../utils/error/userError.js';

export const createEpisode = async (req: Request, res: Response) => {
  const { novelId, title, content, authorComment } = req.body;
  const userId = req.user?.userid;
  if (!userId) throw new userError.UserNotLoginError('Login required');

  const novel = await Novel.findOne({ novelId }).select('author episodeCount');
  if (!novel) throw new novelError.NovelNotFoundError('Novel not found');
  if (userId !== novel.author) throw new userError.UserForbiddenError('You are not the author of this novel');

  const updatedNovel = await Novel.findOneAndUpdate({ novelId, author: userId }, { $inc: { episodeCount: 1 } }, { new: true, projection: 'episodeCount' });
  if (!updatedNovel) throw new novelError.NovelError('Failed to update novel episode count or authorization failed.');

  const episode = await Episode.create({
    novelId,
    episodeNumber: updatedNovel.episodeCount,
    title,
    content,
    author: userId,
    authorComment: authorComment ? authorComment : null
  });

  res.status(201).json(episode);
};

export const getEpisode = async (req: Request, res: Response) => {
  const { episodeId } = req.params as { episodeId: string };
  const episode = await Episode.findOne({ episodeId });
  if (!episode) throw new episodeError.EpisodeNotFoundError('Episode not found');
  const updatedEpisode = await Episode.findOneAndUpdate({ episodeId }, { $inc: { viewCount: 1 } }, { new: true });
  if (!updatedEpisode) throw new episodeError.EpisodeNotFoundError('Episode not found during view count update');
  res.status(200).json(updatedEpisode);
};

export const updateEpisode = async (req: Request, res: Response) => {
  const { episodeId } = req.params as { episodeId: string };
  const { title, content, authorComment } = req.body;
  const userId = req.user?.userid;
  if (!userId) throw new userError.UserNotLoginError('Login required');
  const existingEpisode = await Episode.findOne({ episodeId }).select('novelId');
  if (!existingEpisode) throw new episodeError.EpisodeNotFoundError('Episode not found');
  const novel = await Novel.findOne({ novelId: existingEpisode.novelId }).select('author');
  if (!novel) throw new novelError.NovelNotFoundError('Associated novel not found');
  if (userId !== novel.author) throw new userError.UserForbiddenError('You are not the author of this episode');
  const updatedEpisode = await Episode.findOneAndUpdate(
    { episodeId },
    { title, content, authorComment: authorComment ? authorComment : null, updatedAt: new Date() },
    { new: true }
  );
  if (!updatedEpisode) throw new episodeError.EpisodeInteractionFailedError('Failed to update episode');
  await updatedEpisode.save();
  res.status(200).json(updatedEpisode);
};

export const deleteEpisode = async (req: Request, res: Response) => {
  const { episodeId } = req.params as { episodeId: string };
  const userId = req.user?.userid;
  if (!userId) throw new userError.UserNotLoginError('Login required');
  const episode = await Episode.findOne({ episodeId }).select('novelId episodeNumber');
  if (!episode) throw new episodeError.EpisodeNotFoundError('Episode not found');
  const novel = await Novel.findOne({ novelId: episode.novelId }).select('author episodeCount');
  if (!novel) throw new novelError.NovelNotFoundError('Associated novel not found');
  if (userId !== novel.author) throw new userError.UserForbiddenError('You are not the author of this episode');
  if (novel.episodeCount !== episode.episodeNumber) throw new episodeError.EpisodeError('Bad Request: Only the last episode can be deleted.');

  const [deleteResult, updatedNovel] = await Promise.all([
    Episode.deleteOne({ episodeId }),
    Novel.findOneAndUpdate({ novelId: episode.novelId, author: userId }, { $inc: { episodeCount: -1 } }, { new: true, projection: '_id' })
  ]);
  if (deleteResult.deletedCount === 0) throw new episodeError.EpisodeDeleteFailedError('Failed to delete episode during atomic operation');
  if (!updatedNovel) throw new novelError.NovelError('Failed to decrement episode count or authorization failed.');
  res.status(200).json({ message: 'Episode deleted successfully' });
};

export const likeEpisode = async (req: Request, res: Response) => {
  const { episodeId } = req.params as { episodeId: string };
  const userId = req.user?.userid;
  if (!userId) throw new userError.UserNotLoginError('Login required to like episode');
  const episode = await Episode.findOne({ episodeId });
  if (!episode) throw new episodeError.EpisodeNotFoundError('Episode not found');
  await episode.like(userId);
  await episode.save();
  res.status(200).json({ message: 'Episode liked successfully', likeCount: episode.likeCount, dislikeCount: episode.dislikeCount });
};

export const dislikeEpisode = async (req: Request, res: Response) => {
  const { episodeId } = req.params as { episodeId: string };
  const userId = req.user?.userid;
  if (!userId) throw new userError.UserNotLoginError('Login required to dislike episode');
  const episode = await Episode.findOne({ episodeId });
  if (!episode) throw new episodeError.EpisodeNotFoundError('Episode not found');
  await episode.dislike(userId);
  await episode.save();
  res.status(200).json({ message: 'Episode disliked successfully', likeCount: episode.likeCount, dislikeCount: episode.dislikeCount });
};


