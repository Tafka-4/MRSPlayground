import { Request, Response, NextFunction } from 'express';
import { requestPool } from '../config/database';

const getClientIp = (req: Request): string | null => {
    const forwarded = req.headers['x-forwarded-for'] as string;
    const realIp = req.headers['x-real-ip'] as string;
    const clientIp = req.headers['x-client-ip'] as string;
    const cfConnectingIp = req.headers['cf-connecting-ip'] as string;

    if (forwarded) {
        const ips = forwarded.split(',').map((ip) => ip.trim());
        return ips[0];
    }

    if (realIp) return realIp;
    if (clientIp) return clientIp;
    if (cfConnectingIp) return cfConnectingIp;

    return req.ip || null;
};

export const userRequestWatchStart = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const requestId = req.headers['x-request-id'] as string;
    const userAgent = req.headers['user-agent'] as string;
    const clientIp = getClientIp(req);
    const isAuthenticated = !!req.user;

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
                    'UPDATE user_requests SET status = ?, updated_at = ?, user_agent = ?, client_ip = ?, error_code = ?, error_message = ?, is_authenticated = ? WHERE request_id = ?',
                    [
                        'failed',
                        new Date(),
                        userAgent || null,
                        clientIp || null,
                        '500',
                        'Too many retries',
                        isAuthenticated,
                        requestId
                    ]
                );
                return next(new Error('Too many retries'));
            }

            await requestPool.execute(
                'UPDATE user_requests SET retry_count = ?, updated_at = ?, user_agent = ?, client_ip = ?, is_authenticated = ? WHERE request_id = ?',
                [
                    retryCount + 1,
                    new Date(),
                    userAgent || null,
                    clientIp || null,
                    isAuthenticated,
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
            `INSERT INTO user_requests (request_id, user_id, is_authenticated, route, status, created_at, client_ip, user_agent, retry_count) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
             ON DUPLICATE KEY UPDATE 
                retry_count = retry_count + 1,
                updated_at = VALUES(created_at),
                user_agent = VALUES(user_agent),
                client_ip = VALUES(client_ip),
                is_authenticated = VALUES(is_authenticated)`,
            [
                requestId,
                userId,
                isAuthenticated,
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
    const clientIp = getClientIp(req);
    const userId = req.user?.userid || null;
    const isAuthenticated = !!req.user;
    const errorCode = res.statusCode;
    const errorMessage = res.statusMessage;

    try {
        await requestPool.execute(
            'UPDATE user_requests SET user_id = ?, is_authenticated = ?, status = ?, updated_at = ?, user_agent = ?, client_ip = ?, error_code = ?, error_message = ? WHERE request_id = ?',
            [
                userId,
                isAuthenticated,
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
