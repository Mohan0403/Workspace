import { getMailSender, getMailTransporter } from './mailTransport.js';

export const sendTaskOverdueEmail = async ({ to, assigneeName, workspaceName, workspaceId, taskTitle, dueDate }) => {
  const transporter = getMailTransporter();

  if (!transporter) {
    return { emailSent: false, reason: 'SMTP_NOT_CONFIGURED' };
  }

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const workspaceLink = `${clientUrl}/workspace/${workspaceId}?module=kanban`;
  const sender = getMailSender();
  const dueDateText = new Date(dueDate).toLocaleDateString();

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2 style="margin-bottom: 8px;">Task Overdue Reminder</h2>
      <p>Hi ${assigneeName || 'there'},</p>
      <p>The task <strong>${taskTitle}</strong> in <strong>${workspaceName}</strong> is overdue.</p>
      <p>Due date: <strong>${dueDateText}</strong></p>
      <p>
        Open task board:
        <a href="${workspaceLink}" style="color: #0f766e;">${workspaceLink}</a>
      </p>
      <p>Please complete the task as soon as possible.</p>
      <p style="margin-top: 16px; color: #6b7280; font-size: 12px;">NexusBoard</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: sender,
      to,
      subject: `Overdue task: ${taskTitle}`,
      html,
    });
    return { emailSent: true };
  } catch {
    return { emailSent: false, reason: 'SMTP_SEND_FAILED' };
  }
};
