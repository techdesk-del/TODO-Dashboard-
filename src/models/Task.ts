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
    description:   { type: String, trim: true },
    scheduledDate: { type: String, required: true },   // YYYY-MM-DD
    dueDate:       { type: String },                   // YYYY-MM-DD (Target Due Date / Deadline)
    time:          { type: String, required: true },   // '05:00 PM'
    priority:      { type: String, required: true, enum: ['URGENT', 'HIGH', 'NORMAL'] },
    status:        {
      type: String,
      required: true,
      enum: ['Not Started', 'Queued', 'In Progress', 'Review', 'Done', 'On Hold', 'Escalated', 'Cancelled', 'Partially Completed', 'Pending Notice'],
      default: 'Not Started',
    },
    assignees:          { type: [AssigneeSchema], default: [] },
    creator:            { type: CreatorSchema, required: true },
    department:         { type: String, required: true },
    project:            { type: String },
    location:           { type: String },
    progressPercent:    { type: Number, min: 0, max: 100 },
    isJustAdded:        { type: Boolean, default: false },
    isOverdue:          { type: Boolean, default: false },
    isPendingNoReason:  { type: Boolean, default: false },
    overdueFlaggedAt:   { type: String },
    overdueNotifiedAt:  { type: String },
    overdueDays:        { type: Number, default: 0 },
    pastDueReason:      { type: String },
    delayReason:        { type: String },
    delayReasonSubmittedAt: { type: String },
    delayReasonApproved:    { type: Boolean, default: false },
    notes:              { type: String },
    inputMethod:        { type: String, enum: ['Speak', 'Type'], default: 'Type' },
    holdReason:         { type: String },
    escalationReason:   { type: String },
    escalatedTo:        { type: String },
    escalatedToId:      { type: String },
    escalatedAt:        { type: String },
    escalationSlaHours: { type: Number, default: 24 },
    autoEscalatedToManager: { type: Boolean, default: false },
    seniorAdvisoryComment:  { type: String },
    seniorResolutionNote:   { type: String },
    seniorReturnReason:     { type: String },
    originalAssigneeNotified: { type: Boolean, default: false },
    cancellationReason: { type: String },
    carryForwardCount:  { type: Number, default: 0 },
    aiMetadata:         { type: AiMetaSchema },
    editedByAdmin:      { type: Boolean, default: false },
    isArchived:         { type: Boolean, default: false, index: true },
    archivedAt:         { type: String },
    createdAt:          { type: String },
    updatedAt:          { type: String },
  },
  {
    // Mongoose manages _id separately; our app uses string `id`
    timestamps: false,
    versionKey: false,
    strict: false,
  }
);

/* ── High-Performance Indexes for 100+ Concurrent Employees ── */
TaskSchema.index({ createdAt: 1 });                          // High-speed chronological sequence sorting
TaskSchema.index({ updatedAt: -1 });                         // Real-time delta sync & SSE queries
TaskSchema.index({ scheduledDate: 1, createdAt: 1 });         // Date + chronological lookup
TaskSchema.index({ scheduledDate: 1, status: 1 });          // Calendar + status filter
TaskSchema.index({ 'assignees.id': 1, scheduledDate: 1 });  // Member drilldown
TaskSchema.index({ 'creator.id': 1,  scheduledDate: 1 });   // Personal workspace
TaskSchema.index({ department: 1, scheduledDate: 1 });       // Dept view
TaskSchema.index({ isOverdue: 1, isPendingNoReason: 1 });   // Flowchart 21 overdue & no-reason query optimization

/* ── Model (with HMR guard) ──────────────────────────────────────── */
if (mongoose.models && mongoose.models.Task) {
  delete mongoose.models.Task;
}
export const TaskModel: Model<Task> =
  mongoose.model<Task>('Task', TaskSchema);

export default TaskModel;
