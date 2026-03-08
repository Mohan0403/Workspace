import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  title: { type: String, required: true },
  description: String,
  column: { 
    type: String, 
    enum: ['backlog', 'todo', 'inProgress', 'done'],
    default: 'todo'
  },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  dueDate: Date,
  position: { type: Number, default: 0 },
  assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  overdueReminderSentAt: Date,
  overdueReminderSentTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  labels: [String],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

taskSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

const Task = mongoose.model('Task', taskSchema);
export default Task;