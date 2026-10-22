/**
 * models/EmailLog.ts — Flowchart 20: email_logs Table
 *
 * Implements persistent tracking for all email dispatches:
 * - Logs initial status
 * - Tracks retry attempts (up to 3 times per Flowchart 20)
 * - Flags delivery failure and logs to Admin failure summary
 */

import mongoose, { Schema, Model } from 'mongoose';
import type { EmailLog } from '@/types';

const EmailLogSchema = new Schema<EmailLog>(
  {
    id:                  { type: String, required: true, unique: true, index: true },
    recipientEmail:      { type: String, required: true, index: true },
    recipientName:       { type: String, required: true },
    eventType:           {
      type: String,
      required: true,
      enum: [
        'TASK_ASSIGNED',
        'TASK_ESCALATED',
        'TASK_REOPENED',
        'REASON_STATUS_CHANGED',
        'DAILY_REMINDER',
        'WEEKLY_DIGEST',
        'CHRONIC_DELAY',
        'CONFIG_ROLLBACK',
        'DATA_RETENTION'
      ],
      index: true
    },
    subject:             { type: String, required: true },
    status:              {
      type: String,
      required: true,
      enum: ['DELIVERED', 'FAILED', 'PENDING'],
      default: 'PENDING',
      index: true
    },
    attempts:            { type: Number, default: 1 },
    lastError:           { type: String },
    taskId:              { type: String, index: true },
    addedToAdminSummary: { type: Boolean, default: false, index: true },
    deliveredAt:         { type: String },
    createdAt:           { type: String, required: true, index: true },
  },
  {
    timestamps: false,
    versionKey: false,
    collection: 'email_logs' // Flowchart 20 "email_logs table"
  }
);

EmailLogSchema.index({ status: 1, createdAt: -1 });
EmailLogSchema.index({ eventType: 1, createdAt: -1 });

if (mongoose.models && mongoose.models.EmailLog) {
  delete mongoose.models.EmailLog;
}

export const EmailLogModel: Model<EmailLog> =
  mongoose.model<EmailLog>('EmailLog', EmailLogSchema);

export default EmailLogModel;
