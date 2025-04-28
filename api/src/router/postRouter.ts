import { Router } from "express";
import { createPost, getPosts, getPost, updatePost, deletePost, likePost, dislikePost } from "../controller/postController.js";
import { loginRequired } from "../utils/middleware/login.js";
import asyncWrapper from "../utils/middleware/asyncWrapper.js";

const router = Router();

router.post("/", loginRequired, asyncWrapper(createPost));
router.get("/:galleryId", loginRequired, asyncWrapper(getPosts));
router.get("/:galleryId/:postId", loginRequired, asyncWrapper(getPost));
router.put("/:galleryId/:postId/:tempPassword?", loginRequired, asyncWrapper(updatePost));
router.delete("/:galleryId/:postId/:tempPassword?", loginRequired, asyncWrapper(deletePost));

router.post("/:galleryId/:postId/like", loginRequired, asyncWrapper(likePost));
router.post("/:galleryId/:postId/dislike", loginRequired, asyncWrapper(dislikePost));

export default router; 