import express from 'express';
import { getTasks, createTask, updateTask, deleteTask } from '../controllers/taskController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getTasks)
  .post(protect, createTask);

router.get('/:workspaceId', protect, getTasks);

router.route('/:taskId')
  .put(protect, updateTask)
  .delete(protect, deleteTask);

export default router;