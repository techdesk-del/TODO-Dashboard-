/**
 * models/AccessRequest.ts — Employee Self Sign-Up Request Schema (FC 2 & FC 3)
 *
 * Persists public registration requests from prospective staff to MongoDB Atlas
 * for Talent HR & Admin verification and approval.
 */

import mongoose, { Schema, Model } from 'mongoose';

export interface IAccessRequest {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  manager?: string;
  managerEmail?: string;
  employeeId?: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  appliedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  invitationCode?: string;
}

const AccessRequestSchema = new Schema<IAccessRequest>(
  {
    id:              { type: String, required: true, unique: true, index: true },
    name:            { type: String, required: true, trim: true },
    email:           { type: String, required: true, lowercase: true, trim: true, index: true },
    phone:           { type: String, default: '', trim: true },
    department:      { type: String, required: true, trim: true },
    designation:     { type: String, required: true, trim: true },
    manager:         { type: String, default: '', trim: true },
    managerEmail:    { type: String, default: '', trim: true },
    employeeId:      { type: String, default: '', trim: true },
    reason:          { type: String, default: '', trim: true },
    status:          { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING', index: true },
    rejectionReason: { type: String, default: '' },
    appliedAt:       { type: String, default: () => new Date().toISOString() },
    reviewedBy:      { type: String },
    reviewedAt:      { type: String },
    invitationCode:  { type: String },
  },
  { timestamps: false, versionKey: false }
);

export const AccessRequestModel: Model<IAccessRequest> =
  (mongoose.models.AccessRequest as Model<IAccessRequest>) ||
  mongoose.model<IAccessRequest>('AccessRequest', AccessRequestSchema);

export default AccessRequestModel;
