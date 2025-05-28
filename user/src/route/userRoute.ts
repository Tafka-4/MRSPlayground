import express from 'express';
import { Request, Response } from 'express';

const router = express.Router();

const isLoggedIn = (req: Request): boolean => {
    return req.cookies && req.cookies.refreshToken;
};

router.get('/', (req: Request, res: Response) => {
    if (isLoggedIn(req)) {
        res.render('./mypage/mypage');
    } else {
        res.render('./auth/login');
    }
});

router.get('/login', (req: Request, res: Response) => {
    if (isLoggedIn(req)) {
        res.redirect('/');
    } else {
        res.render('./auth/login');
    }
});

router.get('/register', (req: Request, res: Response) => {
    if (isLoggedIn(req)) {
        res.redirect('/');
    } else {
        res.render('./auth/register');
    }
});

router.get('/find-password', (req: Request, res: Response) => {
    if (isLoggedIn(req)) {
        res.redirect('/');
    } else {
        res.render('./auth/find-password');
    }
});

router.get('/verify-internal-member', (req: Request, res: Response) => {
    res.render('./auth/verify-internal-member');
});

router.get('/mypage', (req: Request, res: Response) => {
    res.render('./mypage/mypage');
});

router.get('/mypage/edit', (req: Request, res: Response) => {
    res.render('./mypage/edit');
});

router.get('/mypage/edit/password', (req: Request, res: Response) => {
    res.render('./mypage/edit-password');
});

router.get('/:userid', (req: Request, res: Response) => {
    res.render('./user/user');
});

router.get('/admin', (req: Request, res: Response) => {
    res.render('./admin/admin');
});

router.get('/admin/user', (req: Request, res: Response) => {
    res.render('./admin/user');
});

router.get('/admin/user/:userid', (req: Request, res: Response) => {
    res.render('./admin/user');
});

export default router;
