import { Router } from 'express';
import { loginRequired } from '../middleware/login.js';
import asyncWrapper from '../middleware/asyncWrapper.js';
import * as guestbookController from '../controllers/guestbookController.js';

const router = Router();

router.get('/me/stats', loginRequired, asyncWrapper(guestbookController.getMyGuestbookStats));
router.get('/me', loginRequired, asyncWrapper(guestbookController.getMyGuestbookEntries));
router.post('/', loginRequired, asyncWrapper(guestbookController.createGuestbookEntry));
router.get('/:userid', asyncWrapper(guestbookController.getGuestbookEntries));
router.put('/:entryId', loginRequired, asyncWrapper(guestbookController.updateGuestbookEntry));
router.delete('/:entryId', loginRequired, asyncWrapper(guestbookController.deleteGuestbookEntry));

export default router;