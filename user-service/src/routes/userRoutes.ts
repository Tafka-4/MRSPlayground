import { Router } from 'express';
import { loginRequired } from '../middleware/login.js';
import upload from '../middleware/upload.js';
import * as userController from '../controllers/userController.js';

const router = Router();

// User management routes
router.get('/:userid', loginRequired, userController.getUser);
router.get('/', loginRequired, userController.getUserList);
router.put('/update', loginRequired, userController.updateUser);
router.post('/upload-profile', loginRequired, upload.single('profileImage'), userController.uploadUserProfileImage);
router.delete('/delete-profile', loginRequired, userController.deleteUserProfileImage);
router.delete('/delete', loginRequired, userController.deleteUser);

export default router; 