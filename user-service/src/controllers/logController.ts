import { Request, Response } from 'express';
import { requestPool, pool } from '../config/database.js';
import { IUser } from '../models/User.js';

const safeNumber = (value: any, defaultValue: number = 0): number => {
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
};

const validatePagination = (page: any, limit: any) => {
    const safePageNum = safeNumber(page, 1);
    const safeLimitNum = safeNumber(limit, 10);

    const validatedPage = Math.max(1, Math.floor(safePageNum));
    const validatedLimit = Math.min(Math.max(1, Math.floor(safeLimitNum)), 100);

    return {
        page: validatedPage,
        limit: validatedLimit
    };
};

export const getUserRequestLogs = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 10, status, userId } = req.query;
        const { page: safePage, limit: safeLimit } = validatePagination(
            page,
            limit
        );
        const offset = (safePage - 1) * safeLimit;

        let query = 'SELECT * FROM user_requests WHERE 1=1';
        const params: any[] = [];

        if (status && typeof status === 'string' && status.trim()) {
            const validStatuses = ['pending', 'success', 'failed'];
            if (validStatuses.includes(status.trim())) {
                query += ' AND status = ?';
                params.push(status.trim());
            }
        }

        if (userId && typeof userId === 'string' && userId.trim()) {
            query += ' AND user_id = ?';
            params.push(userId.trim());
        }

        query += ` ORDER BY created_at DESC LIMIT ${safeLimit} OFFSET ${offset}`;

        const [logs] = (await requestPool.execute(query, params)) as any[];

        const userIds = [
            ...new Set(
                logs
                    .map((log: any) => log.user_id)
                    .filter(
                        (id: any) => id && typeof id === 'string' && id.trim()
                    )
            )
        ];
        let usersData: any = {};

        if (userIds.length > 0) {
            const placeholders = userIds.map(() => '?').join(',');
            const [users] = (await pool.execute(
                `SELECT userid, id, nickname, email FROM users WHERE userid IN (${placeholders})`,
                userIds
            )) as any[];

            usersData = users.reduce((acc: any, user: any) => {
                if (user.userid) {
                    acc[user.userid] = {
                        username: user.nickname || null,
                        email: user.email || null,
                        login_id: user.id || null
                    };
                }
                return acc;
            }, {});
        }

        const enrichedLogs = logs.map((log: any) => ({
            ...log,
            username: usersData[log.user_id]?.username || null,
            email: usersData[log.user_id]?.email || null,
            login_id: usersData[log.user_id]?.login_id || null
        }));

        let countQuery =
            'SELECT COUNT(*) as total FROM user_requests WHERE 1=1';
        const countParams: any[] = [];

        if (status && typeof status === 'string' && status.trim()) {
            const validStatuses = ['pending', 'success', 'failed'];
            if (validStatuses.includes(status.trim())) {
                countQuery += ' AND status = ?';
                countParams.push(status.trim());
            }
        }

        if (userId && typeof userId === 'string' && userId.trim()) {
            countQuery += ' AND user_id = ?';
            countParams.push(userId.trim());
        }

        const [countResult] = (await requestPool.execute(
            countQuery,
            countParams
        )) as any[];
        const total = safeNumber(countResult[0]?.total, 0);

        res.status(200).json({
            logs: enrichedLogs,
            pagination: {
                page: safePage,
                limit: safeLimit,
                total,
                totalPages: Math.ceil(total / safeLimit)
            }
        });
    } catch (error) {
        console.error('Error fetching user request logs:', error);
        res.status(500).json({
            error: 'Failed to fetch user request logs',
            details:
                process.env.NODE_ENV === 'development'
                    ? error
                    : 'Internal server error'
        });
    }
};

export const getUserSpecificLogs = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 10, status } = req.query;

        if (!userId || typeof userId !== 'string' || !userId.trim()) {
            return res.status(400).json({
                error: 'Valid userId parameter is required'
            });
        }

        const { page: safePage, limit: safeLimit } = validatePagination(
            page,
            limit
        );
        const offset = (safePage - 1) * safeLimit;

        let query = 'SELECT * FROM user_requests WHERE user_id = ?';
        const params: any[] = [userId.trim()];

        if (status && typeof status === 'string' && status.trim()) {
            const validStatuses = ['pending', 'success', 'failed'];
            if (validStatuses.includes(status.trim())) {
                query += ' AND status = ?';
                params.push(status.trim());
            }
        }

        query += ` ORDER BY created_at DESC LIMIT ${safeLimit} OFFSET ${offset}`;

        const [logs] = (await requestPool.execute(query, params)) as any[];

        let userData: any = null;
        if (userId.trim()) {
            const [users] = (await pool.execute(
                'SELECT userid, id, nickname, email FROM users WHERE userid = ?',
                [userId.trim()]
            )) as any[];

            if (users.length > 0) {
                userData = {
                    username: users[0].nickname || null,
                    email: users[0].email || null,
                    login_id: users[0].id || null
                };
            }
        }

        const enrichedLogs = logs.map((log: any) => ({
            ...log,
            username: userData?.username || null,
            email: userData?.email || null,
            login_id: userData?.login_id || null
        }));

        let countQuery =
            'SELECT COUNT(*) as total FROM user_requests WHERE user_id = ?';
        const countParams: any[] = [userId.trim()];

        if (status && typeof status === 'string' && status.trim()) {
            const validStatuses = ['pending', 'success', 'failed'];
            if (validStatuses.includes(status.trim())) {
                countQuery += ' AND status = ?';
                countParams.push(status.trim());
            }
        }

        const [countResult] = (await requestPool.execute(
            countQuery,
            countParams
        )) as any[];
        const total = safeNumber(countResult[0]?.total, 0);

        res.status(200).json({
            logs: enrichedLogs,
            pagination: {
                page: safePage,
                limit: safeLimit,
                total,
                totalPages: Math.ceil(total / safeLimit)
            }
        });
    } catch (error) {
        console.error('Error fetching user specific logs:', error);
        res.status(500).json({
            error: 'Failed to fetch user specific logs',
            details:
                process.env.NODE_ENV === 'development'
                    ? error
                    : 'Internal server error'
        });
    }
};

export const getLogStatistics = async (req: Request, res: Response) => {
    try {
        const [statusStats] = (await requestPool.execute(`
            SELECT status, COUNT(*) as count 
            FROM user_requests 
            GROUP BY status
        `)) as any[];

        const [recentStats] = (await requestPool.execute(`
            SELECT 
                COUNT(*) as total_requests,
                SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_requests,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_requests,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_requests
            FROM user_requests 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        `)) as any[];

        const [routeStats] = (await requestPool.execute(`
            SELECT route, COUNT(*) as count 
            FROM user_requests 
            GROUP BY route 
            ORDER BY count DESC 
            LIMIT 10
        `)) as any[];

        const [errorStats] = (await requestPool.execute(`
            SELECT error_code, COUNT(*) as count 
            FROM user_requests 
            WHERE status = 'failed' AND error_code IS NOT NULL
            GROUP BY error_code 
            ORDER BY count DESC
        `)) as any[];

        const safeStatusStats = statusStats.map((stat: any) => ({
            status: stat.status || 'unknown',
            count: safeNumber(stat.count, 0)
        }));

        const safeRecentStats = {
            total_requests: safeNumber(recentStats[0]?.total_requests, 0),
            successful_requests: safeNumber(
                recentStats[0]?.successful_requests,
                0
            ),
            failed_requests: safeNumber(recentStats[0]?.failed_requests, 0),
            pending_requests: safeNumber(recentStats[0]?.pending_requests, 0)
        };

        const safeRouteStats = routeStats.map((stat: any) => ({
            route: stat.route || 'unknown',
            count: safeNumber(stat.count, 0)
        }));

        const safeErrorStats = errorStats.map((stat: any) => ({
            error_code: stat.error_code || 'unknown',
            count: safeNumber(stat.count, 0)
        }));

        res.status(200).json({
            status_statistics: safeStatusStats,
            recent_24h_statistics: safeRecentStats,
            route_statistics: safeRouteStats,
            error_statistics: safeErrorStats
        });
    } catch (error) {
        console.error('Error fetching log statistics:', error);
        res.status(500).json({
            error: 'Failed to fetch log statistics',
            details:
                process.env.NODE_ENV === 'development'
                    ? error
                    : 'Internal server error'
        });
    }
};

export const deleteLogs = async (req: Request, res: Response) => {
    try {
        const { before_date, status } = req.body;

        if (!before_date) {
            return res.status(400).json({
                error: 'before_date is required'
            });
        }

        const date = new Date(before_date);
        if (isNaN(date.getTime())) {
            return res.status(400).json({
                error: 'Invalid date format. Please use ISO format (YYYY-MM-DD or YYYY-MM-DD HH:MM:SS)'
            });
        }

        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        if (date > oneDayAgo) {
            return res.status(400).json({
                error: 'Cannot delete logs from within the last 24 hours for safety reasons'
            });
        }

        let query = 'DELETE FROM user_requests WHERE created_at < ?';
        const params: any[] = [before_date];

        if (status && typeof status === 'string' && status.trim()) {
            const validStatuses = ['pending', 'success', 'failed'];
            if (!validStatuses.includes(status.trim())) {
                return res.status(400).json({
                    error: 'Invalid status. Must be one of: pending, success, failed'
                });
            }
            query += ' AND status = ?';
            params.push(status.trim());
        }

        const [result] = (await requestPool.execute(query, params)) as any[];

        res.status(200).json({
            message: 'Logs deleted successfully',
            deleted_count: safeNumber(result.affectedRows, 0),
            deleted_before: before_date,
            status_filter: status || 'all'
        });
    } catch (error) {
        console.error('Error deleting logs:', error);
        res.status(500).json({
            error: 'Failed to delete logs',
            details:
                process.env.NODE_ENV === 'development'
                    ? error
                    : 'Internal server error'
        });
    }
};

export const getMyRequestLogs = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userid;
        const { page = 1, limit = 10, status } = req.query;

        if (!userId || typeof userId !== 'string' || !userId.trim()) {
            return res.status(401).json({
                error: 'User not authenticated or invalid user ID'
            });
        }

        const { page: safePage, limit: safeLimit } = validatePagination(
            page,
            limit
        );
        const offset = (safePage - 1) * safeLimit;

        let query = 'SELECT * FROM user_requests WHERE user_id = ?';
        const params: any[] = [userId.trim()];

        if (status && typeof status === 'string' && status.trim()) {
            const validStatuses = ['pending', 'success', 'failed'];
            if (validStatuses.includes(status.trim())) {
                query += ' AND status = ?';
                params.push(status.trim());
            }
        }

        query += ` ORDER BY created_at DESC LIMIT ${safeLimit} OFFSET ${offset}`;

        const [logs] = (await requestPool.execute(query, params)) as any[];

        let countQuery =
            'SELECT COUNT(*) as total FROM user_requests WHERE user_id = ?';
        const countParams: any[] = [userId.trim()];

        if (status && typeof status === 'string' && status.trim()) {
            const validStatuses = ['pending', 'success', 'failed'];
            if (validStatuses.includes(status.trim())) {
                countQuery += ' AND status = ?';
                countParams.push(status.trim());
            }
        }

        const [countResult] = (await requestPool.execute(
            countQuery,
            countParams
        )) as any[];
        const total = safeNumber(countResult[0]?.total, 0);

        res.status(200).json({
            logs,
            pagination: {
                page: safePage,
                limit: safeLimit,
                total,
                totalPages: Math.ceil(total / safeLimit)
            }
        });
    } catch (error) {
        console.error('Error fetching my request logs:', error);
        res.status(500).json({
            error: 'Failed to fetch my request logs',
            details:
                process.env.NODE_ENV === 'development'
                    ? error
                    : 'Internal server error'
        });
    }
};
