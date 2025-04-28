import { Request, Response, NextFunction } from "express";
import { escape } from "html-escaper";
import Novel from "../model/novelModel.js";
import User from "../model/userModel.js";
import novelError from "../utils/error/novelError.js";
import userError from "../utils/error/userError.js";

// login required
export const createNovel = async (req: Request, res: Response) => {
    const { title, description, thumbnailImage } = req.body;
    const userId = req.user?.userid;

    if (!userId) {
        throw new userError.UserNotLoginError("Login required to create novel");
    }
    if (!title || !description) {
        throw new novelError.NovelError("Title and description are required");
    }

    const novelData = {
        title: escape(title),
        description: escape(description),
        thumbnailImage: escape(thumbnailImage || ""),
        author: userId,
        status: "ongoing"
    };

    const novel = await Novel.create(novelData);

    // Add novelId to user's wroteNovels array
    await User.findOneAndUpdate({ userid: userId }, { $addToSet: { wroteNovels: novel.novelId } });

    res.status(201).json(novel);
};

// login required
export const getNovel = async (req: Request, res: Response) => {
    const { novelId } = req.params;
    const novel = await Novel.findOne({ novelId });
    if (!novel) {
        throw new novelError.NovelNotFoundError("Novel not found");
    }

    // Use model method to increase view count
    await novel.increaseViewCount();

    res.status(200).json(novel);
};

// login required
export const updateNovel = async (req: Request, res: Response) => {
    const { novelId } = req.params;
    const { title, description } = req.body;
    const userId = req.user?.userid;

    if (!userId) {
        throw new userError.UserNotLoginError("Login required");
    }

    const updateData: any = {};
    if (title) updateData.title = escape(title);
    if (description) updateData.description = escape(description);
    // Only update if there's something to update
    if (Object.keys(updateData).length === 0) {
         throw new novelError.NovelError("No fields provided for update");
    }
    updateData.updatedAt = new Date();

    // Atomically find and update, ensuring the user is the author
    const updatedNovel = await Novel.findOneAndUpdate(
        { novelId, author: userId },
        { $set: updateData },
        { new: true }
    );

    if (!updatedNovel) {
        const exists = await Novel.exists({ novelId });
        if (!exists) {
            throw new novelError.NovelNotFoundError("Novel not found");
        } else {
            throw new userError.UserForbiddenError("You are not allowed to update this novel");
        }
    }
    res.status(200).json(updatedNovel);
};

// login required
export const deleteNovel = async (req: Request, res: Response) => {
    const { novelId } = req.params;
    const userId = req.user?.userid;

    if (!userId) {
        throw new userError.UserNotLoginError("Login required");
    }

    const novel = await Novel.findOne({ novelId }).select('author');
    if (!novel) {
        throw new novelError.NovelNotFoundError("Novel not found");
    }
    if (userId !== novel.author) {
        throw new userError.UserForbiddenError("You are not allowed to delete this novel");
    }

    const [deleteResult, _] = await Promise.all([
        Novel.deleteOne({ novelId }), // Triggers pre('deleteOne') hook
        User.findOneAndUpdate({ userid: userId }, { $pull: { wroteNovels: novelId } })
    ]);

    if (deleteResult.deletedCount === 0) {
        throw new novelError.NovelError("Failed to delete novel");
    }

    res.status(200).json({ message: "Novel deleted successfully" });
};

// login required
export const likeNovel = async (req: Request, res: Response) => {
    const { novelId } = req.params;
    const userId = req.user?.userid;

    if (!userId) {
        throw new userError.UserNotLoginError("Login required to like novel");
    }

    const novel = await Novel.findOne({ novelId });
    if (!novel) {
        throw new novelError.NovelNotFoundError("Novel not found");
    }

    await novel.like(userId);

    res.status(200).json({
        message: "Novel liked successfully",
        likeCount: novel.likeCount,
        dislikeCount: novel.dislikeCount
    });
};

// login required
export const dislikeNovel = async (req: Request, res: Response) => {
    const { novelId } = req.params;
    const userId = req.user?.userid;

    if (!userId) {
        throw new userError.UserNotLoginError("Login required to dislike novel");
    }

    const novel = await Novel.findOne({ novelId });
    if (!novel) {
        throw new novelError.NovelNotFoundError("Novel not found");
    }

    await novel.dislike(userId);

    res.status(200).json({
        message: "Novel disliked successfully",
        likeCount: novel.likeCount,
        dislikeCount: novel.dislikeCount
    });
};

// login required
export const favoriteNovel = async (req: Request, res: Response) => {
    const { novelId } = req.params;
    const userId = req.user?.userid;

    if (!userId) {
        throw new userError.UserNotLoginError("Login required to favorite novel");
    }

    const novel = await Novel.findOne({ novelId });
    if (!novel) {
        throw new novelError.NovelNotFoundError("Novel not found");
    }

    await novel.favorite(userId);

    res.status(200).json({
        message: "Novel favorited successfully",
        favoriteCount: novel.favoriteCount
    });
};

// login required
export const uploadThumbnailImage = async (req: Request, res: Response) => {
    const { novelId } = req.params;
    const userId = req.user?.userid;
    const file = req.file;

    if (!userId) throw new userError.UserNotLoginError("Login required");
    if (!file) throw new novelError.NovelError("No file uploaded");

    const novel = await Novel.findOne({ novelId }).select('author thumbnailImage');
    if (!novel) throw new novelError.NovelNotFoundError("Novel not found");
    if (userId !== novel.author) throw new userError.UserForbiddenError("You are not allowed to upload thumbnail image for this novel");

    try {
        // Check if the model method returns the S3 result or handles the update internally
        const uploadResult = await novel.uploadThumbnailImage(file);
        // Assuming model method doesn't update the document, update it here
        novel.thumbnailImage = uploadResult; // Use Location from S3 result
        await novel.save();
        res.status(200).json({ message: "Thumbnail image uploaded successfully", location: uploadResult });
    } catch (error) {
        console.error("Thumbnail Upload Error:", error); // Log the actual error
        // Use specific error if available
        // throw new novelError.NovelImageUploadFailedError("Failed to upload thumbnail image");
        throw new novelError.NovelError(`Failed to upload thumbnail image`);
    }
};

// login required
export const deleteThumbnailImage = async (req: Request, res: Response) => {
    const { novelId } = req.params;
    const userId = req.user?.userid;

    if (!userId) throw new userError.UserNotLoginError("Login required");

    const novel = await Novel.findOne({ novelId }).select('author thumbnailImage');
    if (!novel) throw new novelError.NovelNotFoundError("Novel not found");
    if (userId !== novel.author) throw new userError.UserForbiddenError("You are not allowed to delete thumbnail image for this novel");
    if (!novel.thumbnailImage || novel.thumbnailImage === "") throw new novelError.NovelError("No thumbnail image to delete");

    try {
        // Assuming model method handles S3 deletion
        await novel.deleteThumbnailImage();
        res.status(200).json({ message: "Thumbnail image deleted successfully" });
    } catch (error) {
        console.error("Thumbnail Delete Error:", error); // Log the actual error
        throw new novelError.NovelError(`Failed to delete thumbnail image`);
    }
};

// login required
export const getNovelList = async (req: Request, res: Response) => {
    const { query, limit, page, sort, genre, status } = req.query;
    const limitNumber = parseInt(limit as string) || 10;
    const pageNumber = parseInt(page as string) || 1;

    if (limitNumber < 1 || limitNumber > 100) {
        throw new novelError.NovelError("Limit must be between 1 and 100");
    }

    const filter: any = {};
    if (query) filter.title = { $regex: query, $options: "i" };
    if (genre && typeof genre === 'string') filter.genre = genre; // Add genre filter
    if (status && typeof status === 'string') filter.status = status; // Add status filter

    let sortOptions: any = { createdAt: -1 }; // Default sort
    if (sort === 'views') sortOptions = { viewCount: -1 };
    else if (sort === 'likes') sortOptions = { likeCount: -1 };
    else if (sort === 'favorites') sortOptions = { favoriteCount: -1 };
    else if (sort === 'episodes') sortOptions = { episodeCount: -1 };
    else if (sort === 'recent') sortOptions = { updatedAt: -1 };

    const novels = await Novel.find(filter)
        .sort(sortOptions)
        .limit(limitNumber)
        .skip((pageNumber - 1) * limitNumber);

    const totalNovels = await Novel.countDocuments(filter);

    res.status(200).json({
        novels,
        totalPages: Math.ceil(totalNovels / limitNumber),
        currentPage: pageNumber,
    });
};

// login required
export const getNovelListByAuthor = async (req: Request, res: Response) => {
    const { author } = req.params;
    // Consider adding pagination and sorting
    const novels = await Novel.find({ author });
    res.status(200).json(novels);
};
