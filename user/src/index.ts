import express from 'express';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import dotenv from 'dotenv';
import userRoute from './route/userRoute.js';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    securityHeaders,
    generalLimiter,
    sessionConfig
} from './middleware/security.js';
import { checkRedisConnection, connectRedis, disconnectRedis } from './config/redis.js';
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

app.get('/health', (req: express.Request, res: express.Response) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'user-frontend'
    });
});

app.use('/', userRoute);

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

const startServer = async () => {
    try {
        await connectRedis();
        
        const server = app.listen(PORT, () => {
            console.log(`🚀 User Frontend Server is running on port ${PORT}`);
            console.log(`🔒 Security features enabled:`);
            console.log(`   - Rate Limiting: ✅`);
            console.log(`   - Security Headers: ✅`);
            console.log(`   - Session Management: ✅`);
            console.log(`   - JWT Authentication: ✅`);
            console.log(`   - Admin Protection: ✅`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        });

        const redisStatus = await checkRedisConnection();
        console.log(`🔒 Redis Connection: ${redisStatus ? '✅ 연결됨' : '❌ 연결 실패'}`);
        
        if (!redisStatus) {
            console.warn('⚠️  Redis 연결이 실패했지만 서버는 계속 실행됩니다.');
        }

        const gracefulShutdown = async (signal: string) => {
            console.log(`\n📡 ${signal} 신호를 받았습니다. 서버를 정상적으로 종료합니다...`);
            
            server.close(async () => {
                console.log('🔒 HTTP 서버가 종료되었습니다.');
                await disconnectRedis();
                console.log('✅ 모든 연결이 정상적으로 종료되었습니다.');
                process.exit(0);
            });
            
            setTimeout(() => {
                console.error('⚠️  정상 종료 시간 초과. 강제 종료합니다.');
                process.exit(1);
            }, 30000);
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        return server;
    } catch (error) {
        console.error('❌ 서버 시작 실패:', error);
        process.exit(1);
    }
};

startServer();
