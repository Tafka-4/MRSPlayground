import { Router } from 'express';
import { createNovel, getNovel, updateNovel, deleteNovel, likeNovel, dislikeNovel, favoriteNovel, uploadThumbnailImage, deleteThumbnailImage, getNovelList, getNovelListByAuthor } from '../controller/novelController.js';
import { loginRequired } from '../utils/middleware/login.js';
import upload from '../utils/middleware/upload.js';
import asyncWrapper from '../utils/middleware/asyncWrapper.js';

const router = Router();

router.post('/', loginRequired, asyncWrapper(createNovel));
router.get('/:novelId', asyncWrapper(getNovel));
router.put('/:novelId', loginRequired, asyncWrapper(updateNovel));
router.delete('/:novelId', loginRequired, asyncWrapper(deleteNovel));

router.post('/:novelId/like', loginRequired, asyncWrapper(likeNovel));
router.post('/:novelId/dislike', loginRequired, asyncWrapper(dislikeNovel));
router.post('/:novelId/favorite', loginRequired, asyncWrapper(favoriteNovel));

router.put('/:novelId/thumbnail-image', loginRequired, upload.single('file'), asyncWrapper(uploadThumbnailImage));
router.delete('/:novelId/thumbnail-image', loginRequired, asyncWrapper(deleteThumbnailImage));

router.get('/', asyncWrapper(getNovelList));
router.get('/author/:author', asyncWrapper(getNovelListByAuthor));

export default router;


