import express from 'express';
import { Request, Response } from 'express';
import {
    generalLimiter,
    loginLimiter,
    adminLimiter,
    adminAccessLogger
} from '../middleware/security.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/', (req: Request, res: Response) => {
    res.redirect('/mypage');
});

router.get('/login', loginLimiter, async (req: Request, res: Response) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (refreshToken) {
            const response = await fetch(
                'http://user-service:3001/api/v1/auth/check-token',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Cookie: `refreshToken=${refreshToken}`
                    }
                }
            );
            const data = await response.json();
            if (data.success) {
                res.redirect('/mypage');
            }
        }
    } catch (error) {
        res.clearCookie('refreshToken');
    }

    res.render('./auth/login');
});

router.get('/register', generalLimiter, (req: Request, res: Response) => {
    res.render('./auth/register');
});

router.get('/find-password', generalLimiter, (req: Request, res: Response) => {
    res.render('./auth/find-password');
});

router.get(
    '/verify-internal-member',
    generalLimiter,
    (req: Request, res: Response) => {
        if (req.user && req.user.isVerified) {
            res.redirect('/mypage');
            return;
        }
        res.render('./auth/verify-internal-member');
    }
);

router.get('/mypage', authMiddleware, (req: Request, res: Response) => {
    res.render('./mypage/mypage');
});

router.get('/mypage/edit', authMiddleware, (req: Request, res: Response) => {
    res.render('./mypage/edit');
});

router.get(
    '/mypage/edit/password',
    authMiddleware,
    (req: Request, res: Response) => {
        res.render('./mypage/edit-password');
    }
);

router.get(
    '/admin',
    adminLimiter,
    adminAccessLogger,
    authMiddleware,
    (req: Request, res: Response) => {
        if (req.userAuthority !== 'admin' && req.userAuthority !== 'bot') {
            res.redirect('/mypage');
            return;
        }
        res.render('./admin/admin');
    }
);

router.get(
    '/admin/user',
    adminLimiter,
    adminAccessLogger,
    authMiddleware,
    (req: Request, res: Response) => {
        if (req.userAuthority !== 'admin' && req.userAuthority !== 'bot') {
            res.redirect('/mypage');
            return;
        }
        res.render('./admin/user');
    }
);

router.get(
    '/admin/user/:userid',
    adminLimiter,
    adminAccessLogger,
    authMiddleware,
    (req: Request, res: Response) => {
        if (req.userAuthority !== 'admin' && req.userAuthority !== 'bot') {
            res.redirect('/mypage');
            return;
        }
        res.render('./admin/user');
    }
);

router.get(
    '/admin/admin-list',
    adminLimiter,
    adminAccessLogger,
    authMiddleware,
    (req: Request, res: Response) => {
        if (req.userAuthority !== 'admin' && req.userAuthority !== 'bot') {
            res.redirect('/mypage');
            return;
        }
        res.render('./admin/admin-list');
    }
);

router.get(
    '/admin/logs',
    adminLimiter,
    adminAccessLogger,
    authMiddleware,
    (req: Request, res: Response) => {
        if (req.userAuthority !== 'admin' && req.userAuthority !== 'bot') {
            res.redirect('/mypage');
            return;
        }
        res.render('./admin/logs');
    }
);

router.get(
    '/:userid([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})',
    (req: Request, res: Response) => {
        res.render('./user/user');
    }
);

export default router;
