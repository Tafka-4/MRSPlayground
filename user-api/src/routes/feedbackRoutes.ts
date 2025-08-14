import { Router } from 'express';
import { loginRequired } from '../middleware/login.js';
import { adminRequired } from '../middleware/admin.js';
import asyncWrapper from '../middleware/asyncWrapper.js';
import * as feedbackController from '../controllers/feedbackController.js';

const router = Router();

router.post('/', loginRequired, asyncWrapper(feedbackController.createFeedback));
router.get('/', loginRequired, adminRequired, asyncWrapper(feedbackController.getAllFeedback));
router.get('/:id', loginRequired, adminRequired, asyncWrapper(feedbackController.getFeedbackById));
router.put('/:id', loginRequired, adminRequired, asyncWrapper(feedbackController.updateFeedback));
router.delete('/:id', loginRequired, adminRequired, asyncWrapper(feedbackController.deleteFeedback));

export default router; 