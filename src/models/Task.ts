/**
 * models/Task.ts — Mongoose Task Schema
 *
 * Mirrors the TypeScript Task interface exactly.
 * Compound indexes optimised for the app's query patterns:
 *   - Filter by date (calendar view)
 *   - Filter by assignee (manager / CEO portal)
 *   - Filter by creator (personal workspace)
 *   - Sort by priority + status (dashboard)
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import type { Task, TaskStatus, TaskPriority, Role } from '@/types';

/* ── Sub-schemas ─────────────────────────────────────────────────── */
const AssigneeSchema = new Schema(
  {
    id:          { type: String, required: true },
    name:        { type: String, required: true },
    email:       { type: String, required: true },
    department:  { type: String, required: true },
    designation: { type: String },
    avatar:      { type: String },
    status:      { type: String, required: true },
    completedAt: { type: String },
    remarks:     { type: String },
  },
  { _id: false }
);

const CreatorSchema = new Schema(
  {
    id:    { type: String, required: true },
    name:  { type: String, required: true },
    email: { type: String, required: true },
    role:  { type: String, required: true },
  },
  { _id: false }
);

const AiMetaSchema = new Schema(
  {
    rawTranscript:       { type: String },
    extractionLatencyMs: { type: Number },
    source:              { type: String, enum: ['voice_whisper', 'text_nlp', 'manual'] },
    confidenceScore:     { type: Number, min: 0, max: 1 },
  },
  { _id: false }
);

/* ── Task Schema ─────────────────────────────────────────────────── */
const TaskSchema = new Schema<Task>(
  {
    id:            { type: String, required: true, unique: true, index: true },
    title:         { type: String, required: true, trim: true, maxlength: 500 },
    scheduledDate: { type: String, required: true },   // YYYY-MM-DD
    time:          { type: String, required: true },   // '05:00 PM'
    priority:      { type: String, required: true, enum: ['URGENT', 'HIGH', 'NORMAL'] },
    status:        {
      type: String,
      required: true,
      enum: ['Queued', 'In Progress', 'Review', 'Done', 'On Hold', 'Escalated', 'Cancelled'],
      default: 'Queued',
    },
    assignees:          { type: [AssigneeSchema], default: [] },
    creator:            { type: CreatorSchema, required: true },
    department:         { type: String, required: true },
    project:            { type: String },
    location:           { type: String },
    progressPercent:    { type: Number, min: 0, max: 100 },
    isJustAdded:        { type: Boolean, default: false },
    holdReason:         { type: String },
    escalationReason:   { type: String },
    escalatedTo:        { type: String },
    cancellationReason: { type: String },
    carryForwardCount:  { type: Number, default: 0 },
    aiMetadata:         { type: AiMetaSchema },
    createdAt:          { type: String },
    updatedAt:          { type: String },
  },
  {
    // Mongoose manages _id separately; our app uses string `id`
    timestamps: false,
    versionKey: false,
  }
);

/* ── Compound Indexes ────────────────────────────────────────────── */
TaskSchema.index({ scheduledDate: 1, status: 1 });          // Calendar + status filter
TaskSchema.index({ 'assignees.id': 1, scheduledDate: 1 });  // CEO member drilldown
TaskSchema.index({ 'creator.id': 1,  scheduledDate: 1 });   // Personal workspace
TaskSchema.index({ priority: 1, status: 1, scheduledDate: 1 }); // Priority board
TaskSchema.index({ department: 1, scheduledDate: 1 });       // Dept view

/* ── Model (with HMR guard) ──────────────────────────────────────── */
export const TaskModel: Model<Task> =
  (mongoose.models.Task as Model<Task>) ||
  mongoose.model<Task>('Task', TaskSchema);

export default TaskModel;
