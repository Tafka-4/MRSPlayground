import express from 'express';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import dotenv from 'dotenv';
import userRoute from './route/userRoute.js';
import testRoute from './route/test.js';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    securityHeaders,
    generalLimiter,
    sessionConfig
} from './middleware/security.js';
import { checkRedisConnection, connectRedis } from './config/redis.js';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.set('trust proxy', true);
app.use(securityHeaders);
app.use(generalLimiter);

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: 104857600 }));

app.use(session(sessionConfig));

app.use(
    (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
    ) => {
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header(
            'Access-Control-Allow-Headers',
            'O, Authorization, Accept, Content-Type, Origin, X-Access-Token, X-Requested-With'
        );
        res.header(
            'Access-Control-Allow-Methods',
            'GET, POST, PATCH, PUT, DELETE, OPTIONS'
        );
        res.header('Access-Control-Allow-Origin', req.headers.origin);
        next();
    }
);

app.disable('x-powered-by');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('public', path.join(__dirname, 'public'));

app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.mjs')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));

app.use('/', userRoute);
app.use('/test', testRoute);

app.use('*', (req: express.Request, res: express.Response) => {
    console.log(req.originalUrl);
    if (req.originalUrl.startsWith('/api')) {
        res.status(404).json({
            error: 'API 엔드포인트를 찾을 수 없습니다.',
            path: req.originalUrl,
            method: req.method
        });
        return;
    }

    res.status(404).render('error/404', {
        message: '요청하신 페이지를 찾을 수 없습니다.',
        path: req.originalUrl
    });
});

app.use(
    (
        err: any,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
    ) => {
        console.error('Global error handler:', err);

        if (process.env.NODE_ENV === 'development') {
            res.status(500).json({
                error: err.message,
                stack: err.stack
            });
        } else {
            res.status(500).render('error/500', {
                message: '서버 내부 오류가 발생했습니다.'
            });
        }
    }
);

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
    await connectRedis();
    console.log(`🚀 User Frontend Server is running on port ${PORT}`);
    console.log(`🔒 Redis Connection: ${await checkRedisConnection()}`);
    console.log(`🔒 Security features enabled:`);
    console.log(`   - Rate Limiting: ✅`);
    console.log(`   - Security Headers: ✅`);
    console.log(`   - Session Management: ✅`);
    console.log(`   - JWT Authentication: ✅`);
    console.log(`   - Admin Protection: ✅`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
