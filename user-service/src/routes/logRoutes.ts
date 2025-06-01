import { Router } from 'express';
import { loginRequired } from '../middleware/login.js';
import { adminRequired } from '../middleware/admin.js';
import asyncWrapper from '../middleware/asyncWrapper.js';
import * as logController from '../controllers/logController.js';
import { userRequestWatchStart } from '../middleware/userRequestWatch.js';
const router = Router();

router.get(
    '/my-logs',
    loginRequired,
    userRequestWatchStart,
    asyncWrapper(logController.getMyRequestLogs)
);

router.get(
    '/admin/logs',
    adminRequired,
    userRequestWatchStart,
    asyncWrapper(logController.getUserRequestLogs)
);

router.get(
    '/admin/logs/user/:userId',
    adminRequired,
    userRequestWatchStart,
    asyncWrapper(logController.getUserSpecificLogs)
);

router.get(
    '/admin/logs/statistics',
    adminRequired,
    userRequestWatchStart,
    asyncWrapper(logController.getLogStatistics)
);

router.delete(
    '/admin/logs/cleanup',
    adminRequired,
    userRequestWatchStart,
    asyncWrapper(logController.deleteLogs)
);

export default router;
