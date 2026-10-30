/**
 * lib/rosterSync.ts — Server-only MongoDB Atlas Synchronization
 */
import connectDB from '@/lib/db';
import { MemberModel } from '@/models/Member';
import { UserModel } from '@/models/User';
import { PurgedMemberModel } from '@/models/PurgedMember';
import { hashPassword } from '@/lib/auth';
import { OFFICIAL_ROSTER } from '@/shared/lib/rosterData';

export * from '@/shared/lib/rosterData';

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

    const existingMemberCount = await MemberModel.countDocuments();

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

      // 1. Ensure MemberModel record exists — NEVER overwrite user-updated role, designation, department, name, or email!
      const existingMember = await MemberModel.findOne({
        $or: [
          { id: emp.id },
          { email: empEmailClean },
          ...(empAliases.length > 0 ? empAliases.map(a => ({ email: a })) : [])
        ]
      });

      if (!existingMember) {
        // ONLY seed if database was completely empty; never re-insert employees whose email/ID was edited by admin
        if (existingMemberCount === 0) {
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
        }
      } else {
        // Member already exists in database; ONLY backfill strictly missing (undefined/empty) fields
        // NEVER overwrite role, designation, department, name, or email updated by Admin!
        const missingFields: Record<string, unknown> = {};
        if (!existingMember.role && emp.role) missingFields.role = emp.role;
        if (!existingMember.designation && emp.designation) missingFields.designation = emp.designation;
        if (!existingMember.department && emp.department) missingFields.department = emp.department;
        if (!existingMember.status) missingFields.status = 'ACTIVE';

        // Legacy cleanup only for mem-1 / ceo
        if (emp.id === 'mem-1' || empEmailClean === 'ceo@urbangaon.com') {
          if (existingMember.department === 'Leadership & CEO Desk' || existingMember.department === 'Leadership & CEO') {
            missingFields.department = 'Founder & CEO';
            missingFields.designation = 'Founder & CEO';
          }
        }

        if (Object.keys(missingFields).length > 0) {
          await MemberModel.updateOne({ _id: existingMember._id }, { $set: missingFields });
        }
      }

      // 2. Ensure UserModel record exists — NEVER overwrite user-updated fields!
      const existingUser = await UserModel.findOne({
        $or: [
          { id: emp.id },
          ...(existingMember?.email ? [{ email: existingMember.email.toLowerCase().trim() }] : []),
          { email: empEmailClean },
          ...(empAliases.length > 0 ? empAliases.map(a => ({ email: a })) : [])
        ]
      });

      if (!existingUser) {
        if (existingMemberCount === 0 || existingMember) {
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
        }
      } else {
        // User exists; ONLY backfill strictly missing fields, never overwrite user changes
        const missingUserFields: Record<string, unknown> = {};
        if (!existingUser.role && (existingMember?.role || emp.role)) {
          missingUserFields.role = existingMember?.role || emp.role;
        }
        if (!existingUser.department && (existingMember?.department || emp.department)) {
          missingUserFields.department = existingMember?.department || emp.department;
        }
        if (!existingUser.designation && (existingMember?.designation || emp.designation)) {
          missingUserFields.designation = existingMember?.designation || emp.designation;
        }
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
