import { Router } from 'express';
import { loginRequired } from '../middleware/login.js';
import * as authController from '../controllers/authController.js';

const router = Router();

// Authentication routes
router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);
router.post('/logout', loginRequired, authController.logoutUser);
router.post('/refresh', authController.refreshToken);
router.get('/me', loginRequired, authController.getCurrentUser);

// Email verification routes
router.post('/send-verification', authController.sendVerificationEmail);
router.post('/verify-email', authController.verifyEmail);
router.post('/send-pin', authController.sendVerificationEmail);
router.post('/verify-pin', authController.verifyEmail);

// Password management routes
router.put('/change-email', loginRequired, authController.changeEmail);
router.put('/change-password', loginRequired, authController.changePassword);
router.post('/reset-password-send', authController.resetPasswordMailSend);
router.post('/find-password', authController.resetPasswordMailSend);

// Admin routes
router.post('/set-admin', loginRequired, authController.setAdmin);

export default router; 