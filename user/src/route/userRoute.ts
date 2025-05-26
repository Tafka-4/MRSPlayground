import express from 'express';
import { Request, Response } from 'express';

const router = express.Router();

router.get('/login', (req: Request, res: Response) => {
    res.render('./auth/login');
});

router.get('/register', (req: Request, res: Response) => {
    res.render('./auth/register');
});

router.get('/find-password', (req: Request, res: Response) => {
    res.render('./auth/find-password');
});

export default router;
