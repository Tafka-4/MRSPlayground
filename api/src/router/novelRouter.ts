import { Router } from "express";
import { createNovel, getNovel, updateNovel, deleteNovel, likeNovel, dislikeNovel, favoriteNovel, uploadThumbnailImage, deleteThumbnailImage, getNovelList, getNovelListByAuthor } from "../controller/novelController.js";
import { loginRequired } from "../utils/middleware/login.js";
import asyncWrapper from "../utils/middleware/asyncWrapper.js";

const router = Router();

router.post("/", loginRequired, asyncWrapper(createNovel));
router.get("/:novelid", asyncWrapper(getNovel));
router.put("/:novelid", loginRequired, asyncWrapper(updateNovel));
router.delete("/:novelid", loginRequired, asyncWrapper(deleteNovel));

router.post("/:novelid/like", loginRequired, asyncWrapper(likeNovel));
router.post("/:novelid/dislike", loginRequired, asyncWrapper(dislikeNovel));
router.post("/:novelid/favorite", loginRequired, asyncWrapper(favoriteNovel));

router.put("/:novelid/thumbnail-image", loginRequired, asyncWrapper(uploadThumbnailImage));
router.delete("/:novelid/thumbnail-image", loginRequired, asyncWrapper(deleteThumbnailImage));

router.get("/", asyncWrapper(getNovelList));
router.get("/author/:author", asyncWrapper(getNovelListByAuthor));

export default router;
