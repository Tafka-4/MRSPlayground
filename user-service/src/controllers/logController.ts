import { Request, Response } from 'express';
import { User } from '../models/User.js';
import { Log } from '../models/Log.js';
import { validatePaginationParams, sanitizeString } from '../utils/sqlSecurity.js';

const safeNumber = (value: any, defaultValue: number = 0): number => {
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
};

const validatePagination = (page: any, limit: any) => {
    return validatePaginationParams(page, limit);
};

interface LogFilters {
    status?: string;
    user_id?: string;
    route?: { $regex: string };
    client_ip?: { $regex: string };
    created_at?: { $gte?: string, $lte?: string };
}

export const enrichLogsWithUserInfo = async (logs: any[]): Promise<any[]> => {
    const userIds = [...new Set(logs.map(log => log.user_id).filter(id => id))];
    
    if (userIds.length === 0) {
        return logs.map(log => ({
            ...log,
            username: null,
            email: null,
            login_id: null
        }));
    }

    const usersMap = new Map();
    
    for (const userId of userIds) {
        try {
            const user = await User.findOne({ userid: userId });
            if (user) {
                usersMap.set(userId, {
                    username: user.nickname,
                    email: user.email,
                    login_id: user.id
                });
            }
        } catch (error) {
            console.warn(`Failed to fetch user info for ${userId}:`, error);
        }
    }

    return logs.map(log => {
        const userInfo = usersMap.get(log.user_id);
        return {
            ...log,
            username: userInfo?.username || null,
            email: userInfo?.email || null,
            login_id: userInfo?.login_id || null
        };
    });
};

export const getLogs = async (req: Request, res: Response) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            userId,
            route,
            ip,
            dateFrom,
            dateTo,
            export: isExport,
            onlyMine,
            onlyErrors
        } = req.query;

        const { page: safePage, limit: safeLimit } = validatePagination(page, limit);
        const currentUserId = req.user?.userid;

        const isAdmin = req.user?.authority === 'admin' || req.user?.authority === 'bot';
        const isMyLogsRequest = onlyMine === 'true';

        if (!isAdmin && !isMyLogsRequest) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
                message: 'Only admins can view all logs'
            });
        }
        
        const filters: LogFilters = {};

        if (isMyLogsRequest) {
            filters.user_id = currentUserId;
        } else if (userId) {
            filters.user_id = sanitizeString(userId as string, 64);
        }

        if (onlyErrors === 'true') {
            filters.status = 'failed';
        } else if (status && ['pending', 'success', 'failed'].includes(status as string)) {
            filters.status = status as string;
        }

        if (route) {
            filters.route = { $regex: sanitizeString(route as string, 255) };
        }

        if (ip) {
            filters.client_ip = { $regex: sanitizeString(ip as string, 45) };
        }

        if (dateFrom || dateTo) {
            filters.created_at = {};
            if (dateFrom) filters.created_at.$gte = sanitizeString(dateFrom as string, 50);
            if (dateTo) filters.created_at.$lte = sanitizeString(dateTo as string, 50);
        }

        const logs = await Log.find(filters, safeLimit, safePage, { by: 'created_at', order: 'DESC' });
        const total = await Log.count(filters);
        
        const enrichedLogs = await enrichLogsWithUserInfo(logs);

        res.status(200).json({
            success: true,
            logs: enrichedLogs,
            pagination: {
                total,
                page: safePage,
                limit: safeLimit,
                totalPages: Math.ceil(total / safeLimit) 
            }
        });
    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: error instanceof Error ? error.message : String(error)
        });
    }
};

export const getLogStatistics = async (req: Request, res: Response) => {
    try {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const recentStats = await Log.aggregate([
            { $match: { created_at: { $gte: twentyFourHoursAgo.toISOString() } } },
            {
                $group: {
                    _id: null,
                    total_requests: { $sum: 1 },
                    successful_requests: {
                        $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
                    },
                    failed_requests: {
                        $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
                    }
                }
            }
        ]);

        const statusDist = await Log.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        res.status(200).json({
            success: true,
            recent_24h_statistics: recentStats[0] || {
                total_requests: 0,
                successful_requests: 0,
                failed_requests: 0
            },
            status_distribution: statusDist.map((s) => ({ status: s._id, count: s.count }))
        });
    } catch (error) {
        console.error('Error fetching log statistics:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

export const getRouteErrors = async (req: Request, res: Response) => {
    try {
        console.log('getRouteErrors - Full request details:', {
            url: req.url,
            originalUrl: req.originalUrl,
            query: req.query,
            params: req.params,
            headers: req.headers
        });

        let routeParam: any = req.query.route;
        let pageParam: any = req.query.page || 1;
        let limitParam: any = req.query.limit || 20;

        if (!routeParam && req.originalUrl) {
            try {
                const url = new URL(req.originalUrl, `https://${req.headers.host}`);
                routeParam = url.searchParams.get('route');
                pageParam = url.searchParams.get('page') || 1;
                limitParam = url.searchParams.get('limit') || 20;
                console.log('Parsed from originalUrl:', { routeParam, pageParam, limitParam });
            } catch (error) {
                console.log('originalUrl parsing failed:', error);
            }
        }

        const { route, page = 1, limit = 20 } = { route: routeParam, page: pageParam, limit: limitParam };

        console.log('getRouteErrors called with route:', route, 'type:', typeof route);

        if (!route || typeof route !== 'string') {
            console.log('Route validation failed:', { route, type: typeof route });
            return res.status(400).json({
                success: false,
                error: 'Route parameter is required'
            });
        }

        const sanitizedRoute = sanitizeString(route as string, 255);

        const { page: safePage, limit: safeLimit } = validatePaginationParams(page, limit);
        const offset = (safePage - 1) * safeLimit;

        const logs = await Log.find({ route: sanitizedRoute, status: 'failed' }, safeLimit, offset, { by: 'created_at', order: 'DESC' });
        const enrichedLogs = await enrichLogsWithUserInfo(logs);
        
        const errorStats = await Log.aggregate([
            { $match: { route: sanitizedRoute, status: 'failed' } },
            { $group: { _id: { error_code: '$error_code', error_message: '$error_message' }, count: { $sum: 1 } } }
        ]);
        
        const total = await Log.count({ route: sanitizedRoute, status: 'failed' });

        res.status(200).json({
            success: true,
            logs: enrichedLogs,
            statistics: {
                error_distribution: errorStats.map((stat: any) => ({
                    errorCode: stat.error_code,
                    errorMessage: stat.error_message,
                    count: stat.count
                }))
            },
            pagination: {
                total,
                page: safePage,
                limit: safeLimit,
                totalPages: Math.ceil(total / safeLimit)
            }
        });
    } catch (error) {
        console.error('Error fetching route error details:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

export const deleteLogs = async (req: Request, res: Response) => {
    try {
        const { before, status } = req.query;

        if (!before || typeof before !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Bad Request',
                message: '`before` query parameter is required and must be a date string.'
            });
        }

        const sanitizedBeforeDate = sanitizeString(before, 50);
        
        const filters: { created_at: { $lt: string }, status?: string } = {
            created_at: { $lt: sanitizedBeforeDate }
        };

        if (status && ['pending', 'success', 'failed'].includes(status as string)) {
            filters.status = status as string;
        }

        const deletedCount = await Log.delete(filters);

        res.status(200).json({
            success: true,
            message: 'Logs deleted successfully',
            deletedCount,
            deletedBefore: sanitizedBeforeDate,
            statusFilter: status || 'all'
        });
    } catch (error) {
        console.error('Error deleting logs:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: error instanceof Error ? error.message : String(error)
        });
    }
};

export const getUserRequestLogs = async (req: Request, res: Response) => {
    return getLogs(req, res);
};

export const getUserSpecificLogs = async (req: Request, res: Response) => {
    req.query.userId = req.params.userId;
    return getLogs(req, res);
};

export const getMyRequestLogs = async (req: Request, res: Response) => {
    req.query.onlyMine = 'true';
    return getLogs(req, res);
};

export const getRouteErrorDetails = async (req: Request, res: Response) => {
    return getRouteErrors(req, res);
};

export const getUserLogs = async (req: Request, res: Response) => {
    try {
        const { userid } = req.params;
        const { page = 1, limit = 10, filter } = req.query;

        const { page: safePage, limit: safeLimit } = validatePaginationParams(page, limit);

        const query: any = { user_id: userid }; 
        
        if (filter && filter !== 'all') {
            const sanitizedFilter = sanitizeString(filter as string, 20);
            if (['success', 'failed', 'pending'].includes(sanitizedFilter)) {
                query.status = sanitizedFilter; 
            }
        }

        const logs = await Log.find(query, safeLimit, safePage, { by: 'created_at', order: 'DESC' });
        const total = await Log.count(query);

        res.status(200).json({
            success: true,
            logs: logs,
            pagination: {
                page: safePage,
                limit: safeLimit,
                total,
                totalPages: Math.ceil(total / safeLimit)
            }
        });
    } catch (error) {
        console.error(`Error fetching logs for user ${req.params.userid}:`, error);
        res.status(500).json({
            success: false,
            error: 'Database service temporarily unavailable',
            message: 'Please try again later'
        });
    }
};
