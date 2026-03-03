import nodemailer from 'nodemailer';

const parseBoolean = (value) => `${value}`.toLowerCase() === 'true';
let transporterCache = null;

const isPlaceholderValue = (value = '') => {
  const normalized = `${value}`.trim().toLowerCase();
  return (
    !normalized ||
    normalized.includes('your_') ||
    normalized.includes('example') ||
    normalized === 'changeme'
  );
};

const getTransporter = () => {
  if (transporterCache) {
    return transporterCache;
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  if (isPlaceholderValue(SMTP_USER) || isPlaceholderValue(SMTP_PASS)) {
    return null;
  }

  transporterCache = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: parseBoolean(SMTP_SECURE),
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 12000,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  return transporterCache;
};

export const sendInviteEmail = async ({ to, inviteeName, inviterName, workspaceName, workspaceId, role }) => {
  const transporter = getTransporter();

  if (!transporter) {
    return { emailSent: false, reason: 'SMTP_NOT_CONFIGURED' };
  }

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const workspaceLink = `${clientUrl}/workspace/${workspaceId}`;
  const sender = process.env.MAIL_FROM || process.env.SMTP_USER;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2 style="margin-bottom: 8px;">Workspace Invitation</h2>
      <p>Hi ${inviteeName || 'there'},</p>
      <p><strong>${inviterName}</strong> invited you to join <strong>${workspaceName}</strong> as <strong>${role}</strong>.</p>
      <p>
        Open workspace: 
        <a href="${workspaceLink}" style="color: #4f46e5;">${workspaceLink}</a>
      </p>
      <p>If you already have an account with this email, sign in and access the workspace.</p>
      <p style="margin-top: 16px; color: #6b7280; font-size: 12px;">NexusBoard Team</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: sender,
      to,
      subject: `You're invited to ${workspaceName} on NexusBoard`,
      html,
    });

    return { emailSent: true };
  } catch (error) {
    const isAuthError = /invalid login|auth|credentials/i.test(error?.message || '');

    if (!isAuthError) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 400));
        await transporter.sendMail({
          from: sender,
          to,
          subject: `You're invited to ${workspaceName} on NexusBoard`,
          html,
        });
        return { emailSent: true };
      } catch (retryError) {
        const retryIsAuth = /invalid login|auth|credentials/i.test(retryError?.message || '');
        return { emailSent: false, reason: retryIsAuth ? 'SMTP_AUTH_FAILED' : 'SMTP_SEND_FAILED' };
      }
    }

    const reason = /invalid login|auth|credentials/i.test(error?.message || '')
      ? 'SMTP_AUTH_FAILED'
      : 'SMTP_SEND_FAILED';
    return { emailSent: false, reason };
  }
};
