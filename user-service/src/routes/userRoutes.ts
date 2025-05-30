import { Router } from 'express';
import { loginRequired } from '../middleware/login.js';
import upload from '../middleware/upload.js';
import asyncWrapper from '../middleware/asyncWrapper.js';
import * as userController from '../controllers/userController.js';

const router = Router();

// User management routes
router.get('/:userid', loginRequired, asyncWrapper(userController.getUser));
router.get('/', loginRequired, asyncWrapper(userController.getUserList));
router.put('/update', loginRequired, asyncWrapper(userController.updateUser));
router.post(
    '/upload-profile',
    loginRequired,
    upload.single('profileImage'),
    asyncWrapper(userController.uploadUserProfileImage)
);
router.delete(
    '/delete-profile',
    loginRequired,
    asyncWrapper(userController.deleteUserProfileImage)
);
router.delete(
    '/delete',
    loginRequired,
    asyncWrapper(userController.deleteUser)
);

export default router;
