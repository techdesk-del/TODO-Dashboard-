/**
 * models/PurgedMember.ts — Enterprise Tombstone Registry for Permanently Purged Accounts
 *
 * Guarantees that employees purged by an Admin/CEO are never resurrected
 * by static rosters, database seeds, or authentication auto-provisioning.
 */

import mongoose, { Schema, Model } from 'mongoose';

export interface IPurgedMember {
  id: string;
  email: string;
  name: string;
  department?: string;
  designation?: string;
  purgedAt: string;
  purgedBy: string;
  reason?: string;
}

const PurgedMemberSchema = new Schema<IPurgedMember>(
  {
    id:          { type: String, required: true, unique: true, index: true },
    email:       { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    name:        { type: String, required: true, trim: true },
    department:  { type: String, default: '' },
    designation: { type: String, default: '' },
    purgedAt:    { type: String, default: () => new Date().toISOString() },
    purgedBy:    { type: String, default: 'Super Admin' },
    reason:      { type: String, default: 'Account Deactivation & Mandatory Handover Purge' },
  },
  { timestamps: false, versionKey: false, collection: 'purged_members' }
);

if (mongoose.models && mongoose.models.PurgedMember) {
  delete mongoose.models.PurgedMember;
}

export const PurgedMemberModel: Model<IPurgedMember> =
  mongoose.model<IPurgedMember>('PurgedMember', PurgedMemberSchema);

export default PurgedMemberModel;
