/**
 * models/User.ts — Enterprise User Authentication Schema
 *
 * Stores credentials, bcrypt hash, RBAC role, and 2FA status in MongoDB Atlas.
 */

import mongoose, { Schema, Model } from 'mongoose';
import type { Role } from '@/types';

export interface IUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  department: string;
  designation: string;
  avatar?: string;
  twoFactorSecret?: string;
  isTwoFactorEnabled: boolean;
  createdAt: string;
}

const UserSchema = new Schema<IUser>(
  {
    id:                 { type: String, required: true, unique: true, index: true },
    name:               { type: String, required: true, trim: true },
    email:              { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash:       { type: String, required: true },
    role:               { type: String, required: true, enum: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE'], default: 'EMPLOYEE' },
    department:         { type: String, required: true },
    designation:        { type: String, required: true },
    avatar:             { type: String, default: 'AD' },
    twoFactorSecret:    { type: String },
    isTwoFactorEnabled: { type: Boolean, default: false },
    createdAt:          { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: false, versionKey: false }
);

export const UserModel: Model<IUser> =
  (mongoose.models.User as Model<IUser>) ||
  mongoose.model<IUser>('User', UserSchema);

export default UserModel;
