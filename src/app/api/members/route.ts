/**
 * app/api/members/route.ts
 * GET /api/members — Fetch team members list
 * POST /api/members — Add new team member (internal HR/Admin)
 */

import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { MemberModel } from '@/models/Member';
import { UserModel } from '@/models/User';
import { hashPassword } from '@/lib/auth';
import { INITIAL_MEMBERS } from '@/lib/mockData';
import { syncOfficialRosterToDB } from '@/lib/rosterSync';
import { sendWelcomeCredentialsEmail } from '@/lib/email';

async function seedMembersIfEmpty() {
  const count = await MemberModel.countDocuments();
  if (count === 0) {
    console.log('[API/members] Empty collection — seeding with official team roster...');
    await MemberModel.insertMany(INITIAL_MEMBERS, { ordered: false });
    console.log(`[API/members] ✓ Seeded ${INITIAL_MEMBERS.length} members`);
  }
}

export async function GET() {
  try {
    await connectDB();
    await seedMembersIfEmpty();
    // Keep roster in sync with official designations and roles
    await syncOfficialRosterToDB().catch(() => {});

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

    const { name, email, role = 'EMPLOYEE', designation = 'Specialist', department = 'Sales', avatar, managerId, status = 'ACTIVE' } = body;

    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: 'Name and email are required fields' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // Generate avatar initials if none provided
    const initials = avatar || name
      .split(' ')
      .map((part: string) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    // Check for existing member by email
    const existing = await MemberModel.findOne({ email: cleanEmail }).exec();
    let memberRecord;

    if (existing) {
      // Re-activate or update existing member's designation, department, and role
      existing.name = name.trim();
      existing.role = role;
      existing.designation = designation.trim();
      existing.department = department.trim();
      existing.status = 'ACTIVE';
      if (initials) existing.avatar = initials;
      if (managerId) existing.managerId = managerId;
      await existing.save();
      memberRecord = existing;
      console.log(`[API/members POST] Re-activated / updated existing member: ${cleanEmail}`);
    } else {
      const newId = body.id || `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      memberRecord = await MemberModel.create({
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
      console.log(`[API/members POST] Created new member: ${cleanEmail} (${newId})`);
    }

    const memberId = memberRecord.id || body.id;

    // Also auto-provision/sync UserModel credentials with universal default password '123'
    try {
      const defaultPasswordHash = await hashPassword('123');
      await UserModel.findOneAndUpdate(
        { email: cleanEmail },
        {
          $set: {
            id: memberId,
            name: name.trim(),
            email: cleanEmail,
            passwordHash: defaultPasswordHash,
            role,
            department: department.trim(),
            designation: designation.trim(),
            avatar: initials,
            isTwoFactorEnabled: false,
            hasCustomPassword: false,
            createdAt: new Date().toISOString(),
          }
        },
        { upsert: true, new: true }
      );
    } catch (userErr) {
      console.warn('[API/members POST] UserModel sync note:', userErr);
    }

    // DISPATCH OFFICIAL LIVE WELCOME EMAIL WITH ONBOARDING CREDENTIALS
    let emailDispatched = false;
    let emailMessageId: string | undefined;
    let isTestAccount = false;
    let emailError: string | undefined;

    try {
      const emailRes = await sendWelcomeCredentialsEmail({
        toEmail: cleanEmail,
        toName: name.trim(),
        department: department.trim(),
        designation: designation.trim(),
        role,
        initialPassword: '123',
      });
      emailDispatched = emailRes.success;
      emailMessageId = emailRes.messageId;
      isTestAccount = emailRes.isTestAccount;
      console.log(`[API/members POST] ✓ Official welcome email sent to ${cleanEmail} (msgId: ${emailMessageId})`);
    } catch (emailErr) {
      console.error('[API/members POST] ❌ Welcome email dispatch failed:', emailErr);
      emailError = emailErr instanceof Error ? emailErr.message : 'Unknown email dispatch error';
    }

    return NextResponse.json({
      success: true,
      data: memberRecord.toObject ? memberRecord.toObject() : memberRecord,
      emailDispatched,
      emailMessageId,
      isTestAccount,
      emailError,
      message: emailDispatched
        ? `Official account active and welcome credentials email dispatched to ${cleanEmail}`
        : `Official account active in database. Email note: ${emailError || 'pending'}`
    }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[API/members POST]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
