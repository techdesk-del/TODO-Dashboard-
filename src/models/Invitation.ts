/**
 * models/Invitation.ts — Enterprise Invitation Schema (FC 1, FC 4 & FC 9)
 *
 * Tracks official onboarding invitation codes dispatched to new employees,
 * expiration windows, and redemption status.
 */

import mongoose, { Schema, Model } from 'mongoose';
import type { Role } from '@/types';

export interface IInvitation {
  code: string;
  email: string;
  name: string;
  role: Role;
  department: string;
  designation: string;
  invitedBy: string;
  expiresAt: Date;
  isUsed: boolean;
  usedAt?: Date;
  createdAt: Date;
}

const InvitationSchema = new Schema<IInvitation>(
  {
    code:        { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    email:       { type: String, required: true, lowercase: true, trim: true, index: true },
    name:        { type: String, required: true, trim: true },
    role:        { type: String, required: true, enum: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE'], default: 'EMPLOYEE' },
    department:  { type: String, required: true, trim: true },
    designation: { type: String, required: true, trim: true },
    invitedBy:   { type: String, default: 'Talent HR / Admin' },
    expiresAt:   { type: Date, required: true },
    isUsed:      { type: Boolean, default: false, index: true },
    usedAt:      { type: Date },
    createdAt:   { type: Date, default: () => new Date() },
  },
  { timestamps: false, versionKey: false }
);

export const InvitationModel: Model<IInvitation> =
  (mongoose.models.Invitation as Model<IInvitation>) ||
  mongoose.model<IInvitation>('Invitation', InvitationSchema);

export default InvitationModel;
