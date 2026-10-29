/**
 * models/EmailLogSummary.ts — Flowchart: Data Retention and Archive Flow
 *
 * Implements: "Email logs -> Delete after 1 year keep summary counts"
 * Aggregates delivery performance, success/failure counts, and event breakdowns
 * prior to purging granular individual email dispatch logs.
 */

import mongoose, { Schema, Model } from 'mongoose';

export interface IEmailLogSummary {
  id: string;
  periodLabel: string;
  cutoffDate: string;
  totalPurged: number;
  deliveredCount: number;
  failedCount: number;
  pendingCount: number;
  eventTypeBreakdown: Record<string, number>;
  purgedAt: string;
  notes?: string;
}

const EmailLogSummarySchema = new Schema<IEmailLogSummary>(
  {
    id:                 { type: String, required: true, unique: true, index: true },
    periodLabel:        { type: String, required: true },
    cutoffDate:         { type: String, required: true, index: true },
    totalPurged:        { type: Number, required: true, default: 0 },
    deliveredCount:     { type: Number, required: true, default: 0 },
    failedCount:        { type: Number, required: true, default: 0 },
    pendingCount:       { type: Number, required: true, default: 0 },
    eventTypeBreakdown: { type: Schema.Types.Mixed, default: {} },
    purgedAt:           { type: String, required: true, index: true },
    notes:              { type: String }
  },
  {
    timestamps: false,
    versionKey: false,
    collection: 'email_log_summaries' // Flowchart summary counts preservation table
  }
);

if (mongoose.models && mongoose.models.EmailLogSummary) {
  delete mongoose.models.EmailLogSummary;
}

export const EmailLogSummaryModel: Model<IEmailLogSummary> =
  mongoose.model<IEmailLogSummary>('EmailLogSummary', EmailLogSummarySchema);

export default EmailLogSummaryModel;
