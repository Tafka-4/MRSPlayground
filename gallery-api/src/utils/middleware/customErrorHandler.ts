import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import authError from '../error/authError.js';
import userError from '../error/userError.js';
import galleryError from '../error/galleryError.js';

const customErrorHandler: ErrorRequestHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
	if (err instanceof authError.AuthError) {
		if (err instanceof authError.AuthEmailSendFailedError) return res.status(418).json({ message: err.message });
		if (err instanceof authError.AuthEmailVerifyFailedError || err instanceof authError.AuthUserAlreadyAdminError) return res.status(409).json({ message: err.message });
		if (err instanceof authError.AuthUserNotAdminError) return res.status(403).json({ message: err.message });
		return res.status(400).json({ message: err.message });
	}
	if (err instanceof userError.UserError) {
		if (err instanceof userError.UserNotLoginError || err instanceof userError.UserTokenVerificationFailedError) return res.status(401).json({ message: err.message });
		if (err instanceof userError.UserForbiddenError) return res.status(403).json({ message: err.message });
		if (err instanceof userError.UserNotFoundError) return res.status(404).json({ message: err.message });
		if (err instanceof userError.UserAlreadyExistsEmailError || err instanceof userError.UserNotValidPasswordError || err instanceof userError.UserAlreadyLoginError) return res.status(409).json({ message: err.message });
		if (err instanceof userError.UserImageUploadFailedError || err instanceof userError.UserImageDeleteFailedError) return res.status(418).json({ message: err.message });
		return res.status(400).json({ message: err.message });
	}
	if (err instanceof galleryError.GalleryError) {
		if (err instanceof galleryError.GalleryNotFoundError) return res.status(404).json({ message: err.message });
		if (err instanceof galleryError.GalleryInteractionFailedError || err instanceof galleryError.GalleryImageUploadFailedError || err instanceof galleryError.GalleryImageDeleteFailedError) return res.status(418).json({ message: err.message });
		return res.status(400).json({ message: err.message });
	}
	if (err instanceof Error) return res.status(500).json({ message: 'Internal Server Error' });
};

export default customErrorHandler;


