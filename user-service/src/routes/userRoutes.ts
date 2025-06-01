import { Router } from 'express';
import { loginRequired } from '../middleware/login.js';
import { adminRequired } from '../middleware/admin.js';
import upload from '../middleware/upload.js';
import asyncWrapper from '../middleware/asyncWrapper.js';
import { userRequestWatchStart } from '../middleware/userRequestWatch.js';
import * as userController from '../controllers/userController.js';

const router = Router();

// Admin routes
router.get(
    '/admin/statistics',
    adminRequired,
    userRequestWatchStart,
    asyncWrapper(userController.getUserStatistics)
);

// User management routes
router.get(
    '/:userid',
    userRequestWatchStart,
    asyncWrapper(userController.getUser)
);
router.get(
    '/',
    userRequestWatchStart,
    asyncWrapper(userController.getUserList)
);
router.put(
    '/update',
    loginRequired,
    userRequestWatchStart,
    asyncWrapper(userController.updateUser)
);
router.post(
    '/upload-profile',
    loginRequired,
    userRequestWatchStart,
    upload.single('profileImage'),
    asyncWrapper(userController.uploadUserProfileImage)
);
router.delete(
    '/delete-profile',
    loginRequired,
    userRequestWatchStart,
    asyncWrapper(userController.deleteUserProfileImage)
);
router.delete(
    '/delete',
    loginRequired,
    userRequestWatchStart,
    asyncWrapper(userController.deleteUser)
);

// Security routes
router.get(
    '/security/info',
    loginRequired,
    userRequestWatchStart,
    asyncWrapper(userController.getUserSecurityInfo)
);

router.post(
    '/security/cleanup-tokens',
    loginRequired,
    userRequestWatchStart,
    asyncWrapper(userController.cleanupMyTokens)
);

export default router;
