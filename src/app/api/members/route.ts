
/**
 * app/api/members/route.ts
 * GET /api/members — Fetch team members list
 */

import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { MemberModel } from '@/models/Member';
import { INITIAL_MEMBERS } from '@/lib/mockData';

async function seedMembersIfEmpty() {
  const count = await MemberModel.countDocuments();
  if (count === 0) {
    console.log('[API/members] Empty collection — seeding with mock data...');
    await MemberModel.insertMany(INITIAL_MEMBERS, { ordered: false });
    console.log(`[API/members] ✓ Seeded ${INITIAL_MEMBERS.length} members`);
  }
}

export async function GET() {
  try {
    await connectDB();
    await seedMembersIfEmpty();

    const members = await MemberModel.find({}).lean().exec();

    return NextResponse.json({
      success: true,
      data: members,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[API/members GET]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
