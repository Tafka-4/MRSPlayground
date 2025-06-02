import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';

const logError = (err: any, req: Request) => {
    const errorInfo = {
        timestamp: new Date().toISOString(),
        name: err.name,
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        url: req.url,
        method: req.method,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        userId: (req as any).user?.userid || 'anonymous'
    };

    console.error('Error caught by error handler:', errorInfo);
};

const isDatabaseError = (err: any): boolean => {
    return (
        err.code === 'ER_BAD_FIELD_ERROR' ||
        err.code === 'ER_NO_SUCH_TABLE' ||
        err.code === 'ER_DUP_ENTRY' ||
        err.code === 'ER_ACCESS_DENIED_ERROR' ||
        err.code === 'ER_WRONG_ARGUMENTS' ||
        err.code === 'ECONNREFUSED' ||
        err.code === 'PROTOCOL_CONNECTION_LOST' ||
        err.errno === 1054 || // Unknown column
        err.errno === 1062 || // Duplicate entry
        err.errno === 1146 || // Table doesn't exist
        err.errno === 1210 || // Incorrect arguments to mysqld_stmt_execute
        err.errno === 2003
    ); // Can't connect to server
};

const getSafeErrorMessage = (err: any): string => {
    if (process.env.NODE_ENV === 'development') {
        return err.message || 'Unknown error occurred';
    }
    return 'Internal server error';
};

export const errorHandler: ErrorRequestHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    logError(err, req);

    if (res.headersSent) {
        return next(err);
    }

    if (isDatabaseError(err)) {
        console.error('Database error detected:', {
            code: err.code,
            errno: err.errno,
            sqlMessage: err.sqlMessage
        });

        res.status(503).json({
            error: 'Database service temporarily unavailable',
            message: 'Please try again later'
        });
        return;
    }

    if (
        err.name === 'JsonWebTokenError' ||
        err.name === 'TokenExpiredError' ||
        err.name === 'NotBeforeError'
    ) {
        res.status(401).json({
            error: 'Invalid or expired token',
            message: 'Please log in again'
        });
        return;
    }

    if (
        err.name === 'UserNotLoginError' ||
        err.name === 'UserTokenVerificationFailedError'
    ) {
        res.status(401).json({
            error: err.message,
            message: 'Authentication required'
        });
        return;
    }

    if (err.name === 'UserForbiddenError' || err.name === 'UserNotAdminError') {
        res.status(403).json({
            error: err.message,
            message: 'Insufficient permissions'
        });
        return;
    }

    if (err.name === 'UserNotFoundError') {
        res.status(404).json({
            error: err.message,
            message: 'Requested resource not found'
        });
        return;
    }

    if (
        err.name === 'UserAlreadyVerifiedError' ||
        err.name === 'AuthUserAlreadyAdminError' ||
        err.name === 'AuthEmailVerifyFailedError' ||
        err.code === 11000 ||
        err.errno === 1062
    ) {
        res.status(409).json({
            error: err.message || 'Resource conflict',
            message: 'Resource already exists or conflicts with existing data'
        });
        return;
    }

    if (
        err.name === 'UserError' ||
        err.name === 'UserNotValidPasswordError' ||
        err.name === 'UserNotVerifiedError' ||
        err.name === 'UserImageDeleteFailedError' ||
        err.name === 'UserImageUploadFailedError' ||
        err.name === 'AuthError' ||
        err.name === 'ValidationError' ||
        err.name === 'CastError'
    ) {
        res.status(400).json({
            error: err.message,
            message: 'Invalid request data'
        });
        return;
    }

    if (err.name === 'TypeError') {
        console.error('TypeError detected - possible server bug:', err);
        res.status(500).json({
            error: 'Server processing error',
            message: getSafeErrorMessage(err)
        });
        return;
    }

    console.error('Unhandled error:', {
        name: err.name,
        message: err.message,
        stack: err.stack
    });

    res.status(500).json({
        error: 'Internal server error',
        message: getSafeErrorMessage(err)
    });
};
