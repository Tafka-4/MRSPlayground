import { Router } from 'express';
import { loginRequired } from '../middleware/login.js';
import asyncWrapper from '../middleware/asyncWrapper.js';
import * as guestbookController from '../controllers/guestbookController.js';

const router = Router();

// Get guestbook entries for a user
router.get('/:userid', asyncWrapper(guestbookController.getGuestbookEntries));

// Get guestbook stats for a user
router.get('/stats/:userid', asyncWrapper(guestbookController.getGuestbookStats));

// Get my guestbook entries
router.get('/me', loginRequired, asyncWrapper(guestbookController.getMyGuestbookEntries));
router.get('/me/stats', loginRequired, asyncWrapper(guestbookController.getMyGuestbookStats));
router.post('/', loginRequired, asyncWrapper(guestbookController.createGuestbookEntry));
router.put('/:entryId', loginRequired, asyncWrapper(guestbookController.updateGuestbookEntry));
router.delete('/:entryId', loginRequired, asyncWrapper(guestbookController.deleteGuestbookEntry));

export default router;