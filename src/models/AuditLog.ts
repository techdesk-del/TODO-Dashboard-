/**
 * models/AuditLog.ts — Immutable Audit Trail Schema
 *
 * All state changes generate an audit entry.
 * Entries are never updated — only inserted (append-only log).
 */

import mongoose, { Schema, Model } from 'mongoose';
import type { AuditLogEntry } from '@/types';

const AuditLogSchema = new Schema<AuditLogEntry>(
  {
    id:           { type: String, required: true, unique: true, index: true },
    timestamp:    { type: String, required: true },
    taskId:       { type: String, index: true },
    taskTitle:    { type: String },
    action:       {
      type: String,
      required: true,
      enum: ['CREATED', 'UPDATED', 'REOPENED', 'CANCELLED', 'ESCALATED', 'CARRIED_FORWARD', 'EXPORTED', 'LOGIN', 'CONFIG_CHANGED']
    },
    fieldChanged: { type: String },
    oldValue:     { type: String },
    newValue:     { type: String },
    actor:        { type: String, required: true },
    actorRole:    { type: String, required: true },
    ipAddress:    { type: String, required: true },
    deviceInfo:   { type: String, required: true },
    notes:        { type: String },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

/* ── Indexes ─────────────────────────────────────────────────────── */
AuditLogSchema.index({ taskId: 1, timestamp: -1 });    // Task history drilldown
AuditLogSchema.index({ actor: 1, timestamp: -1 });     // User activity trace
AuditLogSchema.index({ action: 1 });                   // Action filter

/* ── Model (with HMR guard) ──────────────────────────────────────── */
export const AuditLogModel: Model<AuditLogEntry> =
  (mongoose.models.AuditLog as Model<AuditLogEntry>) ||
  mongoose.model<AuditLogEntry>('AuditLog', AuditLogSchema);

export default AuditLogModel;
