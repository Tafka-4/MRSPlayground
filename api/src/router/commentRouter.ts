import { Router } from "express";
import { 
    createComment, 
    getComments, 
    getComment, 
    updateComment, 
    deleteComment, 
    likeComment, 
    dislikeComment, 
    getChildComments 
} from "../controller/commentController.js";
import { loginRequired } from "../utils/middleware/login.js";
import asyncWrapper from "../utils/middleware/asyncWrapper.js";

const router = Router();

router.post("/", loginRequired, asyncWrapper(createComment));
router.get("/", asyncWrapper(getComments));
router.get("/:commentId", asyncWrapper(getComment));
router.put("/:commentId", loginRequired, asyncWrapper(updateComment));
router.delete("/:commentId", loginRequired, asyncWrapper(deleteComment));
router.post("/:commentId/like", loginRequired, asyncWrapper(likeComment));
router.post("/:commentId/dislike", loginRequired, asyncWrapper(dislikeComment));
router.get("/:commentId/replies", asyncWrapper(getChildComments));

export default router; 