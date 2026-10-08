/**
 * lib/rosterSync.ts — Server-only MongoDB Atlas Synchronization
 */
import connectDB from '@/lib/db';
import { MemberModel } from '@/models/Member';
import { UserModel } from '@/models/User';
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
    const defaultPasswordHash = await hashPassword('password123');

    for (const emp of OFFICIAL_ROSTER) {
      // 1. Sync MemberModel
      await MemberModel.findOneAndUpdate(
        { id: emp.id },
        {
          $set: {
            name: emp.name,
            email: emp.email.toLowerCase(),
            role: emp.role,
            designation: emp.designation,
            department: emp.department,
            avatar: emp.avatar,
            status: 'ACTIVE',
            totalTasks: emp.totalTasks,
            completedTasks: emp.completedTasks,
            activeTasks: emp.activeTasks,
            overdueTasks: emp.overdueTasks,
            velocity: emp.velocity,
          },
        },
        { upsert: true }
      );

      // 2. Sync UserModel with default password
      const existingUser = await UserModel.findOne({ id: emp.id });
      if (!existingUser) {
        await UserModel.create({
          id: emp.id,
          name: emp.name,
          email: emp.email.toLowerCase(),
          passwordHash: defaultPasswordHash,
          role: emp.role,
          department: emp.department,
          designation: emp.designation,
          avatar: emp.avatar,
          isTwoFactorEnabled: false,
          createdAt: new Date().toISOString(),
        });
      } else {
        await UserModel.updateOne(
          { id: emp.id },
          {
            $set: {
              name: emp.name,
              email: emp.email.toLowerCase(),
              role: emp.role,
              department: emp.department,
              designation: emp.designation,
              avatar: emp.avatar,
            },
          }
        );
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
