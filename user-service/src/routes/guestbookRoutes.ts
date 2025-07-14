import { Router } from 'express';
import { loginRequired } from '../middleware/login.js';
import asyncWrapper from '../middleware/asyncWrapper.js';
import { userRequestWatchStart } from '../middleware/userRequestWatch.js';
import * as guestbookController from '../controllers/guestbookController.js';

const router = Router();

router.get(
    '/:userid/statistics',
    userRequestWatchStart,
    asyncWrapper(guestbookController.getGuestbookStatistics)
);

router.get(
    '/entry/:entryId',
    userRequestWatchStart,
    asyncWrapper(guestbookController.getGuestbookEntry)
);

router.get(
    '/:userid',
    userRequestWatchStart,
    asyncWrapper(guestbookController.getGuestbookEntries)
);

router.post(
    '/:target_userid',
    loginRequired,
    userRequestWatchStart,
    asyncWrapper(guestbookController.createGuestbookEntry)
);

router.put(
    '/entry/:entryId',
    loginRequired,
    userRequestWatchStart,
    asyncWrapper(guestbookController.updateGuestbookEntry)
);

router.delete(
    '/entry/:entryId',
    loginRequired,
    userRequestWatchStart,
    asyncWrapper(guestbookController.deleteGuestbookEntry)
);

export default router; 