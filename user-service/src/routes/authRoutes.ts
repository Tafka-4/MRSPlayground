import { Router } from 'express';
import { loginRequired } from '../middleware/login.js';
import { adminRequired } from '../middleware/admin.js';
import asyncWrapper from '../middleware/asyncWrapper.js';
import * as authController from '../controllers/authController.js';

const router = Router();

// Authentication routes
router.post('/register', asyncWrapper(authController.registerUser));
router.post('/login', asyncWrapper(authController.loginUser));
router.post('/logout', loginRequired, asyncWrapper(authController.logoutUser));
router.post('/refresh', authController.refreshToken);
router.post('/check-token', asyncWrapper(authController.checkToken));
router.get('/me', loginRequired, asyncWrapper(authController.getCurrentUser));

// Email verification routes
router.post(
    '/send-verification',
    asyncWrapper(authController.sendVerificationEmail)
);
router.post('/verify-email', asyncWrapper(authController.verifyEmail));
router.post('/send-pin', asyncWrapper(authController.sendVerificationEmail));
router.post('/verify-pin', asyncWrapper(authController.verifyEmail));

// Password management routes
router.put(
    '/change-email',
    loginRequired,
    asyncWrapper(authController.changeEmail)
);
router.put(
    '/change-password',
    loginRequired,
    asyncWrapper(authController.changePassword)
);
router.post(
    '/reset-password-send',
    asyncWrapper(authController.resetPasswordMailSend)
);
router.post(
    '/find-password',
    asyncWrapper(authController.resetPasswordMailSend)
);

// Admin routes
router.post('/set-admin', adminRequired, asyncWrapper(authController.setAdmin));

export default router;
