import { Router } from 'express';
import { loginRequired } from '../middleware/login.js';
import { userRequestWatchStart } from '../middleware/userRequestWatch.js';
import asyncWrapper from '../middleware/asyncWrapper.js';
import { listSelfNotifications, listUserNotifications, queryNotifications } from '../controller/notificationController.js';

const router = Router();

router.get('/self', loginRequired, userRequestWatchStart, asyncWrapper(listSelfNotifications));
router.get('/', userRequestWatchStart, asyncWrapper(queryNotifications));
router.get('/users/:userid', userRequestWatchStart, asyncWrapper(listUserNotifications));

export default router;


