import { Request, Response } from "express";
import Novel from "../model/novelModel.js";
import Episode, { IEpisode } from "../model/episodeModel.js";
import novelError from "../utils/error/novelError.js";
import episodeError from "../utils/error/episodeError.js";
import userError from "../utils/error/userError.js";


// login required
export const createEpisode = async (req: Request, res: Response) => {
    const { novelId, title, content, authorComment } = req.body;
    const userId = req.user?.userid;

    if (!userId) {
        throw new userError.UserNotLoginError("Login required");
    }

    // Find novel and check authorship atomically before incrementing count
    const novel = await Novel.findOne({ novelId }).select('author episodeCount');
    if (!novel) {
        throw new novelError.NovelNotFoundError("Novel not found");
    }
    if (userId !== novel.author) {
        throw new userError.UserForbiddenError("You are not the author of this novel");
    }

    // Use findOneAndUpdate on Novel to increment episodeCount atomically
    const updatedNovel = await Novel.findOneAndUpdate(
        { novelId: novelId, author: userId },
        { $inc: { episodeCount: 1 } },
        { new: true, projection: 'episodeCount' }
    );

    if (!updatedNovel) {
        throw new novelError.NovelError("Failed to update novel episode count or authorization failed.");
    }

    // Create the episode
    const episodeData = {
        novelId,
        episodeNumber: updatedNovel.episodeCount,
        title: title,
        content: content,
        author: userId,
        authorComment: authorComment ? authorComment : null
    };
    const episode = await Episode.create(episodeData);

    res.status(201).json(episode);
};

// login required
export const getEpisode = async (req: Request, res: Response) => {
    const { episodeId } = req.params;

    // Find episode first
    const episode = await Episode.findOne({ episodeId });
    if (!episode) {
        throw new episodeError.EpisodeNotFoundError("Episode not found");
    }

    const updatedEpisode = await Episode.findOneAndUpdate(
        { episodeId },
        { $inc: { viewCount: 1 } },
        { new: true }
    );

    if (!updatedEpisode) {
        throw new episodeError.EpisodeNotFoundError("Episode not found during view count update");
    }

    res.status(200).json(updatedEpisode);
};

// login required
export const updateEpisode = async (req: Request, res: Response) => {
    const { episodeId } = req.params;
    const { title, content, authorComment } = req.body;
    const userId = req.user?.userid;

    if (!userId) {
        throw new userError.UserNotLoginError("Login required");
    }

    // Find episode to check author via novel
    const existingEpisode = await Episode.findOne({ episodeId }).select('novelId');
    if (!existingEpisode) {
        throw new episodeError.EpisodeNotFoundError("Episode not found");
    }
    const novel = await Novel.findOne({ novelId: existingEpisode.novelId }).select('author');
    if (!novel) {
        throw new novelError.NovelNotFoundError("Associated novel not found");
    }
    if (userId !== novel.author) {
        throw new userError.UserForbiddenError("You are not the author of this episode");
    }

    // Update the episode
    const updatedEpisode = await Episode.findOneAndUpdate(
        { episodeId },
        { title: title, content: content, authorComment: authorComment ? authorComment : null, updatedAt: new Date() },
        { new: true }
    );

    if (!updatedEpisode) {
        throw new episodeError.EpisodeInteractionFailedError("Failed to update episode");
    }

    await updatedEpisode.save();

    res.status(200).json(updatedEpisode);
};

// login required
export const deleteEpisode = async (req: Request, res: Response) => {
    const { episodeId } = req.params;
    const userId = req.user?.userid;

    if (!userId) {
        throw new userError.UserNotLoginError("Login required");
    }

    // Find episode & novel, check conditions
    const episode = await Episode.findOne({ episodeId }).select('novelId episodeNumber');
    if (!episode) throw new episodeError.EpisodeNotFoundError("Episode not found");

    const novel = await Novel.findOne({ novelId: episode.novelId }).select('author episodeCount');
    if (!novel) throw new novelError.NovelNotFoundError("Associated novel not found");
    if (userId !== novel.author) {
        throw new userError.UserForbiddenError("You are not the author of this episode");
    }
    if (novel.episodeCount !== episode.episodeNumber) {
        throw new episodeError.EpisodeError("Bad Request: Only the last episode can be deleted.");
    }

    // Atomically delete and decrement count
    const [deleteResult, updatedNovel] = await Promise.all([
        Episode.deleteOne({ episodeId }),
        Novel.findOneAndUpdate(
            { novelId: episode.novelId, author: userId },
            { $inc: { episodeCount: -1 } },
            { new: true, projection: '_id' }
        )
    ]);

    if (deleteResult.deletedCount === 0) {
        throw new episodeError.EpisodeDeleteFailedError("Failed to delete episode during atomic operation");
    }
    if (!updatedNovel) {
        throw new novelError.NovelError("Failed to decrement episode count or authorization failed.");
    }

    res.status(200).json({ message: "Episode deleted successfully" });
};

// login required
export const likeEpisode = async (req: Request, res: Response) => {
    const { episodeId } = req.params;
    const userId = req.user?.userid;

    if (!userId) {
        throw new userError.UserNotLoginError("Login required to like episode");
    }

    // Find the episode instance
    const episode = await Episode.findOne({ episodeId });
    if (!episode) {
        throw new episodeError.EpisodeNotFoundError("Episode not found");
    }

    // Call the model method to handle liking (uses Redis, updates counts, throws errors)
    await episode.like(userId);
    await episode.save(); // Save the updated counts to MongoDB

    res.status(200).json({
        message: "Episode liked successfully",
        likeCount: episode.likeCount, // Return updated counts from the instance
        dislikeCount: episode.dislikeCount
    });
};

// login required
export const dislikeEpisode = async (req: Request, res: Response) => {
    const { episodeId } = req.params;
    const userId = req.user?.userid;

    if (!userId) {
        throw new userError.UserNotLoginError("Login required to dislike episode");
    }

    // Find the episode instance
    const episode = await Episode.findOne({ episodeId });
    if (!episode) {
        throw new episodeError.EpisodeNotFoundError("Episode not found");
    }

    // Call the model method to handle disliking
    await episode.dislike(userId);
    await episode.save(); // Save the updated counts to MongoDB

    res.status(200).json({
        message: "Episode disliked successfully",
        likeCount: episode.likeCount,
        dislikeCount: episode.dislikeCount
    });
};
