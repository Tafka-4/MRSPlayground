import { Router } from "express";
import { createGallery, getGallery, getGalleryList, updateGallery, deleteGallery, subscribeGallery, unsubscribeGallery, galleryAdminChange, galleryManagerAdd, galleryManagerDelete, galleryThumbnailUpload, galleryThumbnailDelete } from "../controller/galleryController.js";
import { loginRequired } from "../utils/middleware/login.js";
import asyncWrapper from "../utils/middleware/asyncWrapper.js";

const router = Router();

router.post("/", loginRequired, asyncWrapper(createGallery));
router.get("/:galleryId", loginRequired, asyncWrapper(getGallery));
router.get("/", loginRequired, asyncWrapper(getGalleryList));
router.put("/:galleryId", loginRequired, asyncWrapper(updateGallery));
router.delete("/:galleryId", loginRequired, asyncWrapper(deleteGallery));

router.post("/:galleryId/subscribe", loginRequired, asyncWrapper(subscribeGallery));
router.delete("/:galleryId/subscribe", loginRequired, asyncWrapper(unsubscribeGallery));

router.put("/:galleryId/admin", loginRequired, asyncWrapper(galleryAdminChange));
router.post("/:galleryId/manager", loginRequired, asyncWrapper(galleryManagerAdd));
router.delete("/:galleryId/manager", loginRequired, asyncWrapper(galleryManagerDelete));

router.post("/:galleryId/thumbnail", loginRequired, asyncWrapper(galleryThumbnailUpload));
router.delete("/:galleryId/thumbnail", loginRequired, asyncWrapper(galleryThumbnailDelete));

export default router; 