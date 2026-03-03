import express from 'express';
import { getMessages, sendMessage, markMessagesAsRead } from '../controllers/messageController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getMessages)
  .post(protect, sendMessage);

router.get('/:workspaceId', protect, getMessages);

router.post('/read', protect, markMessagesAsRead);

export default router;