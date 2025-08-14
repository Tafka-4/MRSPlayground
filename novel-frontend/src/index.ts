import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.set('trust proxy', true);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/config.js', (req, res) => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.magicresearches.com';
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || apiUrl.replace(/^http/, 'ws');
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'no-store');
  res.send(`window.__API_ORIGIN='${apiUrl}';window.__WS_ORIGIN='${wsUrl}';`);
});

app.get('/novels', (_req, res) => {
  res.render('index');
});

app.get('/', (_req, res) => {
  res.render('index');
});

const PORT = process.env.PORT || 3100;
app.listen(PORT, () => {
  console.log(`Novel Frontend running on port ${PORT}`);
});


