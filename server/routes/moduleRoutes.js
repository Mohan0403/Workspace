import express from 'express';
import {
  getModules,
  addModule,
  updateModule,
  reorderModules,
  removeModule
} from '../controllers/moduleController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router({ mergeParams: true });

router.route('/')
  .get(protect, getModules)
  .post(protect, addModule);

router.put('/reorder', protect, reorderModules);

router.route('/:moduleId')
  .put(protect, updateModule)
  .delete(protect, removeModule);

export default router;