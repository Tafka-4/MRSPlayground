import { Router } from 'express';
import { loginRequired } from '../middleware/login.js';
import { adminRequired } from '../middleware/admin.js';
import asyncWrapper from '../middleware/asyncWrapper.js';
import { userRequestWatchStart } from '../middleware/userRequestWatch.js';
import * as contactController from '../controllers/contactController.js';

const router = Router();

router.post(
    '/submit',
    userRequestWatchStart,
    asyncWrapper(contactController.submitContact)
);

router.get(
    '/my',
    loginRequired,
    userRequestWatchStart,
    asyncWrapper(contactController.getMyContacts)
);

router.get(
    '/my/:id',
    loginRequired,
    userRequestWatchStart,
    asyncWrapper(contactController.getContactDetails)
);

router.get(
    '/admin/all',
    loginRequired,
    adminRequired,
    userRequestWatchStart,
    asyncWrapper(contactController.getAllContacts)
);

router.put(
    '/admin/:id/status',
    loginRequired,
    adminRequired,
    userRequestWatchStart,
    asyncWrapper(contactController.updateContactStatus)
);

router.post(
    '/admin/:contactId/reply',
    loginRequired,
    adminRequired,
    userRequestWatchStart,
    asyncWrapper(contactController.sendReplyEmail)
);

export default router; 