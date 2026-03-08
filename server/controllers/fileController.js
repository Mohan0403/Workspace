import File from '../models/File.js';
import Activity from '../models/Activity.js';
import cloudinary, { ensureCloudinaryConfigured } from '../config/cloudinary.js';
import multer from 'multer';
import { uploadToCloudinary } from '../utils/cloudinaryUpload.js';

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


export const uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    if (!ensureCloudinaryConfigured()) {
      return res.status(503).json({
        message: 'File upload is not configured on the server. Set CLOUDINARY_CLOUD_NAME (or CLOUDINARY_NAME), CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in server/.env and restart the server.'
      });
    }

    const { workspace, folder = '/' } = req.body;

    if (!workspace) {
      return res.status(400).json({ message: 'workspace is required' });
    }

    if (!hasWriteRole(req.user, workspace)) {
      return res.status(403).json({ message: 'Not authorized to upload files in this workspace' });
    }

    const result = await uploadToCloudinary(req.file.buffer, `workspace_${workspace}`, req.file.mimetype);

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
    if (/must supply api_key|must supply api_secret|must supply cloud_name/i.test(error.message || '')) {
      return res.status(503).json({
        message: 'Cloudinary credentials are missing or invalid. Check CLOUDINARY_* values in server/.env and restart the server.'
      });
    }

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