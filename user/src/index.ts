import express from 'express';
import cookieParser from 'cookie-parser';
import userRoute from './route/userRoute.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: 104857600 }));

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Headers", "O, Authorization, Accept, Content-Type, Origin, X-Access-Token, X-Requested-With");
    res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    next();
});

app.disable('x-powered-by');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('public', path.join(__dirname, 'public'));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', userRoute);

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
