
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

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    const { name, email, role = 'EMPLOYEE', designation = 'Specialist', department = 'Product & Tech', avatar, managerId, status = 'ACTIVE' } = body;

    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: 'Name and email are required fields' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // Check for existing member by email
    const existing = await MemberModel.findOne({ email: cleanEmail }).lean().exec();
    if (existing) {
      return NextResponse.json(
        { success: false, error: `Member with email ${cleanEmail} already exists` },
        { status: 409 }
      );
    }

    // Generate avatar initials if none provided
    const initials = avatar || name
      .split(' ')
      .map((part: string) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const newId = body.id || `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newMember = await MemberModel.create({
      id: newId,
      name: name.trim(),
      email: cleanEmail,
      role,
      designation: designation.trim(),
      department: department.trim(),
      avatar: initials,
      managerId: managerId || undefined,
      status,
      totalTasks: 0,
      completedTasks: 0,
      activeTasks: 0,
      overdueTasks: 0,
      velocity: 100,
    });

    return NextResponse.json({
      success: true,
      data: newMember.toObject ? newMember.toObject() : newMember,
    }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[API/members POST]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
