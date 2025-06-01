import { Request, Response, NextFunction } from 'express';
import { requestPool } from '../config/database';

export const userRequestWatchStart = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const requestId = req.headers['x-request-id'] as string;
    const userAgent = req.headers['user-agent'] as string;
    const clientIp = req.ip;

    if (!requestId) {
        return next(new Error('Missing request ID'));
    }

    try {
        const [existingRequests] = (await requestPool.execute(
            'SELECT * FROM user_requests WHERE request_id = ?',
            [requestId]
        )) as any[];

        if (existingRequests.length > 0) {
            const existingRequest = existingRequests[0];
            const retryCount = existingRequest?.retry_count || 0;

            if (retryCount >= 5) {
                await requestPool.execute(
                    'UPDATE user_requests SET status = ?, updated_at = ?, user_agent = ?, client_ip = ?, error_code = ?, error_message = ? WHERE request_id = ?',
                    [
                        'failed',
                        new Date(),
                        userAgent || null,
                        clientIp || null,
                        '500',
                        'Too many retries',
                        requestId
                    ]
                );
                return next(new Error('Too many retries'));
            }

            await requestPool.execute(
                'UPDATE user_requests SET retry_count = ?, updated_at = ?, user_agent = ?, client_ip = ? WHERE request_id = ?',
                [
                    retryCount + 1,
                    new Date(),
                    userAgent || null,
                    clientIp || null,
                    requestId
                ]
            );

            res.on('finish', async () => {
                await updateRequestStatus(req, res, requestId);
            });

            return next();
        }

        const userId = req.user?.userid || null;

        await requestPool.execute(
            `INSERT INTO user_requests (request_id, user_id, route, status, created_at, client_ip, user_agent, retry_count) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 0)
             ON DUPLICATE KEY UPDATE 
                retry_count = retry_count + 1,
                updated_at = VALUES(created_at),
                user_agent = VALUES(user_agent),
                client_ip = VALUES(client_ip)`,
            [
                requestId,
                userId,
                req.originalUrl || null,
                'pending',
                new Date(),
                clientIp || null,
                userAgent || null
            ]
        );

        res.on('finish', async () => {
            await updateRequestStatus(req, res, requestId);
        });

        res.locals.requestId = requestId;
        next();
    } catch (error) {
        console.error('Error in userRequestWatchStart:', error);
        return next(new Error('Failed to process user request'));
    }
};

const updateRequestStatus = async (
    req: Request,
    res: Response,
    requestId: string
) => {
    const status = res.statusCode < 400 ? 'success' : 'failed';
    const userAgent = req.headers['user-agent'] as string;
    const clientIp = req.ip;
    const userId = req.user?.userid || null;
    const errorCode = res.statusCode;
    const errorMessage = res.statusMessage;

    try {
        await requestPool.execute(
            'UPDATE user_requests SET user_id = ?, status = ?, updated_at = ?, user_agent = ?, client_ip = ?, error_code = ?, error_message = ? WHERE request_id = ?',
            [
                userId,
                status,
                new Date(),
                userAgent || null,
                clientIp || null,
                errorCode || null,
                errorMessage || null,
                requestId
            ]
        );
    } catch (error) {
        console.error('Error updating request status:', error);
    }
};
