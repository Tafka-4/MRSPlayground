import { Request, Response } from 'express';
import crypto from 'crypto';
import { useEpisodeRepo } from '../repo/episodeRepo.js';
import episodeError from '../utils/error/episodeError.js';
import userError from '../utils/error/userError.js';
import Novel from '../model/novelModel.js';

export const createEpisode = async (req: Request, res: Response) => {
    const { novelId, title, content, authorComment } = req.body;
    const userId = req.user?.userid;
    if (!userId) throw new userError.UserNotLoginError('Login required');

    const repo = useEpisodeRepo();
    const episode = await repo.createEpisode(novelId, userId, title, content, authorComment);
    res.status(201).json({ success: true, episode });
};

export const getEpisode = async (req: Request, res: Response) => {
    const { episodeId } = req.params as { episodeId: string };
    const repo = useEpisodeRepo();
    const episode = await repo.findById(episodeId);
    if (!episode) throw new episodeError.EpisodeNotFoundError('Episode not found');
    const novel = await Novel.findOne({ novelId: episode.novelId }).select('author visibility accessCodeHash');
    if (!novel) throw new episodeError.EpisodeNotFoundError('Episode not found');
    if ((novel as any).visibility === 'private') {
        const userId = (req as any).user?.userid;
        if (!userId || userId !== (novel as any).author) throw new userError.UserForbiddenError('This novel is private');
    } else if ((novel as any).visibility === 'code') {
        const code = (req.query.code as string | undefined) || (req.headers['x-access-code'] as string | undefined) || '';
        if (!code) {
            const userId = (req as any).user?.userid;
            if (!userId || userId !== (novel as any).author) throw new userError.UserForbiddenError('Access code required');
        } else {
            const ok = crypto.createHash('sha256').update(String(code)).digest('hex') === (novel as any).accessCodeHash;
            if (!ok) throw new userError.UserForbiddenError('Invalid access code');
        }
    }
    await repo.increaseView(episodeId);
    res.status(200).json({ success: true, episode });
};

export const listEpisodesByNovel = async (req: Request, res: Response) => {
    const { novelId } = req.params as { novelId: string };
    const repo = useEpisodeRepo();
    const novel = await Novel.findOne({ novelId }).select('author visibility accessCodeHash');
    if (!novel) throw new episodeError.EpisodeNotFoundError('Episode not found');
    if ((novel as any).visibility === 'private') {
        const userId = (req as any).user?.userid;
        if (!userId || userId !== (novel as any).author) throw new userError.UserForbiddenError('This novel is private');
    } else if ((novel as any).visibility === 'code') {
        const code = (req.query.code as string | undefined) || (req.headers['x-access-code'] as string | undefined) || '';
        if (!code) {
            const userId = (req as any).user?.userid;
            if (!userId || userId !== (novel as any).author) throw new userError.UserForbiddenError('Access code required');
        } else {
            const ok = crypto.createHash('sha256').update(String(code)).digest('hex') === (novel as any).accessCodeHash;
            if (!ok) throw new userError.UserForbiddenError('Invalid access code');
        }
    }
    const episodes = await repo.findByNovelId(novelId);
    res.status(200).json({ success: true, episodes });
};

export const updateEpisode = async (req: Request, res: Response) => {
    const { episodeId } = req.params as { episodeId: string };
    const { title, content, authorComment } = req.body;
    const userId = req.user?.userid;
    if (!userId) throw new userError.UserNotLoginError('Login required');
    const repo = useEpisodeRepo();
    const updated = await repo.updateIfAuthor(episodeId, userId!, { title, content, authorComment: authorComment ?? null });
    if (!updated) throw new episodeError.EpisodeInteractionFailedError('Failed to update episode');
    res.status(200).json({ success: true, episode: updated });
};

export const deleteEpisode = async (req: Request, res: Response) => {
    const { episodeId } = req.params as { episodeId: string };
    const userId = req.user?.userid;
    if (!userId) throw new userError.UserNotLoginError('Login required');
    const repo = useEpisodeRepo();
    const ok = await repo.deleteIfAuthorAndLast(episodeId, userId!);
    if (!ok) throw new episodeError.EpisodeError('Bad Request: Only the last episode can be deleted or not authorized.');
    res.status(200).json({ success: true, message: 'Episode deleted successfully' });
};

export const likeEpisode = async (req: Request, res: Response) => {
    const { episodeId } = req.params as { episodeId: string };
    const userId = req.user?.userid;
    if (!userId) throw new userError.UserNotLoginError('Login required to like episode');
    const repo = useEpisodeRepo();
    const { likeCount, dislikeCount } = await repo.like(episodeId, (req as any).body?.novelId || (req as any).query?.novelId || '', userId);
    res.status(200).json({ success: true, message: 'Episode liked successfully', likeCount, dislikeCount });
};

export const dislikeEpisode = async (req: Request, res: Response) => {
    const { episodeId } = req.params as { episodeId: string };
    const userId = req.user?.userid;
    if (!userId) throw new userError.UserNotLoginError('Login required to dislike episode');
    const repo = useEpisodeRepo();
    const { likeCount, dislikeCount } = await repo.dislike(episodeId, (req as any).body?.novelId || (req as any).query?.novelId || '', userId);
    res.status(200).json({ success: true, message: 'Episode disliked successfully', likeCount, dislikeCount });
};


