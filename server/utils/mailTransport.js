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

export const getMailTransporter = () => {
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

export const getMailSender = () => process.env.MAIL_FROM || process.env.SMTP_USER;
