import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  name: String,
  url: String,
  publicId: String,
  size: Number,
  mimeType: String,
  folder: { type: String, default: '/' },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const File = mongoose.model('File', fileSchema);
export default File;