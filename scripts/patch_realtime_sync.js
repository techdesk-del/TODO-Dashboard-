const fs = require('fs');
const path = require('path');

// 1. PATCH src/app/api/members/route.ts
const routePath = path.join(__dirname, '..', 'src', 'app', 'api', 'members', 'route.ts');
let routeContent = fs.readFileSync(routePath, 'utf8');

// A. In GET: remove syncOfficialRosterToDB
const getTarget = `    await seedMembersIfEmpty();\r\n    // Keep roster in sync with official designations and roles\r\n    await syncOfficialRosterToDB().catch(() => {});`;
const getTargetLF = `    await seedMembersIfEmpty();\n    // Keep roster in sync with official designations and roles\n    await syncOfficialRosterToDB().catch(() => {});`;
const getReplacement = `    await seedMembersIfEmpty();`;

if (routeContent.includes(getTarget)) {
  routeContent = routeContent.replace(getTarget, getReplacement);
  console.log('✓ Removed syncOfficialRosterToDB from GET (CRLF)');
} else if (routeContent.includes(getTargetLF)) {
  routeContent = routeContent.replace(getTargetLF, getReplacement);
  console.log('✓ Removed syncOfficialRosterToDB from GET (LF)');
} else {
  console.log('Note: GET syncOfficialRosterToDB pattern already updated or not found');
}

// B. In PATCH: robust lookup
const patchLookupTarget = `    const {
      id,
      email,
      name,
      department,
      designation,
      role,
      status,
      employeeId: inputEmployeeId,
      newEmployeeId,
      managerId,
      manager,
      managerEmail,
      reason,
      actor = 'Admin / Talent HR',
      actorRole = 'ADMIN',
      updateTaskAssignees = true,
    } = body;

    if (!id && !email) {
      return NextResponse.json({ success: false, error: 'Member ID or Email is required for updates.' }, { status: 400 });
    }

    const cleanInputEmail = email && typeof email === 'string' ? email.trim().toLowerCase() : '';
    let member = null;
    if (id && id !== 'guest') {
      member = await MemberModel.findOne({ id }).exec();
    }
    if (!member && cleanInputEmail) {
      member = await MemberModel.findOne({ email: cleanInputEmail }).exec();
    }

    if (!member) {
      return NextResponse.json({ success: false, error: \`Employee record was not found.\` }, { status: 404 });
    }

    const memberId = member.id;
    const oldEmail = member.email;
    const oldName = member.name;
    const oldRole = member.role;
    const updates: Record<string, unknown> = {};`;

const patchLookupReplacement = `    const {
      id,
      targetMemberId,
      memberId: paramMemberId,
      _id,
      email,
      currentEmail: inputCurrentEmail,
      oldEmail: inputOldEmail,
      name,
      department,
      designation,
      role,
      status,
      employeeId: inputEmployeeId,
      newEmployeeId,
      managerId,
      manager,
      managerEmail,
      reason,
      actor = 'Admin / Talent HR',
      actorRole = 'ADMIN',
      updateTaskAssignees = true,
    } = body;

    const lookupId = (targetMemberId || paramMemberId || id || '').trim();
    const currentEmail = (inputCurrentEmail || inputOldEmail || '').trim().toLowerCase();
    const cleanInputEmail = email && typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!lookupId && !_id && !currentEmail && !cleanInputEmail) {
      return NextResponse.json({ success: false, error: 'Member ID or Email is required for updates.' }, { status: 400 });
    }

    let member = null;
    if (_id) {
      member = await MemberModel.findById(_id).exec();
    }
    if (!member && lookupId && lookupId !== 'guest') {
      member = await MemberModel.findOne({
        $or: [{ id: lookupId }, { employeeId: lookupId }]
      }).exec();
    }
    if (!member && currentEmail) {
      member = await MemberModel.findOne({ email: currentEmail }).exec();
    }
    if (!member && cleanInputEmail) {
      member = await MemberModel.findOne({ email: cleanInputEmail }).exec();
    }

    if (!member) {
      return NextResponse.json({ success: false, error: \`Employee record was not found.\` }, { status: 404 });
    }

    const memberId = member.id;
    const oldEmail = member.email;
    const oldName = member.name;
    const oldRole = member.role;
    const updates: Record<string, unknown> = {};`;

// Normalize line endings for replacement
const normalizeCRLFs = (str) => str.replace(/\r\n/g, '\n');
const toCRLF = (str) => str.replace(/\r?\n/g, '\r\n');

if (normalizeCRLFs(routeContent).includes(normalizeCRLFs(patchLookupTarget))) {
  routeContent = toCRLF(normalizeCRLFs(routeContent).replace(normalizeCRLFs(patchLookupTarget), normalizeCRLFs(patchLookupReplacement)));
  console.log('✓ Updated PATCH lookup in route.ts');
} else {
  console.warn('Warning: Could not match patchLookupTarget in route.ts');
}

// C. In PATCH: broadcast oldMemberId
const broadcastTarget = `    broadcastMemberMutation({
      action: 'UPDATED',
      memberId: finalId,
      memberName: updatedMember?.name || oldName,
      memberEmail: updatedMember?.email || oldEmail,
      oldEmail: oldEmail,
      member: updatedMember
    });`;

const broadcastReplacement = `    broadcastMemberMutation({
      action: 'UPDATED',
      memberId: finalId,
      oldMemberId: memberId,
      memberName: updatedMember?.name || oldName,
      memberEmail: updatedMember?.email || oldEmail,
      oldEmail: oldEmail,
      member: updatedMember ? (updatedMember.toObject ? updatedMember.toObject() : updatedMember) : null
    });`;

if (normalizeCRLFs(routeContent).includes(normalizeCRLFs(broadcastTarget))) {
  routeContent = toCRLF(normalizeCRLFs(routeContent).replace(normalizeCRLFs(broadcastTarget), normalizeCRLFs(broadcastReplacement)));
  console.log('✓ Updated broadcastMemberMutation in route.ts');
}

fs.writeFileSync(routePath, routeContent, 'utf8');
console.log('✓ Saved route.ts');

