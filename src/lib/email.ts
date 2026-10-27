/**
 * lib/email.ts - Free SMTP Email Transport & Digest Generator
 *
 * Supports free Gmail SMTP (port 465/587 with App Password) or
 * zero-config Ethereal test account when SMTP credentials are not yet set.
 */

import fs from 'fs';
import path from 'path';
import nodemailer, { type Transporter } from 'nodemailer';
import type { Task } from '@/types';

/**
 * Official UrbanGaon Corporate Production Workspace URL
 */
export const PRODUCTION_WORKSPACE_URL = 'https://todo-dashboard-rhvx.vercel.app';

/**
 * Returns safe production-first URL for emails, never leaking localhost or dev IPs
 */
export function getAppBaseUrl(overrideUrl?: string): string {
  if (overrideUrl && overrideUrl.trim() && !overrideUrl.includes('localhost') && !overrideUrl.includes('127.0.0.1')) {
    return overrideUrl.trim().replace(/\/$/, '');
  }
  if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost') && !process.env.NEXT_PUBLIC_APP_URL.includes('127.0.0.1')) {
    return process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/$/, '');
  }
  return PRODUCTION_WORKSPACE_URL;
}

/**
 * Prepares inline CID logo attachment for email clients (Gmail, Outlook, Apple Mail)
 */
export function getEmailLogoAttachments() {
  const logoPath = path.join(process.cwd(), 'public', 'urbangaon-logo.png');
  if (fs.existsSync(logoPath)) {
    return [
      {
        filename: 'urbangaon-logo.png',
        path: logoPath,
        cid: 'urbangaon-logo',
      },
    ];
  }
  return [];
}

/**
 * Universal, email-safe brand header featuring the official UrbanGaon logo and "Open Workspace" action
 */
export function getEmailHeaderHtml(subtitle = 'Enterprise Task Workspace', actionUrl = PRODUCTION_WORKSPACE_URL): string {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #ffffff; border-bottom: 3px solid #2563eb; padding: 20px 24px;">
    <tr>
      <td align="left" vertical-align="middle" style="padding: 0;">
        <a href="${PRODUCTION_WORKSPACE_URL}" target="_blank" style="text-decoration: none; display: inline-block;">
          <img src="cid:urbangaon-logo" alt="UrbanGaon - a perfect balance" style="height: 48px; width: auto; max-width: 240px; display: block; border: 0;" />
        </a>
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; color: #64748b; margin-top: 5px; font-weight: 600; letter-spacing: 0.02em;">
          ${subtitle}
        </div>
      </td>
      <td align="right" vertical-align="middle" style="padding: 0;">
        <a href="${actionUrl}" target="_blank" style="display: inline-block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 800; color: #1e40af; background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 8px; padding: 9px 16px; text-decoration: none; box-shadow: 0 1px 3px rgba(37,99,235,0.12);">
          Open Workspace &rarr;
        </a>
      </td>
    </tr>
  </table>
  `;
}

export interface SendDigestOptions {
  toEmail: string;
  toName: string;
  overdueTasks: Task[];
  todayTasks: Task[];
  upcomingTasks: Task[];
  dateString: string;
  baseUrl?: string;
}

export async function createEmailTransporter(): Promise<{ transporter: Transporter; isTestAccount: boolean }> {
  const rawHost = process.env.SMTP_HOST;
  const host = (rawHost && !rawHost.includes('@')) ? rawHost : 'smtp.gmail.com';
  const user = process.env.SMTP_USER || 'techdesk@urbangaon.com';
  const pass = process.env.SMTP_PASS || 'xrtfpqnnvmyayvyq';

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
  const { toName, overdueTasks, todayTasks, upcomingTasks, dateString, baseUrl } = opts;
  const appBase = getAppBaseUrl(baseUrl);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
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
    .task-meta { font-size: 11px; color: #64748b; margin-bottom: 4px; }
    .task-link { font-size: 11px; font-weight: 700; color: #2563eb; text-decoration: none; }
    .empty-badge { font-size: 12px; color: #16a34a; font-style: italic; background: #f0fdf4; padding: 8px 12px; border-radius: 6px; }
    .reason-missing-box { margin-top: 8px; padding: 8px 10px; background: #fee2e2; border: 1px solid #fca5a5; border-radius: 6px; font-size: 12px; color: #991b1b; }
    .footer { background: #f1f5f9; padding: 16px 24px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    ${getEmailHeaderHtml(`Daily Executive Operational Digest | ${dateString}`, appBase)}
    <div class="content">
      <div class="greeting">
        Good morning <strong>${toName}</strong>,<br>
        Here is your targeted commitment ledger for today. Synchronized with zero spam.
      </div>

      <!-- Flowchart D: Overdue Deliverables with direct links & reason requests -->
      <div class="section-title title-red">Overdue Deliverables (Requires Immediate Resolution)</div>
      ${
        overdueTasks.length === 0
          ? '<div class="empty-badge">Zero overdue deliverables. Excellent punctuality!</div>'
          : overdueTasks.map(t => {
            const hasReason = Boolean(t.delayReason || t.pastDueReason || t.holdReason || t.escalationReason);
            const activeReason = t.delayReason || t.pastDueReason || t.holdReason || t.escalationReason;
            return `
            <div class="task-card card-red">
              <div class="task-name">${t.title}</div>
              <div class="task-meta">Scheduled: ${t.scheduledDate} at ${t.time} | Priority: ${t.priority} | Department: ${t.department}</div>
              <div style="margin-top: 4px;">
                <a href="${appBase}/?taskId=${t.id}" class="task-link">View Deliverable #${t.id}</a>
              </div>
              ${!hasReason ? `
                <div class="reason-missing-box">
                  <strong>Delay Reason Required:</strong> As per corporate governance, please <a href="${appBase}/?taskId=${t.id}" style="color: #b91c1c; font-weight: 700; text-decoration: underline;">click here to enter delay justification</a>.
                </div>
              ` : `
                <div style="font-size: 11px; color: #b45309; margin-top: 4px;">
                  Documented Reason: ${activeReason}
                </div>
              `}
            </div>
            `;
          }).join('')
      }

      <!-- Today Tasks with direct link -->
      <div class="section-title title-amber">Deliverables Due Today</div>
      ${
        todayTasks.length === 0
          ? '<div class="empty-badge">No deliverables scheduled for today.</div>'
          : todayTasks.map(t => `
            <div class="task-card card-amber">
              <div class="task-name">${t.title}</div>
              <div class="task-meta">Execution Target: ${t.time} | Priority: ${t.priority} | Department: ${t.department}</div>
              <div style="margin-top: 4px;">
                <a href="${appBase}/?taskId=${t.id}" class="task-link">Open Deliverable #${t.id}</a>
              </div>
            </div>
          `).join('')
      }

      <!-- Upcoming Tasks with direct link -->
      <div class="section-title title-blue">Upcoming Deliverables This Week</div>
      ${
        upcomingTasks.length === 0
          ? '<div class="empty-badge">No upcoming deliverables this week.</div>'
          : upcomingTasks.map(t => `
            <div class="task-card card-blue">
              <div class="task-name">${t.title}</div>
              <div class="task-meta">Due: ${t.scheduledDate} at ${t.time} | Priority: ${t.priority}</div>
              <div style="margin-top: 4px;">
                <a href="${appBase}/?taskId=${t.id}" class="task-link">Open Deliverable #${t.id}</a>
              </div>
            </div>
          `).join('')
      }
    </div>
    <div class="footer">
      Automated by UrbanGaon Dispatcher Engine | Corporate Delivery Compliance | Direct Task Links Activated
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
  const logoAttachments = getEmailLogoAttachments();

  let info;
  try {
    info = await transporter.sendMail({
      from,
      to: opts.toEmail,
      subject: `Daily Operational Focus: ${opts.dateString} - ${opts.toName}`,
      html,
      attachments: logoAttachments,
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
      subject: `Daily Operational Focus: ${opts.dateString} - ${opts.toName}`,
      html,
      attachments: logoAttachments,
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

export interface ChronicDelayItem {
  task: Task;
  employeeName: string;
  employeeEmail: string;
  managerName?: string;
  managerEmail?: string;
  daysOverdue: number;
}

export interface SendAdminDigestSummaryOptions {
  adminEmail: string;
  dateString: string;
  totalPendingStaff: number;
  successfulSends: number;
  failedDeliveries: Array<{ email: string; name: string; error: string }>;
  chronicDelays: ChronicDelayItem[];
}

/**
 * Flowchart D: "Send summary to Admin (failures and chronic delays)"
 * and "Copy reporting manager on chronic delays"
 */
export async function sendAdminDigestSummaryEmail(opts: SendAdminDigestSummaryOptions) {
  const { adminEmail, dateString, totalPendingStaff, successfulSends, failedDeliveries, chronicDelays } = opts;
  let { transporter, isTestAccount } = await createEmailTransporter();
  const from = process.env.SMTP_FROM || '"UrbanGaon Dispatcher" <alerts@urbangaon.com>';

  // Collect unique manager emails to CC for chronic delays
  const managerEmails = Array.from(new Set(
    chronicDelays
      .map(c => c.managerEmail)
      .filter((email): email is string => Boolean(email && email.includes('@') && email !== adminEmail))
  ));

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
    .container { max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 24px; color: #ffffff; }
    .content { padding: 24px; }
    .metric-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 20px 0; }
    .metric-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }
    .card-red { background: #fef2f2; border-color: #fecaca; }
    .card-amber { background: #fffbeb; border-color: #fde68a; }
    .card-green { background: #f0fdf4; border-color: #bbf7d0; }
    .section-title { font-size: 13px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; margin-top: 24px; margin-bottom: 10px; }
    .table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
    .table th, .table td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: left; }
    .table th { background: #f1f5f9; font-weight: 700; color: #475569; }
    .footer { background: #f1f5f9; padding: 16px 24px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="font-size: 20px; font-weight: 800;">UrbanGaon Executive Digest Engine</div>
      <div style="font-size: 13px; opacity: 0.9; margin-top: 4px;">Admin Operational Summary | ${dateString}</div>
    </div>
    <div class="content">
      <p style="font-size: 14px; margin-top: 0;">
        Executive summary of the morning digest delivery cycle. Automated operational supervision.
      </p>

      <div class="metric-grid">
        <div class="metric-card card-green">
          <div style="font-size: 11px; color: #166534; font-weight: 700;">SUCCESSFUL SENDS</div>
          <div style="font-size: 22px; font-weight: 800; color: #15803d;">${successfulSends} / ${totalPendingStaff}</div>
        </div>
        <div class="metric-card ${failedDeliveries.length > 0 ? 'card-red' : ''}">
          <div style="font-size: 11px; color: #991b1b; font-weight: 700;">DELIVERY FAILURES</div>
          <div style="font-size: 22px; font-weight: 800; color: #dc2626;">${failedDeliveries.length}</div>
        </div>
        <div class="metric-card ${chronicDelays.length > 0 ? 'card-amber' : ''}">
          <div style="font-size: 11px; color: #92400e; font-weight: 700;">CHRONIC DELAYS (&gt;3d)</div>
          <div style="font-size: 22px; font-weight: 800; color: #d97706;">${chronicDelays.length}</div>
        </div>
      </div>

      <!-- Chronic Delays Table (Reporting Managers CC'd) -->
      <div class="section-title" style="color: #b45309;">Chronic Delays (&gt;3 Days Overdue - Managers Copied)</div>
      ${chronicDelays.length === 0 ? '<p style="font-size: 12px; color: #16a34a;">Zero chronic delays across all teams.</p>' : `
        <table class="table">
          <thead>
            <tr>
              <th>Deliverable</th>
              <th>Assignee</th>
              <th>Days Overdue</th>
              <th>Reporting Manager</th>
            </tr>
          </thead>
          <tbody>
            ${chronicDelays.map(c => `
              <tr>
                <td><strong>${c.task.title}</strong><br><span style="color: #64748b; font-size: 11px;">#${c.task.id} (${c.task.department})</span></td>
                <td>${c.employeeName}</td>
                <td style="color: #dc2626; font-weight: 700;">${c.daysOverdue} days</td>
                <td>${c.managerName || 'Leadership'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}

      <!-- Delivery Failures Table -->
      ${failedDeliveries.length > 0 ? `
        <div class="section-title" style="color: #dc2626; margin-top: 24px;">Dispatch Failures (Retries Exhausted)</div>
        <table class="table">
          <thead>
            <tr>
              <th>Recipient</th>
              <th>Email</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            ${failedDeliveries.map(f => `
              <tr>
                <td><strong>${f.name}</strong></td>
                <td>${f.email}</td>
                <td style="color: #b91c1c;">${f.error}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}
    </div>
    <div class="footer">
      UrbanGaon Dispatcher Engine | Corporate Governance by Mr. Sukh Sagar Singh
    </div>
  </div>
</body>
</html>
  `;

  let info;
  try {
    info = await transporter.sendMail({
      from,
      to: adminEmail,
      cc: managerEmails.length > 0 ? managerEmails : undefined,
      subject: `Daily Digest Summary to Admin: ${dateString} (${failedDeliveries.length} failures, ${chronicDelays.length} chronic delays)`,
      html,
    });
  } catch (err) {
    console.warn('[Admin summary email send error]:', err);
    return { success: false, error: String(err) };
  }

  return {
    success: true,
    messageId: info.messageId,
    managerCcCount: managerEmails.length,
    isTestAccount,
    previewUrl: isTestAccount ? nodemailer.getTestMessageUrl(info) : null,
  };
}

export interface SendPasswordResetOptions {
  toEmail: string;
  toName: string;
  resetCode: string;
  resetLink?: string;
  expiresMinutes?: number;
}

export function generatePasswordResetHtml(opts: SendPasswordResetOptions): string {
  const { toName, resetCode, resetLink, expiresMinutes = 15 } = opts;

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
    .cta-box { text-align: center; margin: 24px 0 16px; }
    .btn-reset { display: inline-block; background: #2563eb; color: #ffffff !important; padding: 14px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; text-decoration: none; box-shadow: 0 4px 12px rgba(37,99,235,0.25); }
    .code-box { background: #f8fafc; border: 2px dashed #3b82f6; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; }
    .code-label { font-size: 11px; font-weight: 800; color: #2563eb; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 6px; }
    .code-value { font-size: 30px; font-weight: 800; color: #0f172a; letter-spacing: 8px; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; }
    .validity-tag { font-size: 12px; color: #64748b; margin-top: 8px; font-weight: 600; }
    .instructions { background: #eff6ff; border-left: 4px solid #2563eb; border-radius: 6px; padding: 14px 16px; margin: 20px 0; font-size: 13px; color: #1e40af; line-height: 1.5; }
    .warning { font-size: 12px; color: #64748b; border-top: 1px solid #f1f5f9; padding-top: 18px; margin-top: 24px; line-height: 1.5; }
    .footer { background: #f8fafc; padding: 18px 24px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    ${getEmailHeaderHtml('Enterprise Identity & Access Management | Account Verification', resetLink || PRODUCTION_WORKSPACE_URL)}
    <div class="content">
      <div class="greeting">
        Hello <strong>${toName}</strong>,
      </div>
      <div class="intro-text">
        A self-service request was initiated to configure or update your personal password for your corporate UrbanGaon account.
      </div>

      ${resetLink ? `
      <!-- Flowchart 4: Send expiring one-time reset link -->
      <div class="cta-box">
        <a href="${resetLink}" class="btn-reset">
          Click Here to Reset Password
        </a>
        <div style="font-size: 11px; color: #64748b; margin-top: 8px;">
          This one-time link will expire in ${expiresMinutes} minutes.
        </div>
      </div>
      ` : ''}

      <div class="code-box">
        <div class="code-label">Or Use One-Time Verification Code</div>
        <div class="code-value">${resetCode}</div>
        <div class="validity-tag">Valid for the next ${expiresMinutes} minutes</div>
      </div>

      <div class="instructions">
        <strong>Next Steps:</strong> Click the link above or return to the UrbanGaon sign-in portal, enter this 6-digit code, and set your new password meeting policy. Once saved as hash, your account will be activated immediately.
      </div>

      <div class="warning">
        <strong>Security Notice:</strong> If you did not request this verification link, please ignore this email or alert the IT Operations Desk at <a href="mailto:techdesk@urbangaon.com" style="color: #2563eb;">techdesk@urbangaon.com</a>. Never share this link or code with anyone.
      </div>
    </div>
    <div class="footer">
      UrbanGaon Corporate Platform | Automated Enterprise Dispatcher | Account Security Protocol
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
  const logoAttachments = getEmailLogoAttachments();

  let info;
  try {
    info = await transporter.sendMail({
      from,
      to: opts.toEmail,
      subject: `UrbanGaon Account Verification Code: ${opts.resetCode}`,
      html,
      attachments: logoAttachments,
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
      subject: `UrbanGaon Account Verification Code: ${opts.resetCode}`,
      html,
      attachments: logoAttachments,
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

export interface SendWelcomeEmailOptions {
  toEmail: string;
  toName: string;
  department: string;
  designation: string;
  role: string;
  initialPassword?: string;
  loginUrl?: string;
}

export function generateWelcomeEmailHtml(opts: SendWelcomeEmailOptions): string {
  const {
    toName,
    toEmail,
    department,
    designation,
    role,
    initialPassword = '123',
    loginUrl = getAppBaseUrl(opts.loginUrl),
  } = opts;

  const roleLabel =
    role === 'ADMIN'
      ? 'Admin / Talent HR'
      : role === 'MANAGER'
      ? 'Reporting Manager'
      : 'Employee / Staff';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #1e293b; margin: 0; padding: 24px 12px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.15); }
    .content { padding: 32px 28px; }
    .greeting { font-size: 16px; margin-bottom: 16px; line-height: 1.6; color: #1e293b; }
    .intro-text { font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px; }
    .credentials-card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 20px; margin: 20px 0; }
    .card-title { font-size: 12px; font-weight: 800; color: #1e3a8a; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
    .password-badge { background: #e0e7ff; color: #3730a3; padding: 3px 10px; border-radius: 4px; font-family: monospace; font-size: 15px; font-weight: 800; }
    .cta-container { text-align: center; margin: 28px 0 20px 0; }
    .cta-btn { display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff !important; text-decoration: none; font-weight: 800; font-size: 15px; padding: 14px 34px; border-radius: 8px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35); letter-spacing: 0.02em; }
    .instructions { background: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 6px; padding: 14px 16px; margin: 20px 0; font-size: 13px; color: #14532d; line-height: 1.5; }
    .warning { font-size: 12px; color: #64748b; border-top: 1px solid #f1f5f9; padding-top: 18px; margin-top: 24px; line-height: 1.5; }
    .footer { background: #f8fafc; padding: 18px 24px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    ${getEmailHeaderHtml('Enterprise Identity & Access Management | Welcome Credentials', loginUrl)}
    <div class="content">
      <div class="greeting">
        Welcome to UrbanGaon, <strong>${toName}</strong>! </div>
      <div class="intro-text">
        Your official corporate account has been provisioned on the UrbanGaon Executive Task Register platform. Below are your official onboarding credentials:
      </div>

      <div class="credentials-card">
        <div class="card-title">Corporate Profile & Credentials</div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px dashed #e2e8f0;">
            <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600;">Full Legal Name:</td>
            <td style="padding: 8px 0; color: #0f172a; font-size: 13px; font-weight: 700; text-align: right;">${toName}</td>
          </tr>
          <tr style="border-bottom: 1px dashed #e2e8f0;">
            <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600;">Corporate Email:</td>
            <td style="padding: 8px 0; color: #2563eb; font-size: 13px; font-weight: 700; text-align: right;">${toEmail}</td>
          </tr>
          <tr style="border-bottom: 1px dashed #e2e8f0;">
            <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600;">Master Department:</td>
            <td style="padding: 8px 0; color: #0f172a; font-size: 13px; font-weight: 700; text-align: right;">${department}</td>
          </tr>
          <tr style="border-bottom: 1px dashed #e2e8f0;">
            <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600;">Official Designation:</td>
            <td style="padding: 8px 0; color: #0f172a; font-size: 13px; font-weight: 700; text-align: right;">${designation}</td>
          </tr>
          <tr style="border-bottom: 1px dashed #e2e8f0;">
            <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600;">Access Role Tier:</td>
            <td style="padding: 8px 0; color: #0f172a; font-size: 13px; font-weight: 700; text-align: right;">${roleLabel}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600;">Initial Universal Password:</td>
            <td style="padding: 8px 0; text-align: right;">
              <span class="password-badge">${initialPassword}</span>
            </td>
          </tr>
        </table>
      </div>

      <div class="cta-container">
        <a href="${loginUrl}" class="cta-btn" target="_blank">🚀 Open Workspace</a>
        <div style="margin-top: 10px; font-size: 12px; color: #64748b;">
          Link: <a href="${loginUrl}" target="_blank" style="color: #2563eb; text-decoration: underline;">${loginUrl}</a>
        </div>
      </div>

      <div class="instructions">
        <strong>Getting Started:</strong>
        <ol style="margin: 8px 0 0 0; padding-left: 20px;">
          <li>Click the button above to navigate to the UrbanGaon sign-in portal.</li>
          <li>Enter your corporate email (<strong>${toEmail}</strong>) and temporary password <code>${initialPassword}</code>.</li>
          <li>For security, you may change your password anytime via the self-service <strong>Forgot Password</strong> OTP flow.</li>
        </ol>
      </div>

      <div class="warning">
        <strong>Confidentiality Notice:</strong> This email contains sensitive enterprise credentials. Do not forward or share these details. If you did not expect this communication or require technical assistance, contact the UrbanGaon IT Operations Desk at <a href="mailto:techdesk@urbangaon.com" style="color: #2563eb;">techdesk@urbangaon.com</a>.
      </div>
    </div>
    <div class="footer">
      UrbanGaon Corporate Platform | Automated Enterprise Dispatcher
    </div>
  </div>
</body>
</html>
  `;
}

export async function sendWelcomeCredentialsEmail(opts: SendWelcomeEmailOptions) {
  let { transporter, isTestAccount } = await createEmailTransporter();
  const html = generateWelcomeEmailHtml(opts);
  const from = process.env.SMTP_FROM || '"UrbanGaon Executive Dispatcher" <techdesk@urbangaon.com>';
  const logoAttachments = getEmailLogoAttachments();

  let info;
  try {
    info = await transporter.sendMail({
      from,
      to: opts.toEmail,
      subject: `Welcome to UrbanGaon - Official Credentials & Account Provisioned (${opts.toName})`,
      html,
      attachments: logoAttachments,
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
      subject: `Welcome to UrbanGaon - Official Credentials & Account Provisioned (${opts.toName})`,
      html,
      attachments: logoAttachments,
    });
  }

  const previewUrl = isTestAccount ? nodemailer.getTestMessageUrl(info) : null;
  console.log(`[Email] Welcome credentials email dispatched to ${opts.toEmail} (messageId: ${info.messageId}, isTest: ${isTestAccount})`);

  return {
    success: true,
    messageId: info.messageId,
    isTestAccount,
    previewUrl,
  };
}

/**
 * Dispatch Security Lockout Alert Email (Flowchart 5)
 * Triggered automatically when an account experiences 5 consecutive failed login attempts.
 */
export async function sendSecurityLockoutAlertEmail(opts: {
  toEmail: string;
  toName: string;
  lockDurationMinutes?: number;
}) {
  const duration = opts.lockDurationMinutes || 15;
  const from = process.env.SMTP_FROM || '"UrbanGaon Security Center" <techdesk@urbangaon.com>';
  const resetUrl = `${getAppBaseUrl()}/?action=forgot_password`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #fecaca; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(220,38,38,0.1); }
    .header { background: linear-gradient(135deg, #991b1b 0%, #dc2626 100%); padding: 22px 28px; color: #ffffff; }
    .title { font-size: 19px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }
    .subhead { font-size: 13px; opacity: 0.9; margin-top: 4px; }
    .content { padding: 26px; }
    .alert-banner { background: #fef2f2; border: 1px solid #f87171; border-radius: 8px; padding: 14px 18px; color: #991b1b; font-size: 13px; font-weight: 700; margin-bottom: 20px; line-height: 1.5; }
    .details-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 13px; }
    .cta-btn { display: inline-block; background: #dc2626; color: #ffffff !important; padding: 12px 24px; border-radius: 6px; font-size: 13px; font-weight: 700; text-decoration: none; margin-top: 8px; }
    .footer { background: #f1f5f9; padding: 16px 26px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title">Security Alert: Account Temporarily Locked</div>
      <div class="subhead">UrbanGaon Identity & Access Management | Security Policy Compliance</div>
    </div>
    <div class="content">
      <div class="alert-banner">
        5 consecutive failed login attempts were detected for your corporate account (<strong>${opts.toEmail}</strong>). To protect enterprise resources, this account has been locked for <strong>${duration} minutes</strong>.
      </div>
      <p style="font-size: 14px; line-height: 1.6; margin: 0 0 14px 0;">
        Hello <strong>${opts.toName}</strong>,<br>
        If this was you and you forgot your credentials, you may immediately reset your password using the verified self-service button below once the 15-minute lockout period expires.
      </p>
      <div class="details-box">
        <div><strong>Timestamp:</strong> ${new Date().toUTCString()}</div>
        <div><strong>Security Event:</strong> Excessive Failed Login Attempts (Threshold: 5)</div>
        <div><strong>Lockout Duration:</strong> ${duration} Minutes</div>
        <div><strong>Account Status:</strong> Protected & Frozen</div>
      </div>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${resetUrl}" class="cta-btn">Reset Account Password</a>
      </div>
      <p style="font-size: 12px; color: #64748b; line-height: 1.5;">
        If you did NOT attempt this login, your account may be under an unauthorized access attempt. Please alert the UrbanGaon IT Security Desk immediately at <a href="mailto:techdesk@urbangaon.com" style="color: #2563eb;">techdesk@urbangaon.com</a>.
      </p>
    </div>
    <div class="footer">
      Automated Enterprise Security Dispatcher | UrbanGaon Corporate Governance
    </div>
  </div>
</body>
</html>
  `;

  try {
    const { transporter } = await createEmailTransporter();
    await transporter.sendMail({
      from,
      to: opts.toEmail,
      subject: `Security Alert: Account Locked for 15 Minutes - 5 Failed Login Attempts (${opts.toName})`,
      html,
    });
    console.log(`[Security Alert] Lockout alert email sent to ${opts.toEmail}`);
    return { success: true };
  } catch (err) {
    console.warn('[Security Alert] Email dispatch note:', err);
    return { success: false };
  }
}

/**
 * Dispatch 2-Step Verification OTP Email (Flowchart 5)
 * Triggered automatically for Admin and Super Admin roles.
 */
export async function sendTwoFactorOtpEmail(opts: {
  toEmail: string;
  toName: string;
  otpCode: string;
  role: string;
}) {
  const from = process.env.SMTP_FROM || '"UrbanGaon Identity Verification" <techdesk@urbangaon.com>';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #bfdbfe; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(37,99,235,0.1); }
    .header { background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%); padding: 22px 28px; color: #ffffff; }
    .title { font-size: 19px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }
    .subhead { font-size: 13px; opacity: 0.9; margin-top: 4px; }
    .content { padding: 28px; text-align: center; }
    .otp-display { display: inline-block; background: #f0fdf4; border: 2px dashed #16a34a; border-radius: 10px; padding: 14px 28px; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #15803d; font-family: 'Courier New', monospace; margin: 20px 0; }
    .notice { font-size: 13px; color: #64748b; line-height: 1.5; margin-top: 14px; }
    .footer { background: #f1f5f9; padding: 16px 26px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    ${getEmailHeaderHtml('Two-Step Verification Protocol | Secure Authorization', PRODUCTION_WORKSPACE_URL)}
    <div class="content">
      <p style="font-size: 14px; line-height: 1.6; margin: 0 0 16px 0; text-align: left;">
        Hello <strong>${opts.toName}</strong>,<br>
        A sign-in attempt was initiated for your privileged corporate account. Use the official 6-digit one-time verification code below to authorize your session:
      </p>
      <div class="otp-display">${opts.otpCode}</div>
      <p style="font-size: 12px; color: #b45309; background: #fef3c7; border: 1px solid #fcd34d; padding: 8px 12px; border-radius: 6px; font-weight: 600; margin: 16px 0;">
        This verification code expires in 10 minutes. Under corporate security protocol, 1 retry is permitted upon error.
      </p>
      <div style="text-align: center; margin: 20px 0;">
        <a href="${PRODUCTION_WORKSPACE_URL}" target="_blank" style="display: inline-block; background: #2563eb; color: #ffffff !important; padding: 11px 26px; border-radius: 6px; font-weight: 700; font-size: 13px; text-decoration: none;">
          🚀 Open Workspace
        </a>
      </div>
      <div class="notice">
        If you did not initiate this login request, change your corporate password immediately.
      </div>
    </div>
    <div class="footer">
      UrbanGaon Identity & Access Management | Two-Step Verification Protocol
    </div>
  </div>
</body>
</html>
  `;

  try {
    const { transporter } = await createEmailTransporter();
    await transporter.sendMail({
      from,
      to: opts.toEmail,
      subject: `Your UrbanGaon 2-Step Verification Code: ${opts.otpCode} (${opts.role})`,
      html,
      attachments: getEmailLogoAttachments(),
    });
    console.log(`[2FA OTP] Code sent to ${opts.toEmail}`);
    return { success: true };
  } catch (err) {
    console.warn('[2FA OTP] Email dispatch note:', err);
    return { success: false };
  }
}

/**
 * Dispatch One-Time Set-Password Invitation Email (Flowchart 3)
 * Sent to approved employee with unique ID, designated manager, and activation link.
 */
export async function sendSetPasswordEmail(opts: {
  toEmail: string;
  toName: string;
  employeeId: string;
  department: string;
  designation: string;
  manager?: string;
  setPasswordLink: string;
  inviteCode: string;
}) {
  const from = process.env.SMTP_FROM || '"UrbanGaon People & Talent Operations" <talent@urbangaon.com>';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #bfdbfe; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(37,99,235,0.1); }
    .header { background: linear-gradient(135deg, #047857 0%, #059669 100%); padding: 24px 28px; color: #ffffff; }
    .title { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }
    .subhead { font-size: 13px; opacity: 0.9; margin-top: 4px; }
    .content { padding: 28px; }
    .card { background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 10px; padding: 16px; margin: 20px 0; font-size: 13px; }
    .btn { display: inline-block; background: #059669; color: #ffffff !important; font-weight: 800; font-size: 14px; padding: 13px 26px; border-radius: 8px; text-decoration: none; margin: 16px 0; box-shadow: 0 4px 12px rgba(5,150,105,0.25); }
    .footer { background: #f1f5f9; padding: 16px 26px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title">Welcome to UrbanGaon!</div>
      <div class="subhead">Official Employee Account Approved | Account Provisioning</div>
    </div>
    <div class="content">
      <p style="font-size: 15px; margin: 0 0 16px 0; line-height: 1.6;">
        Dear <strong>${opts.toName}</strong>,<br>
        Your registration request has been reviewed and approved by Admin & Talent Operations. Your official corporate record has been provisioned with status <strong>Pending First Login</strong>.
      </p>

      <div class="card">
        <div style="font-weight: 800; color: #065f46; margin-bottom: 8px; font-size: 14px;">Official Corporate Assignment</div>
        <div style="margin-bottom: 4px;"><strong>Assigned Employee ID:</strong> <code>${opts.employeeId}</code></div>
        <div style="margin-bottom: 4px;"><strong>Department:</strong> ${opts.department}</div>
        <div style="margin-bottom: 4px;"><strong>Designation:</strong> ${opts.designation}</div>
        <div><strong>Designated Manager:</strong> ${opts.manager || 'Talent Management Desk'}</div>
        <div style="margin-top: 8px; font-weight: 700; color: #047857;"><strong>Invitation Code:</strong> <code>${opts.inviteCode}</code></div>
      </div>

      <p style="font-size: 13px; color: #475569; line-height: 1.5;">
        Please click the secure button below to set your confidential corporate password and complete your first login:
      </p>

      <div style="text-align: center;">
        <a href="${opts.setPasswordLink}" class="btn">Set Corporate Password & Login</a>
      </div>

      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 14px;">
        Or copy and paste this link in your browser: <br>
        <code style="word-break: break-all; color: #059669;">${opts.setPasswordLink}</code>
      </p>
    </div>
    <div class="footer">
      UrbanGaon Identity & Access Management | Employee Provisioning Protocol
    </div>
  </div>
</body>
</html>
  `;

  try {
    const { transporter } = await createEmailTransporter();
    await transporter.sendMail({
      from,
      to: opts.toEmail,
      subject: `Account Approved: Set Your UrbanGaon Corporate Password (${opts.employeeId})`,
      html,
    });
    console.log(`[Set-Password Email] Dispatched to ${opts.toEmail}`);
    return { success: true };
  } catch (err) {
    console.warn('[Set-Password Email] Dispatch error:', err);
    return { success: false };
  }
}

export const sendAccountApprovedEmail = sendSetPasswordEmail;

/**
 * Dispatch Reporting Manager Notification Email (Flowchart 3)
 * Alerts manager that a new team member has been approved.
 */
export async function sendManagerNewHireNotificationEmail(opts: {
  managerEmail: string;
  managerName?: string;
  employeeName: string;
  employeeId: string;
  department: string;
  designation: string;
}) {
  const from = process.env.SMTP_FROM || '"UrbanGaon People & Talent Operations" <talent@urbangaon.com>';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 20px 24px; color: #ffffff; }
    .title { font-size: 18px; font-weight: 800; margin: 0; }
    .content { padding: 24px; font-size: 13px; line-height: 1.6; }
    .box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px; margin: 16px 0; }
    .footer { background: #f1f5f9; padding: 14px 24px; font-size: 11px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title">New Team Member Assigned</div>
      <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">Talent HR Notification | Employee Onboarding</div>
    </div>
    <div class="content">
      <p style="margin: 0 0 12px 0;">
        Hello <strong>${opts.managerName || 'Reporting Manager'}</strong>,<br>
        Talent Operations has approved and provisioned a new team member under your departmental leadership.
      </p>

      <div class="box">
        <div><strong>Employee:</strong> ${opts.employeeName}</div>
        <div><strong>Employee ID:</strong> <code>${opts.employeeId}</code></div>
        <div><strong>Department:</strong> ${opts.department}</div>
        <div><strong>Designation:</strong> ${opts.designation}</div>
        <div><strong>Status:</strong> Pending First Login (Invitation Dispatched)</div>
      </div>

      <p style="color: #64748b; font-size: 12px;">
        Once the employee completes their first login, they will automatically appear in your Manager Team View.
      </p>
    </div>
    <div class="footer">
      UrbanGaon HR & Talent Management System | Manager Briefing
    </div>
  </div>
</body>
</html>
  `;

  try {
    const { transporter } = await createEmailTransporter();
    await transporter.sendMail({
      from,
      to: opts.managerEmail,
      subject: `Team Notification: ${opts.employeeName} added to your department (${opts.department})`,
      html,
    });
    console.log(`[Manager Alert] Sent to ${opts.managerEmail}`);
    return { success: true };
  } catch (err) {
    console.warn('[Manager Alert] Dispatch error:', err);
    return { success: false };
  }
}

/**
 * Dispatch Access Request Rejection Email (Flowchart 3)
 * Sent to user when Admin rejects the sign-up request with documented rationale.
 */
export async function sendRequestRejectionEmail(opts: {
  toEmail: string;
  toName: string;
  reason: string;
}) {
  const from = process.env.SMTP_FROM || '"UrbanGaon People & Talent Operations" <talent@urbangaon.com>';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #fecdd3; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #991b1b 0%, #dc2626 100%); padding: 20px 24px; color: #ffffff; }
    .title { font-size: 18px; font-weight: 800; margin: 0; }
    .content { padding: 24px; font-size: 13px; line-height: 1.6; }
    .reason-box { background: #fff1f2; border-left: 4px solid #e11d48; border-radius: 6px; padding: 12px 16px; margin: 16px 0; font-size: 13px; color: #881337; }
    .footer { background: #f1f5f9; padding: 14px 24px; font-size: 11px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title">Regarding Your UrbanGaon Access Request</div>
      <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">Talent HR Review Decision | Account Verification</div>
    </div>
    <div class="content">
      <p style="margin: 0 0 12px 0;">
        Dear <strong>${opts.toName}</strong>,<br>
        Thank you for submitting a registration request for the UrbanGaon Enterprise platform. Following administrative review, we regret to inform you that your request could not be approved at this time.
      </p>

      <div style="font-weight: 700; color: #475569; margin-top: 14px;">Reason for Decision:</div>
      <div class="reason-box">
        &ldquo;${opts.reason}&rdquo;
      </div>

      <p style="color: #64748b; font-size: 12px; margin-top: 16px;">
        If you believe this decision was made in error or if your corporate credentials need to be re-verified, please contact Talent HR at <a href="mailto:talent@urbangaon.com" style="color: #2563eb;">talent@urbangaon.com</a>.
      </p>
    </div>
    <div class="footer">
      UrbanGaon Identity & Access Management | Decision Dispatch
    </div>
  </div>
</body>
</html>
  `;

  try {
    const { transporter } = await createEmailTransporter();
    await transporter.sendMail({
      from,
      to: opts.toEmail,
      subject: `UrbanGaon Registration Request Status Update`,
      html,
    });
    console.log(`[Rejection Email] Dispatched to ${opts.toEmail}`);
    return { success: true };
  } catch (err) {
    console.warn('[Rejection Email] Dispatch error:', err);
    return { success: false };
  }
}

/**
 * Dispatch Task Assignment Notification Email (Flowchart 6)
 * "Send instant in-app and email notification to all assignees"
 */
export interface SendTaskAssignmentOptions {
  toEmail?: string;
  toName?: string;
  assignees?: { name: string; email: string }[];
  creatorName: string;
  creatorEmail?: string;
  creatorRole?: string;
  taskId?: string;
  taskTitle: string;
  taskDescription?: string;
  scheduledDate: string;
  time?: string;
  priority: string;
  department: string;
  project?: string;
  location?: string;
  notes?: string;
  pastDueReason?: string;
  loginUrl?: string;
}

export async function sendTaskAssignmentEmail(opts: SendTaskAssignmentOptions) {
  const rawRecipients = opts.assignees && opts.assignees.length > 0
    ? opts.assignees
    : [{ name: opts.toName || 'Team Member', email: opts.toEmail || 'user@urbangaon.com' }];

  const creatorEmail = (opts.creatorEmail || '').toLowerCase().trim();
  const seenEmails = new Set<string>();

  // If there are other assignees besides the creator, suppress sending email to the creator
  const hasOtherAssignees = rawRecipients.some(r => {
    const email = (r.email || '').toLowerCase().trim();
    return email && email.includes('@') && email !== creatorEmail;
  });

  const recipients = rawRecipients.filter(r => {
    const email = (r.email || '').toLowerCase().trim();
    if (!email || !email.includes('@')) return false;
    if (seenEmails.has(email)) return false;
    // Suppress email to creator if other team members are assigned
    if (hasOtherAssignees && creatorEmail && email === creatorEmail) return false;
    seenEmails.add(email);
    return true;
  });

  if (recipients.length === 0) {
    console.log(`[Task Assignment Email] Zero valid recipients to notify for deliverable "${opts.taskTitle}". Skipping email dispatch.`);
    return { success: true, count: 0 };
  }

  const from = process.env.SMTP_FROM || '"UrbanGaon Task Operations" <techdesk@urbangaon.com>';
  const appBase = getAppBaseUrl(opts.loginUrl);
  const taskDirectLink = opts.taskId ? `${appBase}/?taskId=${encodeURIComponent(opts.taskId)}` : appBase;
  const executionTime = opts.time || '09:00 AM';

  const priorityBg = opts.priority === 'URGENT' ? '#fee2e2' : opts.priority === 'HIGH' ? '#ffedd5' : opts.priority === 'LOW' ? '#f1f5f9' : '#eff6ff';
  const priorityColor = opts.priority === 'URGENT' ? '#dc2626' : opts.priority === 'HIGH' ? '#ea580c' : opts.priority === 'LOW' ? '#475569' : '#2563eb';
  const priorityBorder = opts.priority === 'URGENT' ? '#fca5a5' : opts.priority === 'HIGH' ? '#fdba74' : opts.priority === 'LOW' ? '#cbd5e1' : '#bfdbfe';
  const priorityBarColor = opts.priority === 'URGENT' ? '#dc2626' : opts.priority === 'HIGH' ? '#ea580c' : opts.priority === 'LOW' ? '#64748b' : '#2563eb';

  let sentCount = 0;

  try {
    const { transporter } = await createEmailTransporter();
    const logoAttachments = getEmailLogoAttachments();

    for (const recipient of recipients) {
      if (!recipient.email) continue;

      const recipientEmail = (recipient.email || '').toLowerCase().trim();
      const creatorEmail = (opts.creatorEmail || '').toLowerCase().trim();
      const isSelfAssigned = (Boolean(creatorEmail) && recipientEmail === creatorEmail) ||
        (Boolean(opts.creatorName) && Boolean(recipient.name) && opts.creatorName.toLowerCase().trim() === recipient.name.toLowerCase().trim());

      const subject = isSelfAssigned
        ? `[UrbanGaon] Deliverable Added: "${opts.taskTitle}" [${opts.priority}]`
        : `[UrbanGaon] New Deliverable Assigned: "${opts.taskTitle}" [${opts.priority}]`;

      const headerSubtitle = isSelfAssigned
        ? `Operational Deliverable Scheduled | Personal Workspace`
        : `Corporate Deliverable Assignment | Operations Management`;

      const formattedRole = opts.creatorRole
        ? opts.creatorRole.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
        : '';

      const introHtml = isSelfAssigned
        ? `<p style="margin: 0 0 16px 0;">You have successfully scheduled a new operational deliverable in your UrbanGaon workspace.</p>`
        : `<p style="margin: 0 0 16px 0;"><strong>${opts.creatorName}</strong>${formattedRole ? ` (${formattedRole})` : ''} has assigned a new operational deliverable to you in the UrbanGaon workspace.</p>`;

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${opts.taskTitle}</title>
  <style>
    body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #1e293b; -webkit-font-smoothing: antialiased; }
    .email-container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #cbd5e1; overflow: hidden; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08); }
    .email-body { padding: 28px; font-size: 14px; line-height: 1.6; color: #334155; }
    .greeting { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
    .task-card { background: #f8fafc; border: 1px solid #e2e8f0; border-top: 4px solid ${priorityBarColor}; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .task-title { font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 14px; line-height: 1.4; }
    .meta-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .meta-table td { padding: 6px 0; vertical-align: top; }
    .meta-label { color: #64748b; font-weight: 500; width: 38%; }
    .meta-value { color: #0f172a; font-weight: 700; text-align: right; }
    .priority-badge { display: inline-block; padding: 3px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; background: ${priorityBg}; color: ${priorityColor}; border: 1px solid ${priorityBorder}; }
    .status-badge { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
    .callout-box { background: #eff6ff; border-left: 3px solid #2563eb; border-radius: 4px; padding: 10px 14px; margin-top: 14px; font-size: 12px; color: #1e40af; }
    .warning-box { background: #fff7ed; border-left: 3px solid #ea580c; border-radius: 4px; padding: 10px 14px; margin-top: 14px; font-size: 12px; color: #9a3412; }
    .cta-container { text-align: center; margin-top: 24px; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff !important; padding: 14px 34px; border-radius: 8px; font-weight: 800; font-size: 15px; text-decoration: none; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35); letter-spacing: 0.02em; }
    .email-footer { background: #f8fafc; padding: 18px 24px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; text-align: center; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="email-container">
    ${getEmailHeaderHtml(headerSubtitle, taskDirectLink)}
    <div class="email-body">
      <div class="greeting">Dear ${recipient.name},</div>
      ${introHtml}

      <div class="task-card">
        <div class="task-title">${opts.taskTitle}</div>
        ${opts.taskDescription ? `<p style="margin: 0 0 14px 0; font-size: 13px; color: #475569;">${opts.taskDescription}</p>` : ''}

        <table class="meta-table">
          <tr>
            <td class="meta-label">Target Deadline:</td>
            <td class="meta-value">${opts.scheduledDate} at ${executionTime}</td>
          </tr>
          <tr>
            <td class="meta-label">Priority Level:</td>
            <td class="meta-value"><span class="priority-badge">${opts.priority}</span></td>
          </tr>
          <tr>
            <td class="meta-label">Initial Status:</td>
            <td class="meta-value"><span class="status-badge">Not Started</span></td>
          </tr>
          <tr>
            <td class="meta-label">Department:</td>
            <td class="meta-value">${opts.department}</td>
          </tr>
          ${opts.project ? `
          <tr>
            <td class="meta-label">Project:</td>
            <td class="meta-value">${opts.project}</td>
          </tr>` : ''}
          ${opts.location ? `
          <tr>
            <td class="meta-label">Location:</td>
            <td class="meta-value">${opts.location}</td>
          </tr>` : ''}
        </table>

        ${opts.notes ? `
        <div class="callout-box">
          <strong>Instructions / Notes:</strong> ${opts.notes}
        </div>` : ''}

        ${opts.pastDueReason ? `
        <div class="warning-box">
          <strong>Backdated Justification:</strong> ${opts.pastDueReason}
        </div>` : ''}
      </div>

      <div class="cta-container" style="text-align: center; margin: 30px 0 20px 0;">
        <a href="${taskDirectLink}" target="_blank" class="cta-button">
          🚀 Open Workspace
        </a>
        <div style="margin-top: 10px; font-size: 12px; color: #64748b;">
          Direct Access: <a href="${taskDirectLink}" target="_blank" style="color: #2563eb; text-decoration: underline;">https://todo-dashboard-rhvx.vercel.app/</a>
        </div>
      </div>
    </div>
    <div class="email-footer">
      UrbanGaon Technologies Private Limited | Operations Management System<br>
      Automated dispatch sent to ${recipient.email}. Please log in to your workspace to update progress.
    </div>
  </div>
</body>
</html>
      `;

      try {
        await transporter.sendMail({
          from,
          to: recipient.email,
          subject,
          html,
          attachments: logoAttachments,
        });
        sentCount++;
        console.log(`[Task Assignment Email] [OK] Dispatched successfully to ${recipient.email} (${recipient.name}) for deliverable: "${opts.taskTitle}"`);

        // Record successful dispatch in EmailLogModel
        try {
          const { EmailLogModel } = await import('@/models/EmailLog');
          await EmailLogModel.create({
            id: `elog-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            recipientEmail: recipient.email.toLowerCase(),
            recipientName: recipient.name,
            eventType: 'TASK_ASSIGNED',
            subject,
            status: 'DELIVERED',
            attempts: 1,
            taskId: opts.taskId,
            deliveredAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          });
        } catch {}
      } catch (sendErr: any) {
        console.warn(`[Task Assignment Email] [FAIL] Failed sending to ${recipient.email}:`, sendErr.message || sendErr);
        // Record failure in EmailLogModel
        try {
          const { EmailLogModel } = await import('@/models/EmailLog');
          await EmailLogModel.create({
            id: `elog-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            recipientEmail: recipient.email.toLowerCase(),
            recipientName: recipient.name,
            eventType: 'TASK_ASSIGNED',
            subject,
            status: 'FAILED',
            attempts: 1,
            lastError: sendErr.message || String(sendErr),
            taskId: opts.taskId,
            addedToAdminSummary: true,
            createdAt: new Date().toISOString(),
          });
        } catch {}
      }
    }

    return { success: true, count: sentCount };
  } catch (err: any) {
    console.warn('[Task Assignment Email] Dispatcher error:', err.message || err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Flowchart 4: Send final summary email to departing/on-leave employee
 */
export async function sendOffboardingSummaryEmail(opts: {
  employeeName: string;
  employeeEmail: string;
  deactivationType: 'Resignation' | 'Termination' | 'Long leave';
  dateInfo: string;
  reassignedCount: number;
  successorName: string;
  reason?: string;
}): Promise<{ success: boolean }> {
  try {
    const { transporter } = await createEmailTransporter();
    const from = process.env.SMTP_FROM || 'UrbanGaon HR Operations <hr@urbangaon.com>';

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; padding: 24px; color: #1e293b;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 24px; color: #ffffff;">
      <h2 style="margin: 0; font-size: 18px; font-weight: 700;">UrbanGaon Account Handover & Status Notice</h2>
      <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8;">Official Transition Summary</p>
    </div>
    <div style="padding: 24px;">
      <p style="font-size: 14px; margin-top: 0;">Dear <strong>${opts.employeeName}</strong>,</p>
      <p style="font-size: 13px; line-height: 1.6; color: #475569;">
        This email confirms that your account transition for <strong>${opts.deactivationType}</strong> has been processed in accordance with corporate handover protocols.
      </p>
      <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 18px 0; font-size: 13px;">
        <div style="margin-bottom: 8px;"><strong>Status Change:</strong> ${opts.deactivationType === 'Long leave' ? 'On Leave' : 'Deactivated'}</div>
        <div style="margin-bottom: 8px;"><strong>Effective Timeline:</strong> ${opts.dateInfo}</div>
        <div style="margin-bottom: 8px;"><strong>Deliverables Transferred:</strong> ${opts.reassignedCount} in-flight task(s)</div>
        <div style="margin-bottom: 8px;"><strong>Handover Successor:</strong> ${opts.successorName}</div>
        ${opts.reason ? `<div><strong>Documented Reason:</strong> ${opts.reason}</div>` : ''}
      </div>
      <p style="font-size: 12px; color: #64748b; line-height: 1.5;">
        All work history and completed deliverable audit records remain preserved in corporate archives. If you have questions regarding this notice, please contact your Reporting Manager or the HR Operations Desk.
      </p>
    </div>
    <div style="background: #f8fafc; padding: 14px 24px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0;">
      UrbanGaon HR Operations | Confidential Automated Notice
    </div>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from,
      to: opts.employeeEmail,
      subject: `Account Status Notice: ${opts.deactivationType} Handover Summary`,
      html,
    });
    console.log(`[Offboarding Summary Email] Dispatched to ${opts.employeeEmail}`);
    return { success: true };
  } catch (err) {
    console.warn('[Offboarding Summary Email] Dispatch warning:', err);
    return { success: false };
  }
}

/**
 * Flowchart 4: Notify reporting manager of handover
 */
export async function sendHandoverNotificationToManagerEmail(opts: {
  managerName: string;
  managerEmail: string;
  departingName: string;
  successorName: string;
  reassignedCount: number;
  reason?: string;
  deactivationType: 'Resignation' | 'Termination' | 'Long leave';
}): Promise<{ success: boolean }> {
  try {
    const { transporter } = await createEmailTransporter();
    const from = process.env.SMTP_FROM || 'UrbanGaon HR Operations <hr@urbangaon.com>';

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; padding: 24px; color: #1e293b;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <div style="background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%); padding: 24px; color: #ffffff;">
      <h2 style="margin: 0; font-size: 18px; font-weight: 700;">Team Member Handover Notice</h2>
      <p style="margin: 6px 0 0 0; font-size: 13px; color: #93c5fd;">Executive Team Operations Alert</p>
    </div>
    <div style="padding: 24px;">
      <p style="font-size: 14px; margin-top: 0;">Dear <strong>${opts.managerName}</strong>,</p>
      <p style="font-size: 13px; line-height: 1.6; color: #475569;">
        This alert is to notify you that team member <strong>${opts.departingName}</strong> has been transitioned to <strong>${opts.deactivationType}</strong> status. All active deliverables have been successfully reallocated.
      </p>
      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin: 18px 0; font-size: 13px; color: #1e3a8a;">
        <div style="margin-bottom: 8px;"><strong>Transitioning Member:</strong> ${opts.departingName}</div>
        <div style="margin-bottom: 8px;"><strong>Designated Successor:</strong> ${opts.successorName}</div>
        <div style="margin-bottom: 8px;"><strong>Deliverables Reallocated:</strong> ${opts.reassignedCount} active task(s)</div>
        <div style="margin-bottom: 8px;"><strong>Category:</strong> ${opts.deactivationType}</div>
        ${opts.reason ? `<div><strong>Details / Notes:</strong> ${opts.reason}</div>` : ''}
      </div>
      <p style="font-size: 12px; color: #64748b;">
        Please review your updated team capacity and in-flight deliverables in the "My Team" workspace tab.
      </p>
    </div>
    <div style="background: #f8fafc; padding: 14px 24px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0;">
      UrbanGaon Operations Center | Automated Manager Alert
    </div>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from,
      to: opts.managerEmail,
      subject: `Team Handover Notice: ${opts.departingName} to ${opts.successorName} (${opts.reassignedCount} Tasks)`,
      html,
    });
    console.log(`[Manager Handover Email] Dispatched to ${opts.managerEmail}`);
    return { success: true };
  } catch (err) {
    console.warn('[Manager Handover Email] Dispatch warning:', err);
    return { success: false };
  }
}

/**
 * Flowchart 20 Event 2: Task Escalated Alert to Senior & Manager
 */
export async function sendTaskEscalatedEmail(opts: {
  seniorEmail: string;
  seniorName: string;
  taskTitle: string;
  taskId: string;
  escalatedBy: string;
  reason: string;
}): Promise<{ success: boolean }> {
  try {
    const { transporter } = await createEmailTransporter();
    const from = process.env.EMAIL_FROM || '"UrbanGaon Escalations" <alerts@urbangaon.com>';
    const taskDirectLink = opts.taskId && opts.taskId !== 'N/A' ? `${PRODUCTION_WORKSPACE_URL}/?taskId=${encodeURIComponent(opts.taskId)}` : PRODUCTION_WORKSPACE_URL;
    const html = `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; padding: 20px;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1.5px solid #fecdd3; overflow: hidden; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08);">
    ${getEmailHeaderHtml('Corporate Governance Alert | Escalated to Leadership', taskDirectLink)}
    <div style="padding: 24px;">
      <p style="margin-top: 0;">Dear <strong>${opts.seniorName}</strong>,</p>
      <p style="color: #475569;">A deliverable requires your executive intervention and advisory guidance.</p>
      <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 14px; margin: 16px 0;">
        <div><strong>Task:</strong> ${opts.taskTitle}</div>
        <div style="margin-top: 6px;"><strong>Deliverable ID:</strong> #${opts.taskId}</div>
        <div style="margin-top: 6px;"><strong>Escalated By:</strong> ${opts.escalatedBy}</div>
        <div style="margin-top: 6px;"><strong>Blocker / Justification:</strong> "${opts.reason}"</div>
        <div style="margin-top: 6px;"><strong>SLA Window:</strong> 24 Hours Resolution Required</div>
      </div>
      <div style="text-align: center; margin: 24px 0 16px 0;">
        <a href="${taskDirectLink}" target="_blank" style="display: inline-block; background: #e11d48; color: #ffffff !important; padding: 12px 28px; border-radius: 6px; font-weight: 800; font-size: 14px; text-decoration: none;">
          🚀 Open Workspace
        </a>
        <div style="margin-top: 8px; font-size: 11px; color: #64748b;">
          Link: <a href="${taskDirectLink}" target="_blank" style="color: #2563eb;">${taskDirectLink}</a>
        </div>
      </div>
      <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">Please log in to your UrbanGaon command dashboard to advise, reassign, resolve, or return.</p>
    </div>
  </div>
</body>
</html>`;
    await transporter.sendMail({
      from,
      to: opts.seniorEmail,
      subject: `Action Required: Deliverable Escalated by ${opts.escalatedBy} - "${opts.taskTitle}"`,
      html,
      attachments: getEmailLogoAttachments(),
    });
    return { success: true };
  } catch (err) {
    console.warn('[Escalation Email] Error:', err);
    return { success: false };
  }
}

/**
 * Flowchart 20 Event 3: Task Reopened Alert to Assignees
 */
export async function sendTaskReopenedEmail(opts: {
  assigneeEmails: string[];
  taskTitle: string;
  reopenedBy: string;
  reason: string;
}): Promise<{ success: boolean }> {
  try {
    const { transporter } = await createEmailTransporter();
    const from = process.env.EMAIL_FROM || '"UrbanGaon Tasks" <notifications@urbangaon.com>';
    const taskDirectLink = PRODUCTION_WORKSPACE_URL;
    const html = `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; padding: 20px;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1.5px solid #bfdbfe; overflow: hidden; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08);">
    ${getEmailHeaderHtml('Deliverable Status Alert | Task Reopened', taskDirectLink)}
    <div style="padding: 24px;">
      <p style="color: #475569; margin-top: 0;">A completed task has been reopened for additional deliverables or review.</p>
      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px; margin: 16px 0;">
        <div><strong>Task:</strong> ${opts.taskTitle}</div>
        <div style="margin-top: 6px;"><strong>Reopened By:</strong> ${opts.reopenedBy}</div>
        <div style="margin-top: 6px;"><strong>Reopening Justification:</strong> "${opts.reason}"</div>
      </div>
      <div style="text-align: center; margin: 24px 0 16px 0;">
        <a href="${taskDirectLink}" target="_blank" style="display: inline-block; background: #2563eb; color: #ffffff !important; padding: 12px 28px; border-radius: 6px; font-weight: 800; font-size: 14px; text-decoration: none;">
          🚀 Open Workspace
        </a>
      </div>
      <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">Please review your task queue in the dashboard.</p>
    </div>
  </div>
</body>
</html>`;
    if (opts.assigneeEmails.length > 0) {
      await transporter.sendMail({
        from,
        to: opts.assigneeEmails.join(', '),
        subject: `Reopened: "${opts.taskTitle}" (by ${opts.reopenedBy})`,
        html,
        attachments: getEmailLogoAttachments(),
      });
    }
    return { success: true };
  } catch (err) {
    console.warn('[Task Reopened Email] Error:', err);
    return { success: false };
  }
}

/**
 * Flowchart 20 Event 4: Delay Reason Decision (Approved or Rejected)
 */
export async function sendReasonDecisionEmail(opts: {
  employeeEmail: string;
  employeeName: string;
  taskTitle: string;
  decision: 'APPROVED' | 'REJECTED';
  managerName: string;
  remarks?: string;
}): Promise<{ success: boolean }> {
  try {
    const { transporter } = await createEmailTransporter();
    const from = process.env.EMAIL_FROM || '"UrbanGaon Operations" <notifications@urbangaon.com>';
    const isApproved = opts.decision === 'APPROVED';
    const html = `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background: #f8fafc; padding: 20px;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1.5px solid ${isApproved ? '#bbf7d0' : '#fecdd3'}; overflow: hidden;">
    <div style="background: ${isApproved ? '#16a34a' : '#dc2626'}; color: white; padding: 20px 24px;">
      <h2 style="margin: 0; font-size: 18px;">Delay Justification: ${opts.decision}</h2>
      <p style="margin: 4px 0 0 0; font-size: 13px;">Leadership Decision Alert</p>
    </div>
    <div style="padding: 24px;">
      <p>Dear <strong>${opts.employeeName}</strong>,</p>
      <p style="color: #475569;">Your reporting manager <strong>${opts.managerName}</strong> has reviewed your delay justification for:</p>
      <div style="background: ${isApproved ? '#f0fdf4' : '#fff1f2'}; border: 1px solid ${isApproved ? '#bbf7d0' : '#fecdd3'}; border-radius: 8px; padding: 14px; margin: 16px 0;">
        <div><strong>Task:</strong> ${opts.taskTitle}</div>
        <div style="margin-top: 6px;"><strong>Status:</strong> ${opts.decision}</div>
        ${opts.remarks ? `<div style="margin-top: 6px;"><strong>Manager Remarks:</strong> "${opts.remarks}"</div>` : ''}
      </div>
    </div>
  </div>
</body>
</html>`;
    await transporter.sendMail({
      from,
      to: opts.employeeEmail,
      subject: `Delay Reason ${opts.decision}: "${opts.taskTitle}"`,
      html,
    });
    return { success: true };
  } catch (err) {
    console.warn('[Reason Decision Email] Error:', err);
    return { success: false };
  }
}

/**
 * Flowchart 20 Event 6: Weekly Digest to Directors
 */
export async function sendWeeklyDigestEmail(opts: {
  directorEmail: string;
  directorName: string;
  totalCompanyTasks: number;
  completedTasks: number;
  overdueTasks: number;
  escalatedTasks: number;
  timelyRatio: string;
}): Promise<{ success: boolean }> {
  try {
    const { transporter } = await createEmailTransporter();
    const from = process.env.EMAIL_FROM || '"UrbanGaon Executive Briefings" <executive@urbangaon.com>';
    const html = `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background: #f8fafc; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #cbd5e1; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #1e1b4b, #312e81); color: white; padding: 24px;">
      <h2 style="margin: 0; font-size: 20px;">Executive Weekly Operations Digest</h2>
      <p style="margin: 6px 0 0 0; font-size: 13px; color: #cbd5e1;">Executive Summary: Organization-Wide Velocity</p>
    </div>
    <div style="padding: 24px;">
      <p>Dear <strong>${opts.directorName}</strong>,</p>
      <p style="color: #475569;">Here is the executive weekly summary of corporate deliverables across all teams:</p>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0;">
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 11px; color: #64748b; font-weight: 700;">TOTAL DELIVERABLES</div>
          <div style="font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 4px;">${opts.totalCompanyTasks}</div>
        </div>
        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 11px; color: #047857; font-weight: 700;">TIMELY RATIO</div>
          <div style="font-size: 22px; font-weight: 800; color: #15803d; margin-top: 4px;">${opts.timelyRatio}</div>
        </div>
        <div style="background: #fef2f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 11px; color: #991b1b; font-weight: 700;">OVERDUE DELAYS</div>
          <div style="font-size: 22px; font-weight: 800; color: #b91c1c; margin-top: 4px;">${opts.overdueTasks}</div>
        </div>
        <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 11px; color: #9a3412; font-weight: 700;">ESCALATIONS</div>
          <div style="font-size: 22px; font-weight: 800; color: #c2410c; margin-top: 4px;">${opts.escalatedTasks}</div>
        </div>
      </div>
      <p style="font-size: 12px; color: #64748b;">Complete historical audit records and interactive analytics are accessible in the Super Admin Executive Portal.</p>
    </div>
  </div>
</body>
</html>`;
    await transporter.sendMail({
      from,
      to: opts.directorEmail,
      subject: `Executive Weekly Digest: ${opts.timelyRatio} Timely Completion (${opts.totalCompanyTasks} Deliverables)`,
      html,
    });
    return { success: true };
  } catch (err) {
    console.warn('[Weekly Digest Email] Error:', err);
    return { success: false };
  }
}

export interface SendOverdueAutoFlagOptions {
  toEmail: string;
  toName: string;
  managerEmail?: string;
  managerName?: string;
  taskId: string;
  taskTitle: string;
  scheduledDate: string;
  daysOverdue: number;
  hasReason: boolean;
  delayReason?: string;
  isEscalated?: boolean;
  baseUrl?: string;
}

/**
 * Flowchart 21: "Notify assignee and reporting manager"
 * Dispatched automatically when an uncompleted task passes its due date.
 */
export async function sendOverdueAutoFlagEmail(opts: SendOverdueAutoFlagOptions) {
  try {
    const { transporter, isTestAccount } = await createEmailTransporter();
    const from = process.env.SMTP_FROM || '"UrbanGaon Automated Monitor" <alerts@urbangaon.com>';
    const appBase = getAppBaseUrl(opts.baseUrl);
    const taskDirectLink = opts.taskId ? `${appBase}/?taskId=${encodeURIComponent(opts.taskId)}` : appBase;

    const statusBadge = opts.isEscalated
      ? '<span style="background: #fee2e2; color: #b91c1c; padding: 4px 10px; border-radius: 6px; font-weight: 800; font-size: 12px; border: 1px solid #fca5a5;">AUTO-ESCALATED TO MANAGER</span>'
      : opts.hasReason
      ? '<span style="background: #fff7ed; color: #c2410c; padding: 4px 10px; border-radius: 6px; font-weight: 800; font-size: 12px; border: 1px solid #fed7aa;">OVERDUE (REASON RECORDED)</span>'
      : '<span style="background: #fef2f2; color: #dc2626; padding: 4px 10px; border-radius: 6px; font-weight: 800; font-size: 12px; border: 1px solid #fecaca;">PENDING NO REASON (ACTION REQUIRED)</span>';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .content { padding: 24px; font-size: 14px; line-height: 1.6; }
    .task-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff !important; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 14px; }
    .footer { background: #f1f5f9; padding: 14px 24px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    ${getEmailHeaderHtml('Overdue Deliverable Auto-Flag Notification', taskDirectLink)}
    <div class="content">
      <p style="margin-top: 0;">
        Hello <strong>${opts.toName}</strong>,
      </p>
      <p>
        The corporate hourly evaluation routine detected that the following deliverable has passed its scheduled deadline without completion:
      </p>

      <div class="task-box">
        <div style="margin-bottom: 8px;">${statusBadge}</div>
        <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">
          ${opts.taskTitle}
        </div>
        <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">
          <strong>Deliverable ID:</strong> #${opts.taskId} | <strong>Scheduled Due Date:</strong> ${opts.scheduledDate}
        </div>
        <div style="font-size: 12px; color: #b91c1c; font-weight: 700;">
          <strong>Days Overdue:</strong> ${opts.daysOverdue} day${opts.daysOverdue !== 1 ? 's' : ''}
        </div>
        ${opts.hasReason && opts.delayReason ? `
          <div style="margin-top: 10px; padding: 8px 12px; background: #fff7ed; border-left: 3px solid #ea580c; border-radius: 4px; font-size: 12px; color: #9a3412;">
            <strong>Recorded Delay Reason:</strong> "${opts.delayReason}"
          </div>
        ` : `
          <div style="margin-top: 10px; padding: 8px 12px; background: #fef2f2; border-left: 3px solid #dc2626; border-radius: 4px; font-size: 12px; color: #991b1b;">
            <strong>Action Required:</strong> No delay explanation has been recorded. Per corporate policy, please document the root cause on your dashboard immediately.
          </div>
        `}
        ${opts.isEscalated ? `
          <div style="margin-top: 10px; padding: 8px 12px; background: #fee2e2; border-left: 3px solid #b91c1c; border-radius: 4px; font-size: 12px; color: #7f1d1d; font-weight: 700;">
            Escalation: This deliverable has been automatically escalated to reporting manager (${opts.managerName || 'Management'}) for leadership guidance.
          </div>
        ` : ''}
      </div>

      <p style="margin-bottom: 0;">
        Please open your workspace to update the status, reschedule, or document your justification:
      </p>
      <div style="text-align: center; margin: 24px 0 16px 0;">
        <a href="${taskDirectLink}" target="_blank" class="btn">🚀 Open Workspace</a>
        <div style="margin-top: 8px; font-size: 11px; color: #64748b;">
          Direct Link: <a href="${taskDirectLink}" target="_blank" style="color: #2563eb; text-decoration: underline;">https://todo-dashboard-rhvx.vercel.app/</a>
        </div>
      </div>
    </div>
    <div class="footer">
      UrbanGaon Task Register | Automated Governance Engine | Mr. Sukh Sagar Singh (CEO)
    </div>
  </div>
</body>
</html>`;

    const ccList = (opts.managerEmail && opts.managerEmail.includes('@') && opts.managerEmail.toLowerCase() !== opts.toEmail.toLowerCase())
      ? [opts.managerEmail]
      : undefined;

    const subject = opts.isEscalated
      ? `[ESCALATION] Overdue Deliverable #${opts.taskId}: "${opts.taskTitle}" (${opts.daysOverdue}d overdue)`
      : opts.hasReason
      ? `[Overdue - Reason Logged] Deliverable #${opts.taskId}: "${opts.taskTitle}"`
      : `[Action Required: No Reason] Overdue Deliverable #${opts.taskId}: "${opts.taskTitle}"`;

    const info = await transporter.sendMail({
      from,
      to: opts.toEmail,
      cc: ccList,
      subject,
      html,
      attachments: getEmailLogoAttachments(),
    });

    return {
      success: true,
      messageId: info.messageId,
      isTestAccount,
      previewUrl: isTestAccount ? nodemailer.getTestMessageUrl(info) : null,
    };
  } catch (err) {
    console.warn('[Overdue AutoFlag Email Error]:', err);
    return { success: false, error: String(err) };
  }
}

/* -- Flowchart 20 Event 1: Task Assigned -------------------------- */
export interface SendTaskAssignedOptions {
  toEmail: string;
  toName: string;
  taskId: string;
  taskTitle: string;
  scheduledDate: string;
  time: string;
  priority: string;
  department: string;
  assignedBy: string;
  baseUrl?: string;
}

export async function sendTaskAssignedEmail(opts: SendTaskAssignedOptions) {
  try {
    const res = await sendTaskAssignmentEmail({
      assignees: [{ name: opts.toName, email: opts.toEmail }],
      taskId: opts.taskId,
      taskTitle: opts.taskTitle,
      creatorName: opts.assignedBy,
      scheduledDate: opts.scheduledDate,
      time: opts.time,
      priority: opts.priority,
      department: opts.department,
      loginUrl: opts.baseUrl,
    });
    return { success: res.success, count: res.count };
  } catch (err) {
    console.warn('[Task Assigned Email Error]:', err);
    return { success: false, error: String(err) };
  }
}

export interface SendTaskCancelledOptions {
  recipientEmail: string;
  recipientName: string;
  taskId: string;
  taskTitle: string;
  cancelledBy: string;
  cancellationReason: string;
  department?: string;
  priority?: string;
  baseUrl?: string;
}

export async function sendTaskCancelledEmail(opts: SendTaskCancelledOptions) {
  try {
    const { transporter } = await createEmailTransporter();
    const from = process.env.SMTP_FROM || '"UrbanGaon Task Operations" <techdesk@urbangaon.com>';
    const appBase = getAppBaseUrl(opts.baseUrl);
    const taskDirectLink = opts.taskId ? `${appBase}/?taskId=${encodeURIComponent(opts.taskId)}` : appBase;

    const subject = `[UrbanGaon] Deliverable Cancelled: "${opts.taskTitle}"`;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Deliverable Cancelled</title>
  <style>
    body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #1e293b; }
    .email-container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #cbd5e1; overflow: hidden; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08); }
    .email-body { padding: 28px; font-size: 14px; line-height: 1.6; color: #334155; }
    .greeting { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
    .task-card { background: #fef2f2; border: 1px solid #fecaca; border-top: 4px solid #dc2626; border-radius: 8px; padding: 18px; margin: 18px 0; }
    .task-title { font-size: 16px; font-weight: 800; color: #991b1b; margin-bottom: 10px; }
    .reason-box { background: #ffffff; border-left: 3px solid #dc2626; border-radius: 4px; padding: 10px 14px; margin-top: 12px; font-size: 13px; color: #7f1d1d; }
    .info-note { font-size: 12px; color: #64748b; margin-top: 12px; line-height: 1.4; }
    .cta-container { text-align: center; margin-top: 22px; }
    .cta-button { display: inline-block; background: #2563eb; color: #ffffff !important; padding: 12px 28px; border-radius: 6px; font-weight: 800; font-size: 14px; text-decoration: none; }
    .email-footer { background: #f8fafc; padding: 16px 24px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; text-align: center; }
  </style>
</head>
<body>
  <div class="email-container">
    ${getEmailHeaderHtml('Operational Deliverable Governance | Task Cancelled', taskDirectLink)}
    <div class="email-body">
      <div class="greeting">Dear ${opts.recipientName},</div>
      <p style="margin: 0 0 16px 0;">
        The operational deliverable below has been officially marked as <strong>Cancelled</strong> by <strong>${opts.cancelledBy}</strong>.
      </p>

      <div class="task-card">
        <div class="task-title">${opts.taskTitle}</div>
        <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">
          <strong>Deliverable ID:</strong> #${opts.taskId} ${opts.department ? `| <strong>Dept:</strong> ${opts.department}` : ''}
        </div>
        <div class="reason-box">
          <strong>Mandatory Cancellation Rationale:</strong><br>
          "${opts.cancellationReason}"
        </div>
        <div class="info-note">
          Per corporate governance, this deliverable has been excluded from all active rosters and performance reports.
        </div>
      </div>

      <div class="cta-container">
        <a href="${taskDirectLink}" target="_blank" class="cta-button">🚀 Open Workspace</a>
        <div style="margin-top: 8px; font-size: 11px; color: #64748b;">
          Link: <a href="${taskDirectLink}" target="_blank" style="color: #2563eb;">https://todo-dashboard-rhvx.vercel.app/</a>
        </div>
      </div>
    </div>
    <div class="email-footer">
      UrbanGaon Technologies Private Limited | Corporate Governance Engine<br>
      Cancellation dispatch sent to ${opts.recipientEmail}.
    </div>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from,
      to: opts.recipientEmail,
      subject,
      html,
      attachments: getEmailLogoAttachments(),
    });

    try {
      const { EmailLogModel } = await import('@/models/EmailLog');
      await EmailLogModel.create({
        id: `elog-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        recipientEmail: opts.recipientEmail.toLowerCase(),
        recipientName: opts.recipientName,
        eventType: 'TASK_CANCELLED',
        subject,
        status: 'DELIVERED',
        attempts: 1,
        taskId: opts.taskId,
        deliveredAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    } catch {}

    return { success: true };
  } catch (err) {
    console.warn('[Task Cancelled Email Error]:', err);
    return { success: false, error: String(err) };
  }
}

export interface SendConfigRollbackEmailOptions {
  adminEmail: string;
  adminName: string;
  restoredVersion: string;
  previousVersion: string;
  triggeredBy: string;
  problemReason: string;
  baseUrl?: string;
}

export async function sendConfigRollbackEmail(opts: SendConfigRollbackEmailOptions): Promise<{ success: boolean; messageId?: string; isTestAccount?: boolean; error?: string }> {
  try {
    const { transporter, isTestAccount } = await createEmailTransporter();
    const appBase = getAppBaseUrl(opts.baseUrl);
    const from = process.env.SMTP_FROM || '"UrbanGaon System Governance" <noreply@urbangaon.com>';

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; margin: 0; padding: 24px; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #c2410c 0%, #ea580c 100%); padding: 22px; color: #ffffff; }
    .content { padding: 24px; font-size: 14px; line-height: 1.6; color: #1e293b; }
    .alert-box { background: #fff7ed; border: 1px solid #fdba74; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .btn { display: inline-block; background: #ea580c; color: #ffffff !important; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 13px; margin-top: 12px; }
    .footer { background: #f1f5f9; padding: 14px 24px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div style="font-size: 18px; font-weight: 800;">Configuration Rollback Alert</div>
      <div style="font-size: 12px; opacity: 0.9; margin-top: 2px;">UrbanGaon System Governance Notification</div>
    </div>
    <div class="content">
      <p style="margin-top: 0;">Hello <strong>${opts.adminName}</strong>,</p>
      <p>This is an automated governance notice. A configuration rollback has been executed by <strong>${opts.triggeredBy}</strong> under <strong>Configuration Versioning and Rollback Policy</strong>.</p>
      <div class="alert-box">
        <div style="font-size: 15px; font-weight: 800; color: #9a3412; margin-bottom: 8px;">Rollback Summary</div>
        <div style="font-size: 13px; color: #431407;">
          - <strong>Restored Version:</strong> ${opts.restoredVersion}<br>
          - <strong>Rolled Back From:</strong> ${opts.previousVersion}<br>
          - <strong>Problem Detected:</strong> ${opts.problemReason}<br>
          - <strong>Timestamp:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
        </div>
      </div>
      <p>All core settings (email schedules, security lockout policies, permissions, and metadata baselines) have been safely restored.</p>
      <a href="${appBase}/" class="btn">Review System Configuration in Portal</a>
    </div>
    <div class="footer">UrbanGaon Enterprise Engine | Configuration Governance</div>
  </div>
</body>
</html>`;

    const info = await transporter.sendMail({
      from,
      to: opts.adminEmail,
      subject: `[Rollback Notice] System Config rolled back to ${opts.restoredVersion}`,
      html,
    });

    return { success: true, messageId: info.messageId, isTestAccount };
  } catch (err) {
    console.warn('[Config Rollback Email Error]:', err);
    return { success: false, error: String(err) };
  }
}

