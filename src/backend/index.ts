/**
 * src/backend/index.ts — Backend Architectural Gateway
 *
 * Consolidates Database Connectors, Mongoose Schemas, Core Services,
 * Authentication, Email Dispatchers, and Realtime Event Streams.
 */

// Database Connection
export { default as connectDB } from './lib/db';

// Mongoose Models
export { MemberModel } from './models/Member';
export { UserModel } from './models/User';
export { TaskModel } from './models/Task';
export { AuditLogModel } from './models/AuditLog';
export { InvitationModel } from './models/Invitation';
export { PurgedMemberModel } from './models/PurgedMember';

// Core Server Services
export * from './lib/auth';
export * from './lib/email';
export * from './lib/events';
export * from './lib/rosterSync';
export * from './lib/rosterData';
export * from './lib/cron';

