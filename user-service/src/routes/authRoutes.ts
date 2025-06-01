import { Router } from 'express';
import { loginRequired } from '../middleware/login.js';
import { adminRequired } from '../middleware/admin.js';
import asyncWrapper from '../middleware/asyncWrapper.js';
import { userRequestWatchStart } from '../middleware/userRequestWatch.js';
import * as authController from '../controllers/authController.js';

const router = Router();

// Authentication routes
router.post(
    '/register',
    userRequestWatchStart,
    asyncWrapper(authController.registerUser)
);
router.post(
    '/login',
    userRequestWatchStart,
    asyncWrapper(authController.loginUser)
);
router.post(
    '/logout',
    loginRequired,
    userRequestWatchStart,
    asyncWrapper(authController.logoutUser)
);
router.post(
    '/refresh',
    userRequestWatchStart,
    asyncWrapper(authController.refreshToken)
);
router.post(
    '/check-token',
    userRequestWatchStart,
    asyncWrapper(authController.checkToken)
);
router.get(
    '/me',
    loginRequired,
    userRequestWatchStart,
    asyncWrapper(authController.getCurrentUser)
);

// Email verification routes
router.post(
    '/send-verification',
    userRequestWatchStart,
    asyncWrapper(authController.sendVerificationEmail)
);
router.post(
    '/verify-email',
    userRequestWatchStart,
    asyncWrapper(authController.verifyEmail)
);
router.post(
    '/send-pin',
    userRequestWatchStart,
    asyncWrapper(authController.sendVerificationEmail)
);
router.post(
    '/verify-pin',
    userRequestWatchStart,
    asyncWrapper(authController.verifyEmail)
);
// Password management routes
router.put(
    '/change-email',
    loginRequired,
    userRequestWatchStart,
    asyncWrapper(authController.changeEmail)
);
router.put(
    '/change-password',
    loginRequired,
    userRequestWatchStart,
    asyncWrapper(authController.changePassword)
);
router.post(
    '/reset-password-send',
    userRequestWatchStart,
    asyncWrapper(authController.resetPasswordMailSend)
);
router.post(
    '/find-password',
    userRequestWatchStart,
    asyncWrapper(authController.resetPasswordMailSend)
);

// Admin routes
router.post(
    '/admin/set-admin/:target',
    adminRequired,
    userRequestWatchStart,
    asyncWrapper(authController.setAdmin)
);

router.delete(
    '/admin/unset-admin/:target',
    adminRequired,
    userRequestWatchStart,
    asyncWrapper(authController.unSetAdmin)
);

router.post(
    '/admin/verify-user/:target',
    adminRequired,
    userRequestWatchStart,
    asyncWrapper(authController.verifyUser)
);

router.delete(
    '/admin/unverify-user/:target',
    adminRequired,
    userRequestWatchStart,
    asyncWrapper(authController.unVerifyUser)
);

router.get(
    '/admin/user-list',
    adminRequired,
    userRequestWatchStart,
    asyncWrapper(authController.adminUserList)
);

router.delete(
    '/admin/user-delete/:target',
    adminRequired,
    userRequestWatchStart,
    asyncWrapper(authController.adminUserDelete)
);

// Security and Token Management routes
router.get(
    '/security/tokens',
    loginRequired,
    userRequestWatchStart,
    asyncWrapper(authController.getActiveTokens)
);

router.post(
    '/security/revoke-other-sessions',
    loginRequired,
    userRequestWatchStart,
    asyncWrapper(authController.revokeAllOtherTokens)
);

router.post(
    '/admin/revoke-user-tokens',
    adminRequired,
    userRequestWatchStart,
    asyncWrapper(authController.adminRevokeUserTokens)
);

router.post(
    '/admin/system-cleanup',
    adminRequired,
    userRequestWatchStart,
    asyncWrapper(authController.systemCleanup)
);

export default router;
