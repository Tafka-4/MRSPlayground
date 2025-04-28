import { Router } from "express";
import { loginRequired, adminRequired } from "../utils/middleware/login.js";
import { sendVerificationEmail, verifyEmail, changeEmail, changePassword, resetPassword, setAdmin } from "../controller/authController.js";
import asyncWrapper from "../utils/middleware/asyncWrapper.js";

const router = Router();

router.post("/send-verification-email", asyncWrapper(sendVerificationEmail));
router.post("/verify-email", asyncWrapper(verifyEmail));
router.post("/change-email", loginRequired, asyncWrapper(changeEmail));
router.post("/change-password", loginRequired, asyncWrapper(changePassword));
router.post("/reset-password", asyncWrapper(resetPassword));
router.post("/set-admin", adminRequired, asyncWrapper(setAdmin));

export default router;

