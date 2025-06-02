import { Router } from 'express';
import { loginRequired } from '../middleware/login.js';
import { adminRequired } from '../middleware/admin.js';
import asyncWrapper from '../middleware/asyncWrapper.js';
import * as logController from '../controllers/logController.js';
import { userRequestWatchStart } from '../middleware/userRequestWatch.js';

const router = Router();

router.get(
    '/',
    loginRequired,
    adminRequired,
    userRequestWatchStart,
    asyncWrapper(logController.getLogs)
);

router.get(
    '/statistics',
    loginRequired,
    adminRequired,
    userRequestWatchStart,
    asyncWrapper(logController.getLogStatistics)
);

router.get(
    '/route-errors',
    loginRequired,
    adminRequired,
    userRequestWatchStart,
    asyncWrapper(logController.getRouteErrors)
);

router.delete(
    '/cleanup',
    loginRequired,
    adminRequired,
    userRequestWatchStart,
    asyncWrapper(logController.deleteLogs)
);

export default router;
