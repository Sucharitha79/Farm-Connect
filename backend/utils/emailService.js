import nodemailer from 'nodemailer';
import { config } from '../config/env.js';
import { AppError } from './errors.js';

export const sendOtpEmail = async (email, otp, purpose) => {
  if (!config.smtpHost || !config.smtpFrom) {
    throw new AppError(503, 'Email delivery is not configured. Set SMTP settings in the environment.');
  }
  if (Boolean(config.smtpUser) !== Boolean(config.smtpPassword)) {
    throw new AppError(503, 'Both SMTP_USER and SMTP_PASSWORD must be configured together.');
  }

  const transport = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    ...(config.smtpUser
      ? { auth: { user: config.smtpUser, pass: config.smtpPassword } }
      : {})
  });
  const label = purpose === 'registration' ? 'email verification' : 'login verification';
  await transport.sendMail({
    from: config.smtpFrom,
    to: email,
    subject: `FarmLink ${label} code`,
    text: `Your FarmLink ${label} code is ${otp}. It expires in 5 minutes. Do not share this code with anyone.`
  });
};
