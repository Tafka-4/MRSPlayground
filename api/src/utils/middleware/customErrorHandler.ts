import { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import authError from "../error/authError.js";
import userError from "../error/userError.js";
import novelError from "../error/novelError.js";
import episodeError from "../error/episodeError.js";
import commentError from "../error/commentError.js";
import postError from "../error/postError.js";
import galleryError from "../error/galleryError.js";
import emojiError from "../error/emojiError.js";

const customErrorHandler: ErrorRequestHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof authError.AuthError) {
        if (err instanceof authError.AuthEmailSendFailedError) {
            res.status(418).json({ message: err.message });
            return;
        }
        if (err instanceof authError.AuthEmailVerifyFailedError ||
            err instanceof authError.AuthUserAlreadyAdminError ) {
            res.status(409).json({ message: err.message });
            return;
        }
        if (err instanceof authError.AuthUserNotAdminError) {
            res.status(403).json({ message: err.message });
            return;
        }
        res.status(400).json({ message: err.message });
        return;
    }
    if (err instanceof userError.UserError) {
        if (err instanceof userError.UserNotLoginError ||
            err instanceof userError.UserTokenVerificationFailedError) {
            res.status(401).json({ message: err.message });
            return;
        }
        if (err instanceof userError.UserForbiddenError) {
            res.status(403).json({ message: err.message });
            return;
        }
        if (err instanceof userError.UserNotFoundError) {
            res.status(404).json({ message: err.message });
            return;
        }
        if (err instanceof userError.UserAlreadyExistsEmailError ||
            err instanceof userError.UserNotValidPasswordError ||
            err instanceof userError.UserAlreadyLoginError) {
            res.status(409).json({ message: err.message });
            return;
        }
        if (err instanceof userError.UserImageUploadFailedError ||
            err instanceof userError.UserImageDeleteFailedError) {
            res.status(418).json({ message: err.message });
            return;
        }
        res.status(400).json({ message: err.message });
        return;
    }
    if (err instanceof novelError.NovelError) {
        if (err instanceof novelError.NovelNotFoundError) {
            res.status(404).json({ message: err.message });
            return;
        }
        if (err instanceof novelError.NovelNotAuthorError) {
            res.status(403).json({ message: err.message });
            return;
        }
        if (err instanceof novelError.NovelInteractionFailedError ||
            err instanceof novelError.NovelImageUploadFailedError ||
            err instanceof novelError.NovelImageDeleteFailedError) {
            res.status(418).json({ message: err.message });
            return;
        }
        res.status(400).json({ message: err.message });
        return;
    }
    if (err instanceof episodeError.EpisodeError) {
        if (err instanceof episodeError.EpisodeNotFoundError) {
            res.status(404).json({ message: err.message });
            return;
        }
        if (err instanceof episodeError.EpisodeInteractionFailedError ||
            err instanceof episodeError.EpisodeUploadFailedError ||
            err instanceof episodeError.EpisodeDeleteFailedError) {
            res.status(418).json({ message: err.message });
            return;
        }
        res.status(400).json({ message: err.message });
        return;
    }
    if (err instanceof commentError.CommentError) {
        if (err instanceof commentError.CommentNotFoundError) {
            res.status(404).json({ message: err.message });
            return;
        }
        if (err instanceof commentError.CommentInteractionFailedError ||
            err instanceof commentError.CommentUploadFailedError ||
            err instanceof commentError.CommentDeleteFailedError) {
            res.status(418).json({ message: err.message });
            return;
        }
        if (err instanceof commentError.CommentNotAuthorError) {
            res.status(403).json({ message: err.message });
            return;
        }
        res.status(400).json({ message: err.message });
        return;
    }
    if (err instanceof postError.PostError) {
        if (err instanceof postError.PostNotFoundError) {
            res.status(404).json({ message: err.message });
            return;
        }
        if (err instanceof postError.PostInteractionFailedError ||
            err instanceof postError.PostUploadFailedError ||
            err instanceof postError.PostDeleteFailedError) {
            res.status(418).json({ message: err.message });
            return;
        }
        if (err instanceof postError.PostNotAuthorError) {
            res.status(403).json({ message: err.message });
            return;
        }
        res.status(400).json({ message: err.message });
        return;
    }
    if (err instanceof galleryError.GalleryError) {
        if (err instanceof galleryError.GalleryNotFoundError) {
            res.status(404).json({ message: err.message });
            return;
        }
        if (err instanceof galleryError.GalleryImageUploadFailedError ||
            err instanceof galleryError.GalleryImageDeleteFailedError ||
            err instanceof galleryError.GalleryInteractionFailedError) {
            res.status(418).json({ message: err.message });
            return;
        } 
        if (err instanceof galleryError.GalleryIsNotAdminError ||
            err instanceof galleryError.GalleryIsNotManagerError ||
            err instanceof galleryError.GalleryIsNotSubscribedError) {
            res.status(403).json({ message: err.message });
            return;
        }
        res.status(400).json({ message: err.message });
        return;
    }
    if (err instanceof emojiError.EmojiError) {
        if (err instanceof emojiError.EmojiNotFoundError ||
            err instanceof emojiError.EmojiPackageNotFoundError) {
            res.status(404).json({ message: err.message });
            return;
        }
        
        if (err instanceof emojiError.EmojiInvalidExtensionError ||
            err instanceof emojiError.EmojiUploadFailedError ||
            err instanceof emojiError.EmojiDeleteFailedError) {
            res.status(400).json({ message: err.message });
            return;
        }
        res.status(500).json({ message: err.message });
        return;
    }
    if (err instanceof Error) {
        res.status(500).json({ message: "Internal Server Error" });
        return;
    }
};

export default customErrorHandler;