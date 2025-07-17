import { Request, Response } from 'express';
import { requestPool } from '../config/database.js';
import { User } from '../models/User.js';
import { validatePaginationParams, sanitizeString } from '../utils/sqlSecurity.js';

const safeNumber = (value: any, defaultValue: number = 0): number => {
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
};

const validatePagination = (page: any, limit: any) => {
    return validatePaginationParams(page, limit);
};

const checkDatabaseConnection = async (): Promise<boolean> => {
    try {
        await requestPool.execute('SELECT 1');
        return true;
    } catch (error) {
        console.error('Database connection check failed:', error);
        return false;
    }
};

interface LogFilters {
    status?: string;
    userId?: string;
    route?: string;
    ip?: string;
    dateFrom?: string;
    dateTo?: string;
    onlyMine?: boolean;
    onlyErrors?: boolean;
}

class LogQueryBuilder {
    private baseQuery = `
        SELECT 
            ur.request_id,
            ur.user_id,
            ur.route,
            ur.method,
            ur.status,
            ur.created_at,
            ur.updated_at,
            ur.client_ip,
            ur.user_agent,
            ur.error_code,
            ur.error_message,
            ur.retry_count
        FROM user_requests ur
    `;
    private countQuery = 'SELECT COUNT(*) as total FROM user_requests ur';
    private conditions: string[] = [];
    private params: any[] = [];

    constructor(filters: LogFilters, currentUserId?: string) {
        this.applyFilters(filters, currentUserId);
    }

    private applyFilters(filters: LogFilters, currentUserId?: string) {
        if (filters.onlyMine && currentUserId) {
            this.addCondition('user_id = ?', currentUserId);
        }

        if (filters.onlyErrors) {
            this.addCondition('status = ?', 'failed');
        }

        if (
            filters.status &&
            ['pending', 'success', 'failed'].includes(filters.status)
        ) {
            this.addCondition('status = ?', filters.status);
        }

        if (filters.userId && !filters.onlyMine) {
            this.addCondition('user_id = ?', filters.userId);
        }

        if (filters.route) {
            this.addCondition('route LIKE ?', `%${filters.route}%`);
        }

        if (filters.ip) {
            this.addCondition('client_ip LIKE ?', `%${filters.ip}%`);
        }

        if (filters.dateFrom) {
            this.addCondition('created_at >= ?', filters.dateFrom);
        }
        if (filters.dateTo) {
            this.addCondition('created_at <= ?', filters.dateTo);
        }
    }

    private addCondition(condition: string, param: any) {
        this.conditions.push(condition);
        this.params.push(param);
    }

    buildQuery(page: number, limit: number, isExport: boolean = false): { query: string; params: any[] } {
        let query = this.baseQuery;
        const params = [...this.params];

        if (this.conditions.length > 0) {
            query += ' WHERE ' + this.conditions.join(' AND ');
        }

        query += ' ORDER BY created_at DESC';

        if (!isExport) {
            const offset = (page - 1) * limit;
            query += ` LIMIT ${limit} OFFSET ${offset}`;
        } else {
            query += ' LIMIT 10000';
        }

        return { query, params };
    }

    buildCountQuery(): { query: string; params: any[] } {
        let query = this.countQuery;
        const params = [...this.params];
        
        if (this.conditions.length > 0) {
            query += ' WHERE ' + this.conditions.join(' AND ');
        }
        
        return { query, params };
    }

    getParams(): any[] {
        return this.params;
    }
}

const enrichLogsWithUserInfo = async (logs: any[]): Promise<any[]> => {
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
        const isConnected = await checkDatabaseConnection();
        if (!isConnected) {
            return res.status(503).json({
                success: false,
                error: 'Database connection failed',
                message: 'Service temporarily unavailable'
            });
        }

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

        const { page: safePage, limit: safeLimit } = validatePagination(
            page,
            limit
        );
        const currentUserId = req.user?.userid;

        const isAdmin =
            req.user?.authority === 'admin' || req.user?.authority === 'bot';
        const isMyLogsRequest = onlyMine === 'true';

        if (!isAdmin && !isMyLogsRequest) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
                message: 'Only admins can view all logs'
            });
        }

        if (isMyLogsRequest && !currentUserId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                message: 'User not authenticated'
            });
        }

        const filters: LogFilters = {
            status: status as string,
            userId: userId as string,
            route: route as string,
            ip: ip as string,
            dateFrom: dateFrom as string,
            dateTo: dateTo as string,
            onlyMine: isMyLogsRequest,
            onlyErrors: onlyErrors === 'true'
        };

        const queryBuilder = new LogQueryBuilder(filters, currentUserId);
        console.log(queryBuilder.getParams());
        console.log(filters);

        const { query: logsQuery, params: logsParams } = queryBuilder.buildQuery(
            safePage,
            safeLimit,
            isExport === 'true'
        );
        console.log(logsQuery);
        console.log(logsParams);
        const [logs] = await requestPool.execute(logsQuery, logsParams);

        const enrichedLogs = await enrichLogsWithUserInfo(logs as any[]);

        const response: any = {
            success: true,
            logs: enrichedLogs
        };

        if (isExport !== 'true') {
            const { query: countQuery, params: countParams } = queryBuilder.buildCountQuery();
            const [countResult] = await requestPool.execute(countQuery, countParams);
            const total = safeNumber((countResult as any[])[0]?.total, 0);

            response.pagination = {
                page: safePage,
                limit: safeLimit,
                total,
                totalPages: Math.ceil(total / safeLimit)
            };
        }

        res.status(200).json(response);
    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch logs',
            details:
                process.env.NODE_ENV === 'development'
                    ? String(error)
                    : 'Internal server error'
        });
    }
};

export const getLogStatistics = async (req: Request, res: Response) => {
    try {
        const [statusStats] = await requestPool.execute(`
            SELECT status, COUNT(*) as count 
            FROM user_requests 
            GROUP BY status
        `);

        const [recentStats] = await requestPool.execute(`
            SELECT 
                COUNT(*) as total_requests,
                SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_requests,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_requests,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_requests
            FROM user_requests 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        `);

        const [routeStats] = await requestPool.execute(`
            SELECT route, COUNT(*) as count 
            FROM user_requests 
            GROUP BY route 
            ORDER BY count DESC 
            LIMIT 10
        `);

        const [errorStats] = await requestPool.execute(`
            SELECT error_code, COUNT(*) as count 
            FROM user_requests 
            WHERE status = 'failed' AND error_code IS NOT NULL
            GROUP BY error_code 
            ORDER BY count DESC
        `);

        res.status(200).json({
            success: true,
            status_statistics: (statusStats as any[]).map((stat) => ({
                status: stat.status || 'unknown',
                count: safeNumber(stat.count, 0)
            })),
            recent_24h_statistics: {
                total_requests: safeNumber(
                    (recentStats as any[])[0]?.total_requests,
                    0
                ),
                successful_requests: safeNumber(
                    (recentStats as any[])[0]?.successful_requests,
                    0
                ),
                failed_requests: safeNumber(
                    (recentStats as any[])[0]?.failed_requests,
                    0
                ),
                pending_requests: safeNumber(
                    (recentStats as any[])[0]?.pending_requests,
                    0
                )
            },
            route_statistics: (routeStats as any[]).map((stat) => ({
                route: stat.route || 'unknown',
                count: safeNumber(stat.count, 0)
            })),
            error_statistics: (errorStats as any[]).map((stat) => ({
                error_code: stat.error_code || 'unknown',
                count: safeNumber(stat.count, 0)
            }))
        });
    } catch (error) {
        console.error('Error fetching log statistics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch log statistics',
            details:
                process.env.NODE_ENV === 'development'
                    ? error
                    : 'Internal server error'
        });
    }
};

export const getRouteErrors = async (req: Request, res: Response) => {
    try {
        const { route } = req.query;
        const { page = 1, limit = 20 } = req.query;

        if (!route || typeof route !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Route parameter is required'
            });
        }

        const { page: safePage, limit: safeLimit } = validatePagination(
            page,
            limit
        );
        const offset = (safePage - 1) * safeLimit;

        const [logs] = await requestPool.execute(
            `
            SELECT 
                ur.request_id, ur.user_id, ur.route, ur.status, ur.created_at, ur.updated_at,
                ur.client_ip, ur.user_agent, ur.error_code, ur.error_message, ur.retry_count
            FROM user_requests ur
            WHERE ur.route = ? AND ur.status = 'failed'
            ORDER BY ur.created_at DESC 
            LIMIT ${safeLimit} OFFSET ${offset}
        `,
            [route]
        );

        const enrichedLogs = await enrichLogsWithUserInfo(logs as any[]);

        const [errorStats] = await requestPool.execute(
            `
            SELECT 
                error_code, error_message, COUNT(*) as count,
                MAX(created_at) as last_occurrence
            FROM user_requests 
            WHERE route = ? AND status = 'failed' AND error_code IS NOT NULL
            GROUP BY error_code, error_message
            ORDER BY count DESC
        `,
            [route]
        );

        const [timeStats] = await requestPool.execute(
            `
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00') as hour_period,
                COUNT(*) as error_count
            FROM user_requests 
            WHERE route = ? AND status = 'failed' 
                AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            GROUP BY hour_period
            ORDER BY hour_period DESC
        `,
            [route]
        );

        const [countResult] = await requestPool.execute(
            'SELECT COUNT(*) as total FROM user_requests WHERE route = ? AND status = "failed"',
            [route]
        );

        const total = safeNumber((countResult as any[])[0]?.total, 0);

        res.status(200).json({
            success: true,
            route,
            error_logs: enrichedLogs,
            error_statistics: (errorStats as any[]).map((stat) => ({
                error_code: stat.error_code || 'unknown',
                error_message: stat.error_message || 'No message',
                count: safeNumber(stat.count, 0),
                last_occurrence: stat.last_occurrence
            })),
            hourly_statistics: (timeStats as any[]).map((stat) => ({
                hour: stat.hour_period,
                error_count: safeNumber(stat.error_count, 0)
            })),
            pagination: {
                page: safePage,
                limit: safeLimit,
                total,
                totalPages: Math.ceil(total / safeLimit)
            }
        });
    } catch (error) {
        console.error('Error fetching route error details:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch route error details',
            details:
                process.env.NODE_ENV === 'development'
                    ? String(error)
                    : 'Internal server error'
        });
    }
};

export const deleteLogs = async (req: Request, res: Response) => {
    try {
        const { beforeDate, status } = req.query;

        if (!beforeDate) {
            return res.status(400).json({
                success: false,
                error: 'beforeDate parameter is required'
            });
        }

        const date = new Date(beforeDate as string);
        if (isNaN(date.getTime())) {
            return res.status(400).json({
                success: false,
                error: 'Invalid date format. Please use ISO format (YYYY-MM-DD or YYYY-MM-DD HH:MM:SS)'
            });
        }

        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        if (date > oneDayAgo) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete logs from within the last 24 hours for safety reasons'
            });
        }

        let query = 'DELETE FROM user_requests WHERE created_at < ?';
        const params: any[] = [beforeDate];

        if (
            status &&
            ['pending', 'success', 'failed'].includes(status as string)
        ) {
            query += ' AND status = ?';
            params.push(status);
        }

        const [result] = await requestPool.execute(query, params);

        res.status(200).json({
            success: true,
            message: 'Logs deleted successfully',
            deletedCount: safeNumber((result as any).affectedRows, 0),
            deletedBefore: beforeDate,
            statusFilter: status || 'all'
        });
    } catch (error) {
        console.error('Error deleting logs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete logs',
            details:
                process.env.NODE_ENV === 'development'
                    ? error
                    : 'Internal server error'
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
