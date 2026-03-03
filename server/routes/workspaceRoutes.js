import express from 'express';
import {
  createWorkspace,
  getUserWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  inviteMember,
  updateMemberRole,
  removeMember
} from '../controllers/workspaceController.js';
import { protect } from '../middlewares/authMiddleware.js';
import moduleRoutes from './moduleRoutes.js';

const router = express.Router();

router.route('/')
  .post(protect, createWorkspace)
  .get(protect, getUserWorkspaces);

router.route('/:workspaceId')
  .get(protect, getWorkspaceById)
  .put(protect, updateWorkspace)
  .delete(protect, deleteWorkspace);

router.use('/:workspaceId/modules', moduleRoutes);

router.post('/:workspaceId/invite', protect, inviteMember);
router.route('/:workspaceId/members/:userId')
  .put(protect, updateMemberRole)
  .delete(protect, removeMember);

export default router;