import mongoose from 'mongoose';

const workspaceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['owner', 'admin', 'member', 'viewer'] }
  }],
  modules: [{
    moduleType: { 
      type: String, 
      enum: ['kanban', 'notes', 'files', 'chat', 'timeline'],
      required: true 
    },
    config: { type: mongoose.Schema.Types.Mixed, default: {} },
    position: { type: Number, default: 0 }
  }],
  settings: {
    allowInvites: { type: Boolean, default: true },
    defaultRole: { type: String, default: 'member' }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

workspaceSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

const Workspace = mongoose.model('Workspace', workspaceSchema);
export default Workspace;