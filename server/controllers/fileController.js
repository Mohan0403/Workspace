import File from '../models/File.js';
import Activity from '../models/Activity.js';
import cloudinary from '../config/cloudinary.js';
import multer from 'multer';
import { uploadToCloudinary } from '../utils/cloudinaryUpload.js';

// Multer config (memory storage)
const storage = multer.memoryStorage();
const upload = multer({ storage });

const hasWorkspaceMembership = (user, workspaceId) => {
  return user.workspaces.some((membership) => membership.workspace.toString() === workspaceId.toString());
};

const hasWriteRole = (user, workspaceId) => {
  return user.workspaces.some(
    (membership) => membership.workspace.toString() === workspaceId.toString() && ['owner', 'admin', 'member'].includes(membership.role)
  );
};

// @desc    Upload a file
// @route   POST /api/files/upload
export const uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const { workspace, folder = '/' } = req.body;

    if (!workspace) {
      return res.status(400).json({ message: 'workspace is required' });
    }

    if (!hasWriteRole(req.user, workspace)) {
      return res.status(403).json({ message: 'Not authorized to upload files in this workspace' });
    }

    const result = await uploadToCloudinary(req.file.buffer, `workspace_${workspace}`);

    const file = await File.create({
      workspace,
      name: req.file.originalname,
      url: result.secure_url,
      publicId: result.public_id,
      size: req.file.size,
      mimeType: req.file.mimetype,
      folder,
      uploadedBy: req.user._id
    });

    await Activity.create({
      workspace,
      user: req.user._id,
      action: 'uploaded file',
      target: file.name,
      module: 'files'
    });

    res.status(201).json(file);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get files for a workspace
// @route   GET /api/files?workspace=:workspaceId&folder=:folder
export const getFiles = async (req, res) => {
  try {
    const workspace = req.params.workspaceId || req.query.workspace;
    const { folder } = req.query;

    if (!workspace) {
      return res.status(400).json({ message: 'workspace query is required' });
    }

    if (!hasWorkspaceMembership(req.user, workspace)) {
      return res.status(403).json({ message: 'Not authorized for this workspace' });
    }

    const filter = { workspace };
    if (folder) filter.folder = folder;
    const files = await File.find(filter)
      .populate('uploadedBy', 'name email avatar')
      .sort('-createdAt');
    res.json(files);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteFile = async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);
    if (!file) return res.status(404).json({ message: 'File not found' });

    if (!hasWriteRole(req.user, file.workspace)) {
      return res.status(403).json({ message: 'Not authorized to delete files in this workspace' });
    }

    await cloudinary.uploader.destroy(file.publicId);

    await file.deleteOne();

    await Activity.create({
      workspace: file.workspace,
      user: req.user._id,
      action: 'deleted file',
      target: file.name,
      module: 'files'
    });

    res.json({ message: 'File deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export { upload };