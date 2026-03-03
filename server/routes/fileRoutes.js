import express from 'express';
import { getFiles, uploadFile, deleteFile, upload } from '../controllers/fileController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getFiles)
  .post(protect, upload.single('file'), uploadFile);

router.post('/upload', protect, upload.single('file'), uploadFile);
router.get('/:workspaceId', protect, getFiles);

router.delete('/:fileId', protect, deleteFile);

export default router;