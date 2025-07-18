import { Router } from 'express';
import { loginRequired } from '../middleware/login.js';
import { adminRequired } from '../middleware/admin.js';
import asyncWrapper from '../middleware/asyncWrapper.js';
import { userRequestWatchStart } from '../middleware/userRequestWatch.js';
import * as userController from '../controllers/userController.js';
import upload from '../middleware/upload.js';

const router = Router();

router.get('/admin/statistics', adminRequired, userRequestWatchStart, asyncWrapper(userController.getUserStatistics));
router.get('/admin/search', adminRequired, userRequestWatchStart, asyncWrapper(userController.searchUsers));

router.get('/:userid', userRequestWatchStart, asyncWrapper(userController.getUser));
router.get('/', adminRequired, userRequestWatchStart, asyncWrapper(userController.getUserList));
router.put('/me', loginRequired, userRequestWatchStart, asyncWrapper(userController.updateUser));
router.post('/me/profile-image', loginRequired, userRequestWatchStart, upload.single('profileImage'), asyncWrapper(userController.uploadUserProfileImage));
router.delete('/me/profile-image', loginRequired, userRequestWatchStart, asyncWrapper(userController.deleteUserProfileImage));
router.delete('/me', loginRequired, userRequestWatchStart, asyncWrapper(userController.deleteUser));

router.get('/me/security', loginRequired, userRequestWatchStart, asyncWrapper(userController.getUserSecurityInfo));
router.post('/me/security/cleanup-tokens', loginRequired, userRequestWatchStart, asyncWrapper(userController.cleanupMyTokens));

export default router;
