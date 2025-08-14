import { Router } from 'express';
import { loginRequired } from '../middleware/login.js';
import asyncWrapper from '../middleware/asyncWrapper.js';
import * as guestbookController from '../controllers/guestbookController.js';
import { rateLimitMiddleware } from '../middleware/rateLimit.js';

const router = Router();

// Get guestbook entries for a user
router.get('/:userid', asyncWrapper(guestbookController.getGuestbookEntries));

// Get guestbook stats for a user
router.get('/stats/:userid', asyncWrapper(guestbookController.getGuestbookStats));

// Get my guestbook entries
router.get('/me', loginRequired, asyncWrapper(guestbookController.getMyGuestbookEntries));
router.get('/me/stats', loginRequired, asyncWrapper(guestbookController.getMyGuestbookStats));

const createRateLimit = rateLimitMiddleware({
    apiName: 'guestbook_create',
    limit: 1,
    windowSeconds: 24 * 60 * 60, // 1 day
});

const updateRateLimit = rateLimitMiddleware({
    apiName: 'guestbook_update',
    limit: 3,
    windowSeconds: 24 * 60 * 60, // 1 day
});

router.post('/', loginRequired, createRateLimit, asyncWrapper(guestbookController.createGuestbookEntry));
router.put('/:entryId', loginRequired, updateRateLimit, asyncWrapper(guestbookController.updateGuestbookEntry));
router.delete('/:entryId', loginRequired, asyncWrapper(guestbookController.deleteGuestbookEntry));

// For admin to reset limits
router.post('/admin/reset-limit', loginRequired, asyncWrapper(guestbookController.resetGuestbookLimits));

export default router;