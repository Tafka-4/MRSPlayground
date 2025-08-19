import express from 'express';

const router = express.Router();

router.get('/health', (_req, res) => {
    res.status(200).json({ status: 'OK', service: 'Research Demo', timestamp: new Date().toISOString() });
});

router.get('/', (_req, res) => {
    res.status(200).json({ service: 'MRS Research Demo API', version: '0.1.0' });
});

export default router;


