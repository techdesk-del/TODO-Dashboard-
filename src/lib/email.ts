/**
 * lib/email.ts — Free SMTP Email Transport & Digest Generator
 *
 * Supports free Gmail SMTP (port 465/587 with App Password) or
 * zero-config Ethereal test account when SMTP credentials are not yet set.
 */

import nodemailer, { type Transporter } from 'nodemailer';
import type { Task } from '@/types';

interface SendDigestOptions {
  toEmail: string;
  toName: string;
  overdueTasks: Task[];
  todayTasks: Task[];
  upcomingTasks: Task[];
  dateString: string;
}

export async function createEmailTransporter(): Promise<{ transporter: Transporter; isTestAccount: boolean }> {
  const rawHost = process.env.SMTP_HOST;
  const host = (rawHost && !rawHost.includes('@')) ? rawHost : 'smtp.gmail.com';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  // If real SMTP credentials are provided (e.g. Gmail App Password)
  if (user && pass && user !== 'your_email@gmail.com') {
    const transporter = nodemailer.createTransport({
      host: host,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
      auth: { user, pass },
      connectionTimeout: 8000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
    });
    return { transporter, isTestAccount: false };
  }

  // Otherwise, create an auto-generated free Ethereal test mailbox
  const testAccount = await nodemailer.createTestAccount();
  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
    connectionTimeout: 8000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
  });
  return { transporter, isTestAccount: true };
}

export function generateDigestHtml(opts: SendDigestOptions): string {
  const { toName, overdueTasks, todayTasks, upcomingTasks, dateString } = opts;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 24px; color: #ffffff; }
    .brand { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
    .subhead { font-size: 13px; opacity: 0.9; margin-top: 4px; }
    .content { padding: 24px; }
    .greeting { font-size: 15px; margin-bottom: 20px; line-height: 1.5; }
    .section-title { font-size: 12px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; margin-top: 24px; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
    .title-red { color: #dc2626; }
    .title-amber { color: #d97706; }
    .title-blue { color: #2563eb; }
    .task-card { background: #f8fafc; border-left: 4px solid #cbd5e1; border-radius: 4px 8px 8px 4px; padding: 12px; margin-bottom: 8px; font-size: 13px; }
    .card-red { border-left-color: #ef4444; background: #fef2f2; }
    .card-amber { border-left-color: #f59e0b; background: #fffbeb; }
    .card-blue { border-left-color: #3b82f6; background: #eff6ff; }
    .task-name { font-weight: 700; color: #0f172a; margin-bottom: 4px; }
    .task-meta { font-size: 11px; color: #64748b; }
    .empty-badge { font-size: 12px; color: #16a34a; font-style: italic; background: #f0fdf4; padding: 8px 12px; border-radius: 6px; }
    .footer { background: #f1f5f9; padding: 16px 24px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">UrbanGaon AI Todo Platform</div>
      <div class="subhead">Daily Executive Operational Digest • ${dateString}</div>
    </div>
    <div class="content">
      <div class="greeting">
        Good morning <strong>${toName}</strong>,<br>
        Here is your targeted commitment ledger for today. Synchronized with zero spam.
      </div>

      <!-- Overdue Tasks -->
      <div class="section-title title-red">⚠️ Overdue Deliverables (Requires Immediate Resolution)</div>
      ${
        overdueTasks.length === 0
          ? '<div class="empty-badge">✓ Zero overdue deliverables. Excellent punctuality!</div>'
          : overdueTasks.map(t => `
            <div class="task-card card-red">
              <div class="task-name">${t.title}</div>
              <div class="task-meta">Scheduled: ${t.scheduledDate} at ${t.time} • Priority: ${t.priority}</div>
            </div>
          `).join('')
      }

      <!-- Today Tasks -->
      <div class="section-title title-amber">⏰ Deliverables Due Today</div>
      ${
        todayTasks.length === 0
          ? '<div class="empty-badge">No deliverables scheduled for today.</div>'
          : todayTasks.map(t => `
            <div class="task-card card-amber">
              <div class="task-name">${t.title}</div>
              <div class="task-meta">Execution Target: ${t.time} • Priority: ${t.priority} • Department: ${t.department}</div>
            </div>
          `).join('')
      }

      <!-- Upcoming Tasks -->
      <div class="section-title title-blue">📅 Upcoming Deliverables This Week</div>
      ${
        upcomingTasks.length === 0
          ? '<div class="empty-badge">No upcoming deliverables this week.</div>'
          : upcomingTasks.map(t => `
            <div class="task-card card-blue">
              <div class="task-name">${t.title}</div>
              <div class="task-meta">Due: ${t.scheduledDate} at ${t.time} • Priority: ${t.priority}</div>
            </div>
          `).join('')
      }
    </div>
    <div class="footer">
      Automated by UrbanGaon Dispatcher Engine • Flowchart 13 Compliance • Confidential Corporate Communication
    </div>
  </div>
</body>
</html>
  `;
}

export async function sendMorningDigestEmail(opts: SendDigestOptions) {
  let { transporter, isTestAccount } = await createEmailTransporter();
  const html = generateDigestHtml(opts);
  const from = process.env.SMTP_FROM || '"UrbanGaon Dispatcher" <alerts@urbangaon.com>';

  let info;
  try {
    info = await transporter.sendMail({
      from,
      to: opts.toEmail,
      subject: `📋 Daily Operational Focus: ${opts.dateString} — ${opts.toName}`,
      html,
    });
  } catch (sendErr) {
    console.warn('[Live SMTP failed, falling back to Ethereal Mailbox]:', sendErr);
    const testAccount = await nodemailer.createTestAccount();
    const fallbackTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
      connectionTimeout: 8000,
    });
    isTestAccount = true;
    info = await fallbackTransporter.sendMail({
      from,
      to: opts.toEmail,
      subject: `📋 Daily Operational Focus: ${opts.dateString} — ${opts.toName}`,
      html,
    });
  }

  const previewUrl = isTestAccount ? nodemailer.getTestMessageUrl(info) : null;

  return {
    success: true,
    messageId: info.messageId,
    isTestAccount,
    previewUrl,
  };
}

export interface SendPasswordResetOptions {
  toEmail: string;
  toName: string;
  resetCode: string;
  expiresMinutes?: number;
}

export function generatePasswordResetHtml(opts: SendPasswordResetOptions): string {
  const { toName, resetCode, expiresMinutes = 15 } = opts;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #1e293b; margin: 0; padding: 24px 12px; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.15); }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #2563eb 100%); padding: 32px 24px; color: #ffffff; text-align: center; }
    .brand { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .subhead { font-size: 13px; color: #93c5fd; margin-top: 6px; font-weight: 500; }
    .content { padding: 32px 28px; }
    .greeting { font-size: 16px; margin-bottom: 16px; line-height: 1.6; color: #1e293b; }
    .intro-text { font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px; }
    .code-box { background: #f8fafc; border: 2px dashed #3b82f6; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; }
    .code-label { font-size: 11px; font-weight: 800; color: #2563eb; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 8px; }
    .code-value { font-size: 34px; font-weight: 800; color: #0f172a; letter-spacing: 8px; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; }
    .validity-tag { font-size: 12px; color: #64748b; margin-top: 10px; font-weight: 600; }
    .instructions { background: #eff6ff; border-left: 4px solid #2563eb; border-radius: 6px; padding: 14px 16px; margin: 20px 0; font-size: 13px; color: #1e40af; line-height: 1.5; }
    .warning { font-size: 12px; color: #64748b; border-top: 1px solid #f1f5f9; padding-top: 18px; margin-top: 24px; line-height: 1.5; }
    .footer { background: #f8fafc; padding: 18px 24px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">UrbanGaon Task Register</div>
      <div class="subhead">Enterprise Identity & Access Management</div>
    </div>
    <div class="content">
      <div class="greeting">
        Hello <strong>${toName}</strong>,
      </div>
      <div class="intro-text">
        A self-service request was initiated to configure or update your personal password for your corporate UrbanGaon account.
      </div>

      <div class="code-box">
        <div class="code-label">Verification One-Time Code</div>
        <div class="code-value">${resetCode}</div>
        <div class="validity-tag">⏱ Valid for the next ${expiresMinutes} minutes</div>
      </div>

      <div class="instructions">
        <strong>Next Steps:</strong> Return to the UrbanGaon sign-in portal, enter this 6-digit code, and submit your desired personal password. Once set, your new password will be immediately active.
      </div>

      <div class="warning">
        🔒 <strong>Security Notice:</strong> If you did not request this verification code, please ignore this email or alert the IT Operations Desk at <a href="mailto:techdesk@urbangaon.com" style="color: #2563eb;">techdesk@urbangaon.com</a>. Never share this code with anyone.
      </div>
    </div>
    <div class="footer">
      UrbanGaon Corporate Platform • Automated Enterprise Dispatcher • Zero Spam Policy
    </div>
  </div>
</body>
</html>
  `;
}

export async function sendPasswordResetEmail(opts: SendPasswordResetOptions) {
  let { transporter, isTestAccount } = await createEmailTransporter();
  const html = generatePasswordResetHtml(opts);
  const from = process.env.SMTP_FROM || '"UrbanGaon Dispatcher" <techdesk@urbangaon.com>';

  let info;
  try {
    info = await transporter.sendMail({
      from,
      to: opts.toEmail,
      subject: `🔐 UrbanGaon Account Verification Code: ${opts.resetCode}`,
      html,
    });
  } catch (sendErr) {
    console.warn('[Live SMTP failed, falling back to Ethereal Mailbox]:', sendErr);
    const testAccount = await nodemailer.createTestAccount();
    const fallbackTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
      connectionTimeout: 8000,
    });
    isTestAccount = true;
    info = await fallbackTransporter.sendMail({
      from,
      to: opts.toEmail,
      subject: `🔐 UrbanGaon Account Verification Code: ${opts.resetCode}`,
      html,
    });
  }

  const previewUrl = isTestAccount ? nodemailer.getTestMessageUrl(info) : null;

  return {
    success: true,
    messageId: info.messageId,
    isTestAccount,
    previewUrl,
  };
}
