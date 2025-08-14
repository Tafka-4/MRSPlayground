import express from 'express';
import { createEmojiPackage, getEmojiPackage, getEmojiPackageList, updateEmojiPackage, deleteEmojis, deleteEmojiPackage, getFavoriteEmojiPackages, markFavorite, unmarkFavorite, listFavoriteEmojiPackages } from '../controller/emojiController.js';
import { loginRequired } from '../utils/middleware/login.js';
import asyncWrapper from '../utils/middleware/asyncWrapper.js';

const router = express.Router();

router.post('/', loginRequired, asyncWrapper(createEmojiPackage));
router.get('/:packageId', loginRequired, asyncWrapper(getEmojiPackage));
router.get('/', loginRequired, asyncWrapper(getEmojiPackageList));
router.patch('/:packageId', loginRequired, asyncWrapper(updateEmojiPackage));
router.delete('/emojis', loginRequired, asyncWrapper(deleteEmojis));
router.delete('/:packageId', loginRequired, asyncWrapper(deleteEmojiPackage));

// favorites
router.get('/favorites/self', loginRequired, asyncWrapper(listFavoriteEmojiPackages));
router.get('/favorites', loginRequired, asyncWrapper(getFavoriteEmojiPackages));
router.post('/favorites', loginRequired, asyncWrapper(markFavorite));
router.delete('/favorites/:packageId', loginRequired, asyncWrapper(unmarkFavorite));

export default router;


