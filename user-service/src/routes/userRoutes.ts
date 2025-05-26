import { Router } from 'express';
import * as userController from '../controllers/userController.js';
import * as authController from '../controllers/authController.js';

const router = Router();

// User routes
router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser);
router.post('/logout', userController.logoutUser);
router.post('/refresh', userController.refreshToken);
router.get('/:userid', userController.getUser);
router.get('/', userController.getUserList);
router.put('/update', userController.updateUser);
router.post('/upload-profile', userController.uploadUserProfileImage);
router.delete('/delete-profile', userController.deleteUserProfileImage);
router.delete('/delete', userController.deleteUser);

// Auth routes
router.post('/send-verification', authController.sendVerificationEmail);
router.post('/verify-email', authController.verifyEmail);
router.put('/change-email', authController.changeEmail);
router.put('/change-password', authController.changePassword);
router.post('/reset-password-send', authController.resetPasswordMailSend);
router.post('/reset-password', authController.resetPassword);
router.post('/set-admin', authController.setAdmin);

export default router; 