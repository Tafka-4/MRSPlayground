import { Router } from 'express';
import { loginRequired } from '../middleware/login.js';
import { adminRequired } from '../middleware/admin.js';
import asyncWrapper from '../middleware/asyncWrapper.js';
import { userRequestWatchStart } from '../middleware/userRequestWatch.js';
import * as feedbackController from '../controllers/feedbackController.js';

const router = Router();

router.post(
    '/submit',
    userRequestWatchStart,
    asyncWrapper(feedbackController.submitFeedback)
);

router.get(
    '/public',
    userRequestWatchStart,
    asyncWrapper(feedbackController.getPublicFeedback)
);

router.get(
    '/my',
    loginRequired,
    userRequestWatchStart,
    asyncWrapper(feedbackController.getMyFeedback)
);

router.get(
    '/my/:id',
    loginRequired,
    userRequestWatchStart,
    asyncWrapper(feedbackController.getFeedbackDetails)
);

router.get(
    '/admin/all',
    loginRequired,
    adminRequired,
    userRequestWatchStart,
    asyncWrapper(feedbackController.getAllFeedback)
);

router.put(
    '/admin/:id/status',
    loginRequired,
    adminRequired,
    userRequestWatchStart,
    asyncWrapper(feedbackController.updateFeedbackStatus)
);

router.post(
    '/admin/:feedbackId/reply',
    loginRequired,
    adminRequired,
    userRequestWatchStart,
    asyncWrapper(feedbackController.sendFeedbackReply)
);

export default router; 