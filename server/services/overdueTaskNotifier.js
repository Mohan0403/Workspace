import Task from '../models/Task.js';
import Activity from '../models/Activity.js';
import { sendTaskOverdueEmail } from '../utils/sendTaskOverdueEmail.js';

let intervalHandle = null;
let running = false;

const toObjectIdString = (value) => `${value || ''}`;

const processOverdueTasks = async () => {
  if (running) return;
  running = true;

  try {
    const now = new Date();

    const overdueTasks = await Task.find({
      dueDate: { $lt: now },
      column: { $ne: 'done' },
      assignees: { $exists: true, $ne: [] },
    })
      .populate('workspace', 'name')
      .populate('assignees', 'name email')
      .populate('createdBy', 'name');

    for (const task of overdueTasks) {
      const alreadyNotified = new Set((task.overdueReminderSentTo || []).map(toObjectIdString));
      const recipients = (task.assignees || []).filter((assignee) => {
        if (!assignee?.email) return false;
        return !alreadyNotified.has(toObjectIdString(assignee._id));
      });

      if (!recipients.length) continue;

      const notifiedIds = [];

      for (const recipient of recipients) {
        const result = await sendTaskOverdueEmail({
          to: recipient.email,
          assigneeName: recipient.name,
          workspaceName: task.workspace?.name || 'Workspace',
          workspaceId: task.workspace?._id || task.workspace,
          taskTitle: task.title,
          dueDate: task.dueDate,
        });

        if (result.emailSent) {
          notifiedIds.push(recipient._id);
        }
      }

      if (!notifiedIds.length) continue;

      task.overdueReminderSentAt = new Date();
      task.overdueReminderSentTo = [...(task.overdueReminderSentTo || []), ...notifiedIds];
      await task.save();

      await Activity.create({
        workspace: task.workspace?._id || task.workspace,
        user: task.createdBy?._id || null,
        action: 'sent overdue reminder',
        target: task.title,
        module: 'kanban',
        metadata: {
          assigneeCount: notifiedIds.length,
          dueDate: task.dueDate,
        },
      });
    }
  } catch (error) {
    console.error('Overdue notifier error:', error.message);
  } finally {
    running = false;
  }
};

export const startOverdueTaskNotifier = () => {
  if (intervalHandle) return;

  const minutes = Number(process.env.OVERDUE_TASK_EMAIL_INTERVAL_MINUTES || 10);
  const intervalMs = Number.isFinite(minutes) && minutes > 0 ? minutes * 60 * 1000 : 10 * 60 * 1000;

  intervalHandle = setInterval(processOverdueTasks, intervalMs);

  // Run soon after boot so long-lived tasks are picked up quickly.
  setTimeout(processOverdueTasks, 5000);
};
