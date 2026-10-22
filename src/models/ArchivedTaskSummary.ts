/**
 * models/ArchivedTaskSummary.ts — Flowchart: Data Retention and Archive Flow
 *
 * Implements: "Completed tasks -> Move to archive table keep summary only"
 * Stores lightweight summary metadata for archived completed/cancelled tasks
 * preserving operational metrics without bloating active database tables.
 */

import mongoose, { Schema, Model } from 'mongoose';

export interface IArchivedTaskSummary {
  id: string;
  taskId: string;
  title: string;
  category?: string;
  department: string;
  project?: string;
  status: string;
  assigneeNames: string[];
  assigneeEmails: string[];
  creatorName: string;
  creatorEmail: string;
  scheduledDate: string;
  completedAt?: string;
  archivedAt: string;
  summary: string;
}

const ArchivedTaskSummarySchema = new Schema<IArchivedTaskSummary>(
  {
    id:             { type: String, required: true, unique: true, index: true },
    taskId:         { type: String, required: true, unique: true, index: true },
    title:          { type: String, required: true, trim: true },
    category:       { type: String },
    department:     { type: String, required: true, index: true },
    project:        { type: String },
    status:         { type: String, required: true, index: true },
    assigneeNames:  { type: [String], default: [] },
    assigneeEmails: { type: [String], default: [] },
    creatorName:    { type: String, required: true },
    creatorEmail:   { type: String, required: true },
    scheduledDate:  { type: String, required: true },
    completedAt:    { type: String },
    archivedAt:     { type: String, required: true, index: true },
    summary:        { type: String, required: true }
  },
  {
    timestamps: false,
    versionKey: false,
    collection: 'archived_tasks_summary' // Dedicated archive table keeping summary only
  }
);

ArchivedTaskSummarySchema.index({ department: 1, archivedAt: -1 });

if (mongoose.models && mongoose.models.ArchivedTaskSummary) {
  delete mongoose.models.ArchivedTaskSummary;
}

export const ArchivedTaskSummaryModel: Model<IArchivedTaskSummary> =
  mongoose.model<IArchivedTaskSummary>('ArchivedTaskSummary', ArchivedTaskSummarySchema);

export default ArchivedTaskSummaryModel;
