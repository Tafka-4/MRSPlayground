import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

export const generalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 1200,
    message: {
        error: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
        retryAfter: '1분'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
        const forwardedFor = req.headers['x-forwarded-for'] as string;
        const realIp = req.headers['x-real-ip'] as string;
        const clientIp = req.ip;

        if (forwardedFor) {
            return forwardedFor.split(',')[0].trim();
        }
        if (realIp) {
            return realIp;
        }

        return clientIp || 'unknown';
    },
    handler: (req: Request, res: Response) => {
        res.status(429).render('error/429', {
            message:
                '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
            retryAfter: '1분'
        });
    }
});

export const loginLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 1200,
    message: {
        error: '로그인 시도가 너무 많습니다. 1분 후 다시 시도해주세요.',
        retryAfter: '1분'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    keyGenerator: (req: Request) => {
        const forwardedFor = req.headers['x-forwarded-for'] as string;
        const realIp = req.headers['x-real-ip'] as string;
        const clientIp = req.ip;

        if (forwardedFor) {
            return forwardedFor.split(',')[0].trim();
        }
        if (realIp) {
            return realIp;
        }

        return clientIp || 'unknown';
    },
    handler: (req: Request, res: Response) => {
        res.status(429).render('auth/login', {
            error: '로그인 시도가 너무 많습니다. 1분 후 다시 시도해주세요.',
            retryAfter: '1분'
        });
    }
});

export const adminLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 1200,
    message: {
        error: '관리자 페이지 요청이 너무 많습니다. 1분 후 다시 시도해주세요.',
        retryAfter: '1분'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
        const forwardedFor = req.headers['x-forwarded-for'] as string;
        const realIp = req.headers['x-real-ip'] as string;
        const clientIp = req.ip;

        if (forwardedFor) {
            return forwardedFor.split(',')[0].trim();
        }
        if (realIp) {
            return realIp;
        }

        return clientIp || 'unknown';
    },
    handler: (req: Request, res: Response) => {
        res.status(429).render('error/429', {
            message:
                '관리자 페이지 요청이 너무 많습니다. 1분 후 다시 시도해주세요.',
            retryAfter: '1분'
        });
    }
});

export const securityHeaders = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');

    if (process.env.NODE_ENV === 'production') {
        res.setHeader(
            'Strict-Transport-Security',
            'max-age=31536000; includeSubDomains'
        );
    }

    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self' 'unsafe-eval' 'unsafe-inline' " +
            "fonts.googleapis.com fonts.gstatic.com fastly.jsdelivr.net " +
            "static.cloudflareinsights.com *.cloudflare.com cdnjs.cloudflare.com; " +
            
        "script-src 'self' 'unsafe-eval' 'unsafe-inline' " +
            "fonts.googleapis.com fonts.gstatic.com fastly.jsdelivr.net " +
            "static.cloudflareinsights.com *.cloudflare.com cdnjs.cloudflare.com " +
            "unpkg.com cdn.jsdelivr.net; " +
            
        "script-src-elem 'self' 'unsafe-inline' " +
            "fonts.googleapis.com fonts.gstatic.com fastly.jsdelivr.net " +
            "static.cloudflareinsights.com *.cloudflare.com cdnjs.cloudflare.com " +
            "unpkg.com cdn.jsdelivr.net; " +
            
        "style-src 'self' 'unsafe-inline' " +
            "fonts.googleapis.com fonts.gstatic.com fastly.jsdelivr.net " +
            "cdnjs.cloudflare.com unpkg.com cdn.jsdelivr.net; " +
            
        "style-src-elem 'self' 'unsafe-inline' " +
            "fonts.googleapis.com fonts.gstatic.com fastly.jsdelivr.net " +
            "cdnjs.cloudflare.com unpkg.com cdn.jsdelivr.net; " +
            
        "img-src 'self' data: blob: " +
            "fonts.googleapis.com fonts.gstatic.com fastly.jsdelivr.net " +
            "*.gravatar.com *.wp.com; " +
            
        "media-src 'self' data: blob: " +
            "fonts.googleapis.com fonts.gstatic.com fastly.jsdelivr.net; " +
            
        "font-src 'self' data: " +
            "fonts.googleapis.com fonts.gstatic.com fastly.jsdelivr.net " +
            "cdnjs.cloudflare.com unpkg.com cdn.jsdelivr.net; " +
            
        "frame-src 'self' " +
            "fonts.googleapis.com fonts.gstatic.com " +
            "static.cloudflareinsights.com *.cloudflare.com fastly.jsdelivr.net; " +
            
        "connect-src 'self' ws: wss: " +
            "static.cloudflareinsights.com *.cloudflare.com " +
            "fonts.googleapis.com fonts.gstatic.com fastly.jsdelivr.net; " +
            
        "worker-src 'self' blob:; " +
        "object-src 'none'; " +
        "base-uri 'self';"
    );

    next();
};

export const ipWhitelist = (allowedIPs: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const clientIP =
            req.ip || req.connection.remoteAddress || req.socket.remoteAddress;

        if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP as string)) {
            console.warn(`Blocked access from IP: ${clientIP}`);
            return res.status(403).render('error/403', {
                message: '접근이 허용되지 않은 IP 주소입니다.'
            });
        }

        next();
    };
};

export const adminAccessLogger = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const timestamp = new Date().toISOString();
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    console.log(
        `[ADMIN ACCESS] ${timestamp} - IP: ${ip} - Path: ${req.path} - UserAgent: ${userAgent}`
    );

    next();
};

export const sessionConfig = {
    secret:
        process.env.SESSION_SECRET ||
        'your-super-secret-session-key-change-this-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'strict' as const
    },
    name: 'sessionId'
};
