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

router.delete(
    '/me',
    loginRequired,
    userRequestWatchStart,
    asyncWrapper(authController.deleteCurrentUser)
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
router.post(
    '/check-email-verification',
    userRequestWatchStart,
    asyncWrapper(authController.checkEmailVerificationStatus)
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

router.post(
    '/verify',
    loginRequired,
    userRequestWatchStart,
    asyncWrapper(authController.verifyUserWithKey)
);

router.get(
    '/current-key',
    loginRequired,
    adminRequired,
    userRequestWatchStart,
    asyncWrapper(authController.getCurrentKey)
);

// Admin routes
router.post(
    '/admin/set-admin/:target',
    loginRequired,
    adminRequired,
    userRequestWatchStart,
    asyncWrapper(authController.setAdmin)
);

router.delete(
    '/admin/unset-admin/:target',
    loginRequired,
    adminRequired,
    userRequestWatchStart,
    asyncWrapper(authController.unSetAdmin)
);

router.post(
    '/admin/verify-user/:target',
    loginRequired,
    adminRequired,
    userRequestWatchStart,
    asyncWrapper(authController.verifyUser)
);

router.delete(
    '/admin/unverify-user/:target',
    loginRequired,
    adminRequired,
    userRequestWatchStart,
    asyncWrapper(authController.unVerifyUser)
);

router.get(
    '/admin/user-list',
    loginRequired,
    adminRequired,
    userRequestWatchStart,
    asyncWrapper(authController.adminUserList)
);

router.delete(
    '/admin/user-delete/:target',
    loginRequired,
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
    loginRequired,
    adminRequired,
    userRequestWatchStart,
    asyncWrapper(authController.adminRevokeUserTokens)
);

router.post(
    '/admin/system-cleanup',
    loginRequired,
    adminRequired,
    userRequestWatchStart,
    asyncWrapper(authController.systemCleanup)
);

export default router;
