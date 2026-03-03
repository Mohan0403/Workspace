import Task from '../models/Task.js';
import Activity from '../models/Activity.js';

const hasWorkspaceMembership = (user, workspaceId) => {
  return user.workspaces.some((membership) => membership.workspace.toString() === workspaceId.toString());
};

const hasWriteRole = (user, workspaceId) => {
  return user.workspaces.some(
    (membership) => membership.workspace.toString() === workspaceId.toString() && ['owner', 'admin', 'member'].includes(membership.role)
  );
};

// @desc    Get tasks for a workspace
// @route   GET /api/tasks?workspace=:workspaceId
export const getTasks = async (req, res) => {
  try {
    const workspace = req.params.workspaceId || req.query.workspace;

    if (!workspace) {
      return res.status(400).json({ message: 'workspace query is required' });
    }

    if (!hasWorkspaceMembership(req.user, workspace)) {
      return res.status(403).json({ message: 'Not authorized for this workspace' });
    }

    const tasks = await Task.find({ workspace })
      .populate('assignees', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .sort({ column: 1, position: 1, createdAt: 1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new task
// @route   POST /api/tasks
export const createTask = async (req, res) => {
  try {
    const { workspace, title, description, column, priority, dueDate, assignees, labels, position } = req.body;

    if (!workspace) {
      return res.status(400).json({ message: 'workspace is required' });
    }

    if (!hasWriteRole(req.user, workspace)) {
      return res.status(403).json({ message: 'Not authorized to create tasks in this workspace' });
    }

    const taskColumn = column || 'todo';
    const columnTaskCount = await Task.countDocuments({ workspace, column: taskColumn });

    const task = await Task.create({
      workspace,
      title,
      description,
      column: taskColumn,
      priority: priority || 'medium',
      dueDate,
      position: typeof position === 'number' ? position : columnTaskCount,
      assignees,
      labels,
      createdBy: req.user._id
    });

    await Activity.create({
      workspace,
      user: req.user._id,
      action: 'created task',
      target: title,
      module: 'kanban'
    });

    const populatedTask = await Task.findById(task._id)
      .populate('assignees', 'name email avatar')
      .populate('createdBy', 'name email avatar');

    // Emit via socket
    req.app.get('io').to(`workspace_${workspace}`).emit('task-changed', populatedTask);

    res.status(201).json(populatedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a task
// @route   PUT /api/tasks/:taskId
export const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (!hasWriteRole(req.user, task.workspace)) {
      return res.status(403).json({ message: 'Not authorized to update tasks in this workspace' });
    }

    const previousColumn = task.column;
    const previousPosition = task.position;
    const { title, description, column, priority, dueDate, assignees, labels, position } = req.body;
    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (column) task.column = column;
    if (priority) task.priority = priority;
    if (dueDate) task.dueDate = dueDate;
    if (typeof position === 'number') task.position = position;
    if (assignees) task.assignees = assignees;
    if (labels) task.labels = labels;

    await task.save();

    await Activity.create({
      workspace: task.workspace,
      user: req.user._id,
      action: previousColumn !== task.column ? 'moved task' : 'updated task',
      target: task.title,
      module: 'kanban',
      metadata: {
        previousColumn,
        nextColumn: task.column,
        previousPosition,
        nextPosition: task.position
      }
    });

    const populatedTask = await Task.findById(task._id)
      .populate('assignees', 'name email avatar')
      .populate('createdBy', 'name email avatar');

    req.app.get('io').to(`workspace_${task.workspace}`).emit('task-changed', populatedTask);

    res.json(populatedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (!hasWriteRole(req.user, task.workspace)) {
      return res.status(403).json({ message: 'Not authorized to delete tasks in this workspace' });
    }

    await task.deleteOne();

    await Activity.create({
      workspace: task.workspace,
      user: req.user._id,
      action: 'deleted task',
      target: task.title,
      module: 'kanban'
    });

    req.app.get('io').to(`workspace_${task.workspace}`).emit('task-changed', { _id: task._id, deleted: true });

    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};