import { Router } from "express";
import { registerUser, loginUser, logoutUser, refreshToken, getUser, getUserList, updateUser, uploadUserProfileImage, deleteUserProfileImage, deleteUser } from "../controller/userController.js";
import { loginRequired } from "../utils/middleware/login.js";
import asyncWrapper from "../utils/middleware/asyncWrapper.js";

const router = Router();

router.post("/register", asyncWrapper(registerUser));
router.post("/login", asyncWrapper(loginUser));
router.post("/logout", loginRequired, asyncWrapper(logoutUser));
router.post("/refresh", asyncWrapper(refreshToken));

router.get("/:userid", asyncWrapper(getUser));
router.get("/get-user-list", asyncWrapper(getUserList));
router.put("/", loginRequired, asyncWrapper(updateUser));
router.put("/profile-image", loginRequired, asyncWrapper(uploadUserProfileImage));
router.delete("/profile-image", loginRequired, asyncWrapper(deleteUserProfileImage));
router.delete("/", loginRequired, asyncWrapper(deleteUser));

export default router;
