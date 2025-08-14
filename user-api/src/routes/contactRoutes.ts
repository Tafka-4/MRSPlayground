import { Router } from 'express';
import { loginRequired } from '../middleware/login.js';
import { adminRequired } from '../middleware/admin.js';
import asyncWrapper from '../middleware/asyncWrapper.js';
import * as contactController from '../controllers/contactController.js';

const router = Router();

router.post('/', asyncWrapper(contactController.createContact));

router.get('/', loginRequired, adminRequired, asyncWrapper(contactController.getAllContacts));
router.get('/:id', loginRequired, adminRequired, asyncWrapper(contactController.getContactById));
router.put('/:id/status', loginRequired, adminRequired, asyncWrapper(contactController.updateContactStatus));
router.delete('/:id', loginRequired, adminRequired, asyncWrapper(contactController.deleteContact));

export default router; 