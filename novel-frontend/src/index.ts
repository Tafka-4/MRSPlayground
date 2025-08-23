import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createClient } from 'redis';
import rateLimit from 'express-rate-limit';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3002');

let redisClient: ReturnType<typeof createClient> | null = null;
let isReconnecting = false;
let lastErrorLoggedAt = 0;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

const setupRedisEvents = (client: ReturnType<typeof createClient>) => {
    client.on('error', (err: unknown) => {
        const now = Date.now();
        if (now - lastErrorLoggedAt > 60000) {
            console.error('Redis Client Error:', err);
            lastErrorLoggedAt = now;
        }
        if (!isReconnecting && !client.isOpen) {
            isReconnecting = true;
            setTimeout(async () => {
                try {
                    await client.connect();
                    isReconnecting = false;
                } catch {
                    isReconnecting = false;
                }
            }, 3000);
        }
    });
    client.on('end', () => {
        if (!isReconnecting) {
            isReconnecting = true;
            setTimeout(async () => {
                try {
                    await client.connect();
                    isReconnecting = false;
                } catch {
                    isReconnecting = false;
                }
            }, 3000);
        }
    });
    client.on('ready', () => {
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }
        heartbeatInterval = setInterval(async () => {
            if (redisClient && redisClient.isOpen) {
                try { await redisClient.ping(); } catch {}
            }
        }, 30000);
    });
};

const initRedis = async () => {
    try {
        redisClient = createClient({
            url: process.env.REDIS_URL || 'redis://redis:6379',
            password: process.env.REDIS_PASSWORD,
            socket: {
                connectTimeout: 10000,
                keepAlive: 60000,
                reconnectStrategy: (retries: number) => Math.min(retries * 1000, 5000)
            }
        });
        setupRedisEvents(redisClient);
        await redisClient.connect();
        console.log('✅ Redis connected');
    } catch (error) {
        console.warn('⚠️ Redis connection failed, continuing without cache:', error);
        redisClient = null;
    }
};

app.set('trust proxy', true);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, 'public')));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.'
});

app.use(limiter);

app.use((req, res, next) => {
    res.locals.currentPath = req.path;
    res.locals.brandText = '마법연구회';
    res.locals.brandHref = '/';
    res.locals.isAuthenticated = !!(req.cookies.accessToken || req.cookies.refreshToken);
    res.locals.brandText = '마법연구회';
    res.locals.brandHref = '/';
    next();
});

const checkAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const token = req.cookies.accessToken || req.headers.authorization?.replace('Bearer ', '');
    const hasRefresh = !!req.cookies.refreshToken;
    if (!token && !hasRefresh) {
        const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
        const loginUrl = `https://dev.magicresearches.com/login?redirect=${encodeURIComponent(fullUrl)}`;
        return res.redirect(loginUrl);
    }
    next();
};

app.get('/', async (req, res) => {
    try {
        res.render('pages/index', {
            title: '마법연구회 아카이브',
            currentSection: 'archive'
        });
    } catch (error) {
        console.error('Index page error:', error);
        res.status(500).render('error/500', { title: '서버 오류' });
    }
});

app.get('/novels', async (req, res) => {
    try {
        const { sort = 'updated', q = '', page = '1', size = '10' } = req.query;
        
        res.render('pages/novels', {
            title: '소설 목록',
            currentSection: 'archive',
            sort,
            query: q,
            page: parseInt(page as string),
            size: parseInt(size as string)
        });
    } catch (error) {
        console.error('Novels page error:', error);
        res.status(500).render('error/500', { title: '서버 오류' });
    }
});

app.get('/search', async (req, res) => {
    try {
        const { query = '', sort = 'updated', tags = '', page = '1', size = '10', genre = '' } = req.query as any;
        const tagList = typeof tags === 'string' ? (tags as string).split(',').map(t => t.trim()).filter(Boolean) : Array.isArray(tags) ? tags : [];
        res.render('pages/search', {
            title: '검색',
            currentSection: 'archive',
            query,
            sort,
            tags: tagList,
            genre,
            page: parseInt(page as string),
            size: parseInt(size as string)
        });
    } catch (error) {
        console.error('Search page error:', error);
        res.status(500).render('error/500', { title: '서버 오류' });
    }
});

app.get('/rank', async (req, res) => {
    try {
        const { range = 'week' } = req.query;
        
        res.render('pages/rank', {
            title: '랭킹',
            currentSection: 'archive',
            range
        });
    } catch (error) {
        console.error('Rank page error:', error);
        res.status(500).render('error/500', { title: '서버 오류' });
    }
});

app.get('/library', checkAuth, async (req, res) => {
    try {
        const { type = 'liked', sort = 'recent', page = '1', size = '10' } = req.query;
        
        res.render('pages/library', {
            title: '내 서재',
            currentSection: 'archive',
            type,
            sort,
            page: parseInt(page as string),
            size: parseInt(size as string)
        });
    } catch (error) {
        console.error('Library page error:', error);
        res.status(500).render('error/500', { title: '서버 오류' });
    }
});

app.get('/mypage', checkAuth, async (req, res) => {
    try {
        res.render('pages/mypage', {
            title: '마이페이지',
            currentSection: 'archive'
        });
    } catch (error) {
        console.error('Mypage error:', error);
        res.status(500).render('error/500', { title: '서버 오류' });
    }
});

app.get('/novel/upload', checkAuth, async (req, res) => {
    try {
        res.render('pages/novel-upload', {
            title: '소설 업로드',
            currentSection: 'archive'
        });
    } catch (error) {
        console.error('Novel upload page error:', error);
        res.status(500).render('error/500', { title: '서버 오류' });
    }
});

app.get('/novel/:uuid', async (req, res) => {
    try {
        const { uuid } = req.params;
        
        res.render('pages/novel-detail', {
            title: '소설 상세',
            currentSection: 'archive',
            novelId: uuid
        });
    } catch (error) {
        console.error('Novel detail page error:', error);
        res.status(500).render('error/500', { title: '서버 오류' });
    }
});

app.get('/novel/:uuid/edit', checkAuth, async (req, res) => {
    try {
        const { uuid } = req.params;
        
        res.render('pages/novel-edit', {
            title: '소설 수정',
            currentSection: 'archive',
            novelId: uuid
        });
    } catch (error) {
        console.error('Novel edit page error:', error);
        res.status(500).render('error/500', { title: '서버 오류' });
    }
});

app.get('/novel/:uuid/comment', async (req, res) => {
    try {
        const { uuid } = req.params;
        const { sort = 'latest', page = '1', size = '20' } = req.query;
        
        res.render('pages/novel-comment', {
            title: '소설 댓글',
            currentSection: 'archive',
            novelId: uuid,
            sort,
            page: parseInt(page as string),
            size: parseInt(size as string)
        });
    } catch (error) {
        console.error('Novel comment page error:', error);
        res.status(500).render('error/500', { title: '서버 오류' });
    }
});

app.get('/novel/:uuid/episode/upload', checkAuth, async (req, res) => {
    try {
        const { uuid } = req.params;
        
        res.render('pages/episode-upload', {
            title: '에피소드 업로드',
            currentSection: 'archive',
            novelId: uuid
        });
    } catch (error) {
        console.error('Episode upload page error:', error);
        res.status(500).render('error/500', { title: '서버 오류' });
    }
});

app.get('/novel/:uuid/episode/:episodeId', async (req, res) => {
    try {
        const { uuid, episodeId } = req.params;
        
        res.render('pages/episode-detail', {
            title: '에피소드',
            currentSection: 'archive',
            novelId: uuid,
            episodeId
        });
    } catch (error) {
        console.error('Episode detail page error:', error);
        res.status(500).render('error/500', { title: '서버 오류' });
    }
});

app.get('/novel/:uuid/episode/:episodeId/edit', checkAuth, async (req, res) => {
    try {
        const { uuid, episodeId } = req.params;
        
        res.render('pages/episode-edit', {
            title: '에피소드 수정',
            currentSection: 'archive',
            novelId: uuid,
            episodeId
        });
    } catch (error) {
        console.error('Episode edit page error:', error);
        res.status(500).render('error/500', { title: '서버 오류' });
    }
});

app.get('/novel/:uuid/episode/:episodeId/comment', async (req, res) => {
    try {
        const { uuid, episodeId } = req.params;
        const { sort = 'latest', page = '1', size = '20' } = req.query;
        
        res.render('pages/episode-comment', {
            title: '에피소드 댓글',
            currentSection: 'archive',
            novelId: uuid,
            episodeId,
            sort,
            page: parseInt(page as string),
            size: parseInt(size as string)
        });
    } catch (error) {
        console.error('Episode comment page error:', error);
        res.status(500).render('error/500', { title: '서버 오류' });
    }
});

app.get('/novel/:uuid/notice/upload', checkAuth, async (req, res) => {
    try {
        const { uuid } = req.params;
        
        res.render('pages/notice-upload', {
            title: '공지사항 작성',
            currentSection: 'archive',
            novelId: uuid
        });
    } catch (error) {
        console.error('Notice upload page error:', error);
        res.status(500).render('error/500', { title: '서버 오류' });
    }
});

app.get('/novel/:uuid/notice/:noticeId', async (req, res) => {
    try {
        const { uuid, noticeId } = req.params;
        
        res.render('pages/notice-detail', {
            title: '공지사항',
            currentSection: 'archive',
            novelId: uuid,
            noticeId
        });
    } catch (error) {
        console.error('Notice detail page error:', error);
        res.status(500).render('error/500', { title: '서버 오류' });
    }
});

app.get('/novel/:uuid/notice/:noticeId/edit', checkAuth, async (req, res) => {
    try {
        const { uuid, noticeId } = req.params;
        
        res.render('pages/notice-edit', {
            title: '공지사항 수정',
            currentSection: 'archive',
            novelId: uuid,
            noticeId
        });
    } catch (error) {
        console.error('Notice edit page error:', error);
        res.status(500).render('error/500', { title: '서버 오류' });
    }
});

app.get('/novel/:uuid/notice/:noticeId/comment', async (req, res) => {
    try {
        const { uuid, noticeId } = req.params;
        const { sort = 'latest', page = '1', size = '20' } = req.query;
        
        res.render('pages/notice-comment', {
            title: '공지사항 댓글',
            currentSection: 'archive',
            novelId: uuid,
            noticeId,
            sort,
            page: parseInt(page as string),
            size: parseInt(size as string)
        });
    } catch (error) {
        console.error('Notice comment page error:', error);
        res.status(500).render('error/500', { title: '서버 오류' });
    }
});

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        service: 'Novel Frontend',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

app.use((req, res) => {
    res.status(404).render('error/404', {
        title: '페이지를 찾을 수 없습니다',
        currentSection: 'archive'
    });
});

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Server error:', err);
    res.status(500).render('error/500', {
        title: '서버 오류',
        currentSection: 'archive'
    });
});

const startServer = async () => {
    try {
        await initRedis();
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Novel Frontend is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
