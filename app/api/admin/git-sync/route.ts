import { NextRequest, NextResponse } from 'next/server';
import { syncOfficialRosterToDB } from '@/lib/rosterSync';
import connectDB from '@/lib/db';
import { MemberModel } from '@/models/Member';
import { UserModel } from '@/models/User';
import { OFFICIAL_ROSTER } from '@/shared/lib/rosterData';

export async function GET(req: NextRequest) {
  return handleSync(req);
}

export async function POST(req: NextRequest) {
  return handleSync(req);
}

async function handleSync(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');
    const secret = process.env.JWT_SECRET || 'urbangaon_executive_jwt_super_key_2026_9e7f8d6c5b4a3a2b1c0d';

    // Allow sync via secure key or secret
    if (key !== 'urbangaon_git_sync_2026' && key !== secret) {
      // Also allow if Bearer token is provided
      const authHeader = req.headers.get('authorization');
      if (!authHeader && key !== 'urbangaon_git_sync_2026') {
        return NextResponse.json({ success: false, error: 'Unauthorized sync request' }, { status: 401 });
      }
    }

    console.log('[Git-Sync] Triggering real-time database and roster synchronization...');
    await connectDB();
    await syncOfficialRosterToDB();

    // Explicitly guarantee Aakash Das (mem-12) email is techdesk@urbangaon.com
    await MemberModel.updateOne(
      { $or: [{ id: 'mem-12' }, { email: 'aakash.das@urbangaon.com' }] },
      { $set: { email: 'techdesk@urbangaon.com' } }
    ).exec();

    await UserModel.updateMany(
      { $or: [{ id: 'mem-12' }, { email: 'aakash.das@urbangaon.com' }] },
      { $set: { email: 'techdesk@urbangaon.com' } }
    ).exec();

    // Guarantee mem-1 is Founder Mr. Sukh Sagar
    await MemberModel.updateOne(
      { id: 'mem-1' },
      { $set: { name: 'Mr. Sukh Sagar', department: 'Founder', designation: 'Founder' } }
    ).exec();

    await UserModel.updateMany(
      { id: 'mem-1' },
      { $set: { name: 'Mr. Sukh Sagar', department: 'Founder', designation: 'Founder' } }
    ).exec();

    const membersCount = await MemberModel.countDocuments();

    return NextResponse.json({
      success: true,
      message: 'MongoDB Atlas and official employee roster synchronized in real time.',
      rosterCount: OFFICIAL_ROSTER.length,
      databaseCount: membersCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Sync failed';
    console.error('[Git-Sync Error]:', errorMsg);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

