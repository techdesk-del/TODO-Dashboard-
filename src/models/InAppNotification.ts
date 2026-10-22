/**
 * models/InAppNotification.ts — Flowchart 20: In-App Notifications Collection
 * Persists in-app notifications dispatched across all 7 operational events.
 */

import mongoose, { Schema, Model } from 'mongoose';
import type { InAppNotification } from '@/types';

const InAppNotificationSchema = new Schema<InAppNotification>(
  {
    id:             { type: String, required: true, unique: true, index: true },
    recipientEmail: { type: String, required: true, index: true },
    recipientName:  { type: String },
    title:          { type: String, required: true },
    message:        { type: String, required: true },
    type:           {
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
    taskId:         { type: String, index: true },
    read:           { type: Boolean, default: false, index: true },
    createdAt:      { type: String, required: true, index: true },
  },
  {
    timestamps: false,
    versionKey: false,
    collection: 'notifications' // Flowchart 20 "notifications table"
  }
);

// High-speed compound indexes for employee notification tray
InAppNotificationSchema.index({ recipientEmail: 1, read: 1, createdAt: -1 });

if (mongoose.models && mongoose.models.InAppNotification) {
  delete mongoose.models.InAppNotification;
}

export const InAppNotificationModel: Model<InAppNotification> =
  mongoose.model<InAppNotification>('InAppNotification', InAppNotificationSchema);

export default InAppNotificationModel;
