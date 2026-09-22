/**
 * models/Member.ts — Team Member Schema
 */

import mongoose, { Schema, Model } from 'mongoose';
import type { TeamMember } from '@/types';

const MemberSchema = new Schema<TeamMember>(
  {
    id:             { type: String, required: true, unique: true, index: true },
    name:           { type: String, required: true, trim: true },
    email:          { type: String, required: true, unique: true, lowercase: true, trim: true },
    role:           { type: String, required: true, enum: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE'] },
    designation:    { type: String, required: true },
    department:     { type: String, required: true },
    avatar:         { type: String, default: '' },
    managerId:      { type: String },
    status:         { type: String, enum: ['ACTIVE', 'PENDING_HR', 'ON_LEAVE', 'DEACTIVATED'], default: 'ACTIVE' },
    totalTasks:     { type: Number, default: 0 },
    completedTasks: { type: Number, default: 0 },
    activeTasks:    { type: Number, default: 0 },
    overdueTasks:   { type: Number, default: 0 },
    velocity:       { type: Number, default: 100 },
  },
  { timestamps: false, versionKey: false }
);

MemberSchema.index({ department: 1 });
MemberSchema.index({ role: 1 });

export const MemberModel: Model<TeamMember> =
  (mongoose.models.Member as Model<TeamMember>) ||
  mongoose.model<TeamMember>('Member', MemberSchema);

export default MemberModel;
