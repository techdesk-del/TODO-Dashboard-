/**
 * models/SystemConfig.ts — System Configuration Schema for MongoDB Atlas
 *
 * Stores global policies, email schedule settings, working days,
 * and security rules in MongoDB Atlas with real-time persistence.
 */

import mongoose, { Schema, Model } from 'mongoose';
import type { SystemConfig } from '@/types';

export interface ISystemConfigDoc {
  key: string;
  config: SystemConfig;
  updatedAt: string;
  updatedBy?: string;
}

const SystemConfigSchema = new Schema<ISystemConfigDoc>(
  {
    key: { type: String, required: true, unique: true, index: true, default: 'global_system_config' },
    config: { type: Schema.Types.Mixed, required: true },
    updatedAt: { type: String, default: () => new Date().toISOString() },
    updatedBy: { type: String, default: 'SYSTEM' }
  },
  {
    timestamps: false,
    versionKey: false
  }
);

if (mongoose.models && mongoose.models.SystemConfig) {
  delete mongoose.models.SystemConfig;
}

export const SystemConfigModel: Model<ISystemConfigDoc> =
  mongoose.model<ISystemConfigDoc>('SystemConfig', SystemConfigSchema);

export default SystemConfigModel;
