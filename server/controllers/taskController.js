import Task from '../models/Task.js';
import Activity from '../models/Activity.js';
import Workspace from '../models/Workspace.js';

const hasWorkspaceMembership = (user, workspaceId) => {
  return user.workspaces.some((membership) => membership.workspace.toString() === workspaceId.toString());
};

const hasWriteRole = (user, workspaceId) => {
  return user.workspaces.some(
    (membership) => membership.workspace.toString() === workspaceId.toString() && ['owner', 'admin', 'member'].includes(membership.role)
  );
};

const getMembershipRole = (user, workspaceId) => {
  const membership = user.workspaces.find((item) => item.workspace.toString() === workspaceId.toString());
  return membership?.role || null;
};

const canAssignTasks = (role) => ['owner', 'admin'].includes(role);

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

    if (!title?.trim()) {
      return res.status(400).json({ message: 'Task title is required' });
    }

    const role = getMembershipRole(req.user, workspace);
    const assigneeIds = Array.isArray(assignees) ? assignees : [];
    const parsedDueDate = dueDate ? new Date(dueDate) : null;

    if ((assigneeIds.length > 0 || parsedDueDate) && !canAssignTasks(role)) {
      return res.status(403).json({ message: 'Only owner/admin can assign task members or due dates' });
    }

    if (parsedDueDate && Number.isNaN(parsedDueDate.getTime())) {
      return res.status(400).json({ message: 'Invalid due date' });
    }

    if (assigneeIds.length > 0) {
      const assigneeSet = new Set(assigneeIds.map((id) => `${id}`));
      // Validate against all workspace members (owner/admin/member/viewer).
      const workspaceDoc = await Workspace.findById(workspace).select('members');
      if (!workspaceDoc) {
        return res.status(404).json({ message: 'Workspace not found' });
      }

      const workspaceMemberSet = new Set(workspaceDoc.members.map((member) => member.user.toString()));

      const invalidAssignees = [...assigneeSet].filter((id) => !workspaceMemberSet.has(id));
      if (invalidAssignees.length > 0) {
        return res.status(400).json({ message: 'One or more assignees are not in this workspace' });
      }
    }

    const taskColumn = column || 'todo';
    const columnTaskCount = await Task.countDocuments({ workspace, column: taskColumn });

    const task = await Task.create({
      workspace,
      title: title.trim(),
      description,
      column: taskColumn,
      priority: priority || 'medium',
      dueDate: parsedDueDate,
      position: typeof position === 'number' ? position : columnTaskCount,
      assignees: assigneeIds,
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
    const previousDueDate = task.dueDate;
    const previousAssignees = (task.assignees || []).map((item) => item.toString());
    const { title, description, column, priority, dueDate, assignees, labels, position } = req.body;
    const role = getMembershipRole(req.user, task.workspace);

    if (title) task.title = title.trim();
    if (description !== undefined) task.description = description;
    if (column) task.column = column;
    if (priority) task.priority = priority;
    if (dueDate !== undefined) {
      if (dueDate === null || dueDate === '') {
        task.dueDate = null;
      } else {
        const parsedDueDate = new Date(dueDate);
        if (Number.isNaN(parsedDueDate.getTime())) {
          return res.status(400).json({ message: 'Invalid due date' });
        }
        task.dueDate = parsedDueDate;
      }
    }
    if (typeof position === 'number') task.position = position;
    if (assignees !== undefined) {
      if (!Array.isArray(assignees)) {
        return res.status(400).json({ message: 'assignees must be an array' });
      }
      task.assignees = assignees;
    }
    if (labels) task.labels = labels;

    const assigneeIds = (task.assignees || []).map((item) => item.toString());
    const dueDateChanged = (previousDueDate?.toISOString?.() || '') !== (task.dueDate?.toISOString?.() || '');
    const assigneesChanged = JSON.stringify([...previousAssignees].sort()) !== JSON.stringify([...assigneeIds].sort());
    const assignmentChangeRequested = dueDateChanged || assigneesChanged;

    if (assignmentChangeRequested && !canAssignTasks(role)) {
      return res.status(403).json({ message: 'Only owner/admin can assign task members or due dates' });
    }

    if (assigneeIds.length > 0) {
      const workspaceDoc = await Workspace.findById(task.workspace).select('members');
      if (!workspaceDoc) {
        return res.status(404).json({ message: 'Workspace not found' });
      }

      const workspaceMemberSet = new Set(workspaceDoc.members.map((member) => member.user.toString()));
      const invalidAssignees = assigneeIds.filter((id) => !workspaceMemberSet.has(id));
      if (invalidAssignees.length > 0) {
        return res.status(400).json({ message: 'One or more assignees are not in this workspace' });
      }
    }

    if (task.column === 'done') {
      task.overdueReminderSentAt = null;
      task.overdueReminderSentTo = [];
    }

    if (dueDateChanged || assigneesChanged) {
      task.overdueReminderSentAt = null;
      task.overdueReminderSentTo = [];
    }

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