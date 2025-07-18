import { Router } from 'express';
import { loginRequired } from '../middleware/login.js';
import { adminRequired } from '../middleware/admin.js';
import asyncWrapper from '../middleware/asyncWrapper.js';
import * as logController from '../controllers/logController.js';

const router = Router();

// Admin routes
router.get('/', loginRequired, adminRequired, asyncWrapper(logController.getLogs));
router.get('/statistics', loginRequired, adminRequired, asyncWrapper(logController.getLogStatistics));
router.get('/route-errors', loginRequired, adminRequired, asyncWrapper(logController.getRouteErrorDetails));
router.delete('/', loginRequired, adminRequired, asyncWrapper(logController.deleteLogs));

// User activity route
router.get('/users/:userid/activity', asyncWrapper(logController.getUserLogs));

export default router;
