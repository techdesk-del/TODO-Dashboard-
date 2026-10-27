/**
 * lib/rosterSync.ts — Server-only MongoDB Atlas Synchronization
 */
import connectDB from '@/lib/db';
import { MemberModel } from '@/models/Member';
import { UserModel } from '@/models/User';
import { PurgedMemberModel } from '@/models/PurgedMember';
import { hashPassword } from '@/lib/auth';
import { OFFICIAL_ROSTER } from './rosterData';

export * from './rosterData';

let isRosterSyncInProgress = false;
let hasSyncedOnce = false;

export async function syncOfficialRosterToDB(): Promise<void> {
  if (isRosterSyncInProgress || hasSyncedOnce) return;
  isRosterSyncInProgress = true;

  try {
    await connectDB();
    const defaultPasswordHash = await hashPassword('123');

    // Fetch all purged employees so we never resurrect purged accounts
    const purgedRecords = await PurgedMemberModel.find({}).lean().exec();
    const purgedIds = new Set(purgedRecords.map(p => p.id));
    const purgedEmails = new Set(purgedRecords.map(p => p.email.toLowerCase().trim()));

    for (const emp of OFFICIAL_ROSTER) {
      const empEmailClean = emp.email.toLowerCase().trim();
      const empAliases = emp.aliases ? emp.aliases.map(a => a.toLowerCase().trim()) : [];
      const isPurged = purgedIds.has(emp.id) ||
        purgedEmails.has(empEmailClean) ||
        empAliases.some(a => purgedEmails.has(a));

      if (isPurged) {
        // Guarantee no leftover or resurrected records in MemberModel or UserModel
        await MemberModel.deleteMany({ $or: [{ id: emp.id }, { email: empEmailClean }] }).exec();
        await UserModel.deleteMany({ $or: [{ id: emp.id }, { email: empEmailClean }] }).exec();
        continue;
      }

      // 1. Ensure MemberModel record exists — NEVER overwrite user-updated name, email, avatar or status!
      const existingMember = await MemberModel.findOne({
        $or: [
          { id: emp.id },
          { email: empEmailClean },
          ...(empAliases.length > 0 ? empAliases.map(a => ({ email: a })) : [])
        ]
      });

      if (!existingMember) {
        await MemberModel.create({
          id: emp.id,
          name: emp.name,
          email: empEmailClean,
          role: emp.role,
          designation: emp.designation,
          department: emp.department,
          avatar: emp.avatar,
          status: 'ACTIVE',
          totalTasks: emp.totalTasks ?? 0,
          completedTasks: emp.completedTasks ?? 0,
          activeTasks: emp.activeTasks ?? 0,
          overdueTasks: emp.overdueTasks ?? 0,
          velocity: emp.velocity ?? 100,
        });
      } else {
        // Member already exists in database; only backfill missing core fields, never clobber updated name/email
        const missingFields: Record<string, unknown> = {};
        if (!existingMember.role) missingFields.role = emp.role;
        if (!existingMember.designation) missingFields.designation = emp.designation;
        if (!existingMember.department) missingFields.department = emp.department;
        if (!existingMember.status) missingFields.status = 'ACTIVE';
        if (Object.keys(missingFields).length > 0) {
          await MemberModel.updateOne({ _id: existingMember._id }, { $set: missingFields });
        }
      }

      // 2. Ensure UserModel record exists — NEVER overwrite user-updated name or email!
      const existingUser = await UserModel.findOne({
        $or: [
          { id: emp.id },
          ...(existingMember?.email ? [{ email: existingMember.email.toLowerCase().trim() }] : []),
          { email: empEmailClean },
          ...(empAliases.length > 0 ? empAliases.map(a => ({ email: a })) : [])
        ]
      });

      if (!existingUser) {
        await UserModel.create({
          id: existingMember?.id || emp.id,
          name: existingMember?.name || emp.name,
          email: existingMember?.email?.toLowerCase().trim() || empEmailClean,
          passwordHash: defaultPasswordHash,
          role: existingMember?.role || emp.role,
          department: existingMember?.department || emp.department,
          designation: existingMember?.designation || emp.designation,
          avatar: existingMember?.avatar || emp.avatar,
          isTwoFactorEnabled: false,
          createdAt: new Date().toISOString(),
        });
      } else {
        // User exists; only backfill missing fields without touching name or email
        const missingUserFields: Record<string, unknown> = {};
        if (!existingUser.role) missingUserFields.role = existingMember?.role || emp.role;
        if (!existingUser.department) missingUserFields.department = existingMember?.department || emp.department;
        if (!existingUser.designation) missingUserFields.designation = existingMember?.designation || emp.designation;
        if (Object.keys(missingUserFields).length > 0) {
          await UserModel.updateOne({ _id: existingUser._id }, { $set: missingUserFields });
        }
      }
    }

    hasSyncedOnce = true;
    console.log(`[RosterSync] ✓ Successfully synchronized ${OFFICIAL_ROSTER.length} employees to MongoDB Atlas.`);
  } catch (error) {
    console.warn('[RosterSync] Note on syncing roster to MongoDB (will retry):', error instanceof Error ? error.message : error);
  } finally {
    isRosterSyncInProgress = false;
  }
}
