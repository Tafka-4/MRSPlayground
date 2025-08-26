import { Router } from 'express';
import { createNotice, getNotice, updateNotice, listNoticesByNovel } from '../controller/noticeController.js';
import { loginRequired } from '../utils/middleware/login.js';
import asyncWrapper from '../utils/middleware/asyncWrapper.js';

const router = Router();

router.post('/', loginRequired, asyncWrapper(createNotice));
router.get('/:noticeId', asyncWrapper(getNotice));
router.put('/:noticeId', loginRequired, asyncWrapper(updateNotice));
router.get('/novel/:novelId', asyncWrapper(listNoticesByNovel));

export default router;


