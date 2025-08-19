import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '5100');

app.set('trust proxy', true);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get('/api/v1/health', (_req, res) => {
  res.status(200).json({ status: 'OK', service: 'Research API', timestamp: new Date().toISOString() });
});

app.get('/api/v1', (_req, res) => {
  res.status(200).json({ service: 'MRS Research API', version: '0.1.0' });
});

app.get('/api/v1/research', (_req, res) => {
  res.status(200).json({ message: 'Research API root' });
});

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found', path: req.originalUrl });
});

app.listen(PORT, () => {
  console.log(`Research API running on port ${PORT}`);
});


