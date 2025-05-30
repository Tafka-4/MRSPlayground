import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';

export const errorHandler: ErrorRequestHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    console.error('Error caught by error handler:');
    console.error('Error name:', err.name);
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);

    if (
        err.name === 'JsonWebTokenError' ||
        err.name === 'TokenExpiredError' ||
        err.name === 'NotBeforeError'
    ) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
    }

    if (
        err.name === 'UserNotLoginError' ||
        err.name === 'UserTokenVerificationFailedError'
    ) {
        res.status(401).json({ error: err.message });
        return;
    }

    if (err.name === 'UserForbiddenError') {
        res.status(403).json({ error: err.message });
        return;
    }

    if (err.name === 'UserNotFoundError') {
        res.status(404).json({ error: err.message });
        return;
    }

    if (
        err.name === 'UserError' ||
        err.name === 'UserNotValidPasswordError' ||
        err.name === 'UserImageDeleteFailedError' ||
        err.name === 'UserImageUploadFailedError' ||
        err.name === 'AuthError' ||
        err.name === 'AuthEmailVerifyFailedError' ||
        err.name === 'AuthUserAlreadyAdminError'
    ) {
        res.status(400).json({ error: err.message });
        return;
    }

    if (err.name === 'ValidationError') {
        res.status(400).json({
            error: 'Validation failed',
            details: err.message
        });
        return;
    }

    if (err.name === 'CastError') {
        res.status(400).json({ error: 'Invalid ID format' });
        return;
    }

    if (err.code === 11000) {
        res.status(409).json({ error: 'Duplicate entry' });
        return;
    }

    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
};
