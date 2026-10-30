/**
 * app/api/tasks/route.ts
 * GET  /api/tasks        — fetch tasks (optional ?date=YYYY-MM-DD filter)
 * POST /api/tasks        — create a new task (seeds DB if empty)
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { TaskModel } from '@/models/Task';
import { MemberModel } from '@/models/Member';
import { PurgedMemberModel } from '@/models/PurgedMember';
import { AuditLogModel } from '@/models/AuditLog';
import { InAppNotificationModel } from '@/models/InAppNotification';
import { INITIAL_TASKS, INITIAL_MEMBERS } from '@/lib/mockData';
import { broadcastTaskMutation, isTaskDeleted, unmarkTaskDeleted, globalDeletedTaskIds } from '@/lib/events';
import { sendTaskAssignmentEmail } from '@/lib/email';
import { isStrictCeo, isCeoUser } from '@/lib/rosterData';
import { computeMultiAssigneeStatus } from '@/lib/multiAssignee';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/* ── Helpers ─────────────────────────────────────────────────────── */
let hasCheckedInitialSeed = false;

async function seedIfEmpty(forceSeed = false) {
  if (hasCheckedInitialSeed && !forceSeed) return;

  const memberCount = await MemberModel.countDocuments();
  if (memberCount === 0) {
    const purgedRecords = await PurgedMemberModel.find({}).lean().exec();
    const purgedIds = new Set(purgedRecords.map(p => p.id));
    const purgedEmails = new Set(purgedRecords.map(p => p.email.toLowerCase().trim()));
    const allowed = INITIAL_MEMBERS.filter(m => !purgedIds.has(m.id) && !purgedEmails.has(m.email.toLowerCase().trim()));
    if (allowed.length > 0) {
      await MemberModel.insertMany(allowed, { ordered: false });
    }
    console.log(`[API/tasks] ✓ Seeded ${allowed.length} members`);
  }

  if (forceSeed) {
    const count = await TaskModel.countDocuments();
    if (count === 0) {
      await TaskModel.insertMany(INITIAL_TASKS, { ordered: false });
      console.log(`[API/tasks] ✓ Seeded ${INITIAL_TASKS.length} tasks`);
    }
  }

  hasCheckedInitialSeed = true;
}

/* ── GET /api/tasks ──────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const t0 = Date.now();
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const shouldSeed = searchParams.get('seed') === 'true';
    await seedIfEmpty(shouldSeed);
    const date       = searchParams.get('date');       // YYYY-MM-DD
    const assigneeId = searchParams.get('assigneeId'); // member drilldown
    const status     = searchParams.get('status');     // filter by status
    const assignedTo = searchParams.get('assignedTo'); // Flowchart 6 "Assigned to" filter
    const assignedBy = searchParams.get('assignedBy'); // Flowchart 6 "Assigned by" filter

    // Build query dynamically
    const query: Record<string, unknown> = {};
    if (date)       query['scheduledDate'] = date;
    if (assigneeId) query['assignees.id']  = assigneeId;
    if (status)     query['status']        = status;

    if (assignedTo) {
      query['assignees'] = {
        $elemMatch: {
          $or: [
            { id: assignedTo },
            { name: { $regex: new RegExp(`^${assignedTo}$`, 'i') } },
            { email: { $regex: new RegExp(`^${assignedTo}$`, 'i') } },
          ]
        }
      };
    }

    if (assignedBy) {
      query['$or'] = [
        { 'creator.id': assignedBy },
        { 'creator.name': { $regex: new RegExp(`^${assignedBy}$`, 'i') } },
        { 'creator.email': { $regex: new RegExp(`^${assignedBy}$`, 'i') } },
      ];
    }

    const tasks = await TaskModel
      .find(query)
      .sort({ createdAt: 1, updatedAt: 1 }) // Chronological FIFO: starting task at top, top-to-bottom sequence
      .lean()     // Returns plain JS objects (faster, no Mongoose overhead)
      .exec();

    // Guard against race conditions / replication lag & sanitize isJustAdded
    const validTasks = tasks.filter(t => !isTaskDeleted(t.id)).map(t => ({
      ...t,
      isJustAdded: false // Stored tasks are persistent, never 'Just Added'
    }));

    // Asynchronous background sanitization of legacy records in MongoDB
    TaskModel.updateMany({ isJustAdded: true }, { $set: { isJustAdded: false } }).catch(() => {});

    return NextResponse.json({
      success:  true,
      data:     validTasks,
      meta: {
        count:    tasks.length,
        latencyMs: Date.now() - t0,
        database: 'MongoDB Atlas',
        cached:   false,
      },
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[API/tasks GET]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/* ── POST /api/tasks ─────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const t0 = Date.now();
  try {
    await connectDB();
    await seedIfEmpty();

    const body = await req.json();

    // Executive role guard: CEO role is restricted to deliverable monitoring & governance
    if (body.creator && isStrictCeo(body.creator)) {
      return NextResponse.json(
        {
          success: false,
          error: 'CEO executive account is reserved for deliverable monitoring & governance. Direct task creation is disabled for this role.',
        },
        { status: 403 }
      );
    }

    // Mandatory fields check per Flowchart 6: "All mandatory fields filled?"
    const missing: string[] = [];
    if (!body.title || !body.title.trim()) missing.push('title');
    if (!body.scheduledDate) missing.push('scheduledDate');
    if (!body.priority) missing.push('priority');
    if (!body.department) missing.push('department');
    if (!body.project || !body.project.trim()) {
      body.project = 'General Operations';
    }
    if (!body.location || !body.location.trim()) {
      body.location = 'Jaipur';
    }
    if (!body.assignees || !Array.isArray(body.assignees) || body.assignees.length === 0) {
      missing.push('assignees');
    }

    // Past due date evaluation per Flowchart 6: "Past due date? -> Require reason for past due date"
    const todayStr = new Date().toISOString().slice(0, 10);
    const isPastDue = body.scheduledDate && body.scheduledDate < todayStr;
    if (isPastDue && (!body.pastDueReason || !body.pastDueReason.trim())) {
      missing.push('pastDueReason');
    }

    if (missing.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Mandatory fields missing: ${missing.join(', ')}`,
          missingFields: missing,
          isPastDue,
        },
        { status: 400 }
      );
    }

    // Generate unique task ID if not provided
    const taskId = body.id || `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // Flowchart 6: "Set initial status to Not Started"
    const initialStatus = body.status || 'Not Started';

    // Flowchart 6: "One entry per assignee created in Task_assignees" (status: 'Not Started')
    const normalizedAssignees = body.assignees.map((a: any) => ({
      id: a.id || `mem-${Math.random().toString(36).slice(2, 7)}`,
      name: a.name || 'Team Member',
      avatar: a.avatar || (a.name ? a.name.slice(0, 2).toUpperCase() : 'TM'),
      role: a.role || 'MEMBER',
      status: a.status || 'Not Started',
      department: a.department || body.department || 'General',
      designation: a.designation || 'Specialist',
      email: a.email || `${(a.name || 'user').toLowerCase().replace(/[^a-z0-9]/g, '.')}@urbangaon.com`,
    }));

    // Reset any tombstone for newly created task
    unmarkTaskDeleted(taskId);

    const taskPayload = {
      id: taskId,
      title: body.title.trim(),
      description: body.description?.trim() || '',
      scheduledDate: body.scheduledDate,
      dueDate: body.dueDate || body.scheduledDate,
      time: body.time || '09:00 AM',
      priority: body.priority,
      status: initialStatus,
      project: body.project,
      location: body.location,
      department: body.department,
      creator: body.creator || {
        id: 'mem-ops-admin',
        name: 'Operations Admin',
        email: 'ops@urbangaon.com',
        role: 'ADMIN',
        avatar: 'OA',
      },
      assignees: normalizedAssignees,
      notes: body.notes?.trim() || '',
      pastDueReason: isPastDue ? body.pastDueReason.trim() : (body.pastDueReason?.trim() || ''),
      inputMethod: body.inputMethod || 'Type',
      requiresCeoApproval: true,
      isJustAdded: false,
      updatedAt: new Date().toISOString(),
      createdAt: body.createdAt || new Date().toISOString(),
    };

    const task = await TaskModel.findOneAndUpdate(
      { id: taskId },
      { $set: taskPayload },
      { upsert: true, new: true, lean: true }
    );
    const savedTask = task || taskPayload;

    // Flowchart 6: "Audit log entry created"
    const creatorName = taskPayload.creator?.name || 'Employee';
    const creatorRole = taskPayload.creator?.role || 'EMPLOYEE';
    const creatorEmail = (taskPayload.creator?.email || req.headers.get('x-user-email') || '').toLowerCase().trim();

    await AuditLogModel.create({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      taskId: savedTask.id,
      taskTitle: savedTask.title,
      action: 'CREATED',
      fieldChanged: 'Task Created',
      oldValue: 'None',
      newValue: `Status: ${savedTask.status} | Priority: ${savedTask.priority} | Assignees: ${normalizedAssignees.map((a: any) => a.name).join(', ')}`,
      actor: creatorName,
      actorRole: creatorRole,
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
      deviceInfo: req.headers.get('user-agent') || 'Employee Dashboard',
      notes: `Task created. Initial Status: ${savedTask.status}. Project: ${savedTask.project}, Dept: ${savedTask.department}, Location: ${savedTask.location}${savedTask.pastDueReason ? `. Past due justification: ${savedTask.pastDueReason}` : ''}`,
    }).catch(err => console.error('[API/tasks POST AuditLog]', err));

    // Deduplicate assignees by email
    const seenAssigneeEmails = new Set<string>();
    const uniqueAssignees: Array<{ name: string; email: string }> = [];
    for (const a of normalizedAssignees) {
      const email = (a.email || '').toLowerCase().trim();
      if (email && !seenAssigneeEmails.has(email)) {
        seenAssigneeEmails.add(email);
        uniqueAssignees.push({ name: a.name || 'Team Member', email });
      }
    }

    // In-app notifications for all assigned team members
    for (const assignee of uniqueAssignees) {
      InAppNotificationModel.create({
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        recipientEmail: assignee.email,
        recipientName: assignee.name,
        title: `New Deliverable: "${savedTask.title}"`,
        message: `Assigned by ${creatorName} • Priority: ${savedTask.priority} • Scheduled: ${savedTask.scheduledDate}`,
        type: 'TASK_ASSIGNED',
        taskId: savedTask.id,
        read: false,
        createdAt: new Date().toISOString(),
      }).catch(err => console.debug('[InAppNotification Create Error]', err));
    }

    // Rule: When assigning to someone else (or Both), notify only the other assigned member(s).
    // The creator only receives a notification if the deliverable is solely self-assigned.
    const otherAssignees = uniqueAssignees.filter(a => a.email !== creatorEmail);
    const assigneesToEmail = otherAssignees.length > 0 ? otherAssignees : uniqueAssignees;

    if (assigneesToEmail.length > 0) {
      sendTaskAssignmentEmail({
        taskTitle: savedTask.title,
        taskId: savedTask.id,
        assignees: assigneesToEmail,
        creatorName: creatorName,
        creatorRole: creatorRole,
        creatorEmail: creatorEmail,
        priority: savedTask.priority,
        scheduledDate: savedTask.scheduledDate,
        time: savedTask.time,
        department: savedTask.department,
        project: savedTask.project,
        location: savedTask.location,
        notes: savedTask.notes || savedTask.description,
        pastDueReason: savedTask.pastDueReason,
      }).catch(err => console.error('[API/tasks POST Email]', err));
    }

    // Broadcast instant real-time event to all connected devices worldwide
    broadcastTaskMutation({
      action: 'CREATED',
      taskId: savedTask.id,
      taskTitle: savedTask.title,
      task: savedTask,
    });

    return NextResponse.json({
      success:  true,
      data:     savedTask,
      latencyMs: Date.now() - t0,
    }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[API/tasks POST]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/* ── PATCH /api/tasks (Update deliverable by ?id=... or body.id) ──── */
export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const id = (searchParams.get('id') || body.id || body.taskId || '').trim();

    if (!id) {
      return NextResponse.json({ success: false, error: 'Task ID is required' }, { status: 400 });
    }

    delete body.id;
    delete body.taskId;

    let existingTask = await TaskModel.findOne({ id }).lean();
    if (!existingTask) {
      if (body.fullTask && body.fullTask.title) {
        const toInsert = {
          ...body.fullTask,
          id,
          scheduledDate: body.fullTask.scheduledDate || new Date().toISOString().slice(0, 10),
          time: body.fullTask.time || '05:00 PM',
          priority: body.fullTask.priority || 'NORMAL',
          status: body.fullTask.status || 'Not Started',
          department: body.fullTask.department || 'General',
          creator: body.fullTask.creator || {
            id: 'mem-ops-admin',
            name: 'Operations Admin',
            email: 'ops@urbangaon.com',
            role: 'ADMIN',
            avatar: 'OA',
          },
          createdAt: body.fullTask.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        delete toInsert.actor;
        delete toInsert.actorRole;
        delete toInsert.fullTask;
        const created = await TaskModel.create(toInsert);
        existingTask = created.toObject();
      } else {
        return NextResponse.json({ success: false, error: `Task '${id}' not found in database.` }, { status: 404 });
      }
    }

    const hasAssignees = (body.assignees && Array.isArray(body.assignees)) || (existingTask.assignees && existingTask.assignees.length > 0);
    if ((body.status === 'In Progress' || body.status === 'Not Started') && !body.assignees && existingTask.assignees && Array.isArray(existingTask.assignees)) {
      body.assignees = existingTask.assignees.map((a: any) =>
        a.status === 'Done' ? { ...a, status: body.status, completedAt: undefined } : a
      );
      body.pendingCeoApproval = false;
    }
    if (body.scheduledDate) {
      if (!body.dueDate) {
        body.dueDate = body.scheduledDate;
      }
      const todayIso = new Date().toISOString().slice(0, 10);
      if (body.scheduledDate >= todayIso) {
        body.isOverdue = false;
        body.isPendingNoReason = false;
        body.overdueDays = 0;
      }
    }
    if (hasAssignees && !body.status) {
      const mergedForCompute = { ...existingTask, ...body };
      const comp = computeMultiAssigneeStatus(mergedForCompute);
      body.status = comp.status;
      body.progressPercent = comp.progressPercent;
    }

    const actorInput = body.actor;
    const actorRoleInput = body.actorRole;
    delete body.actor;
    delete body.actorRole;
    delete body.fullTask;

    const actorRole = (typeof actorInput === 'object' && actorInput?.role)
      || req.headers.get('x-user-role')
      || actorRoleInput
      || 'EMPLOYEE';

    if (actorRole === 'ADMIN' || actorRole === 'SUPER_ADMIN' || body.editedByAdmin) {
      body.editedByAdmin = true;
    }

    // Extract caller info from body or headers
    const actorEmail = (body.actorEmail || req.headers.get('x-user-email') || (typeof actorInput === 'object' ? actorInput?.email : '') || '').toLowerCase().trim();
    const actorId = body.actorId || req.headers.get('x-user-id') || (typeof actorInput === 'object' ? actorInput?.id : '') || '';
    const callerName = (typeof actorInput === 'string' ? actorInput : actorInput?.name) || req.headers.get('x-user-name') || '';
    delete body.actorEmail;
    delete body.actorId;

    const isCallerCeo = isCeoUser({ id: actorId, name: callerName, email: actorEmail, role: actorRole })
      || isStrictCeo({ id: actorId, name: callerName, email: actorEmail, role: actorRole })
      || actorEmail === 'ceo@urbangaon.com'
      || actorEmail.includes('ceo@')
      || callerName.toLowerCase().includes('sukh')
      || (actorRole === 'SUPER_ADMIN' && (callerName.toLowerCase().includes('sukh') || callerName.toLowerCase().includes('aakash') || actorEmail.includes('techdesk')))
      || Boolean(body.ceoApprovedAt || body.ceoApprovedBy || body.pendingCeoApproval === false);

    const isCallerAdminOrCeo = actorRole === 'ADMIN' || actorRole === 'SUPER_ADMIN' || isCallerCeo;

    // Authorization: Only Admin, Super Admin, and CEO can cancel tasks
    if (body.status === 'Cancelled' && existingTask.status !== 'Cancelled' && !isCallerAdminOrCeo) {
      return NextResponse.json({ success: false, error: 'Access Denied: Only Admin, Super Admin, and CEO have permission to cancel deliverables.' }, { status: 403 });
    }

    // Executive Governance Rule: Final Approval to Sukh Sagar Sir before completing any deliverable
    if (body.status === 'Done') {
      if (!isCallerCeo && existingTask.status !== 'Done') {
        // Employee submitted completion -> Reroute to CEO Final Approval queue
        body.status = 'Review';
        body.pendingCeoApproval = true;
        body.ceoApprovalRequestedAt = new Date().toISOString();
        body.ceoApprovalRequestedBy = callerName || 'Staff Member';
      } else {
        // CEO Final Approval Granted or Super Admin direct completion
        body.status = 'Done';
        body.pendingCeoApproval = false;
        body.progressPercent = 100;
        body.isOverdue = false;
        body.isPendingNoReason = false;
        body.overdueDays = 0;
        if (!body.ceoApprovedAt) body.ceoApprovedAt = new Date().toISOString();
        if (!body.ceoApprovedBy) body.ceoApprovedBy = callerName || 'Mr. Sukh Sagar Singh Bhati (CEO)';
        if (body.assignees && Array.isArray(body.assignees)) {
          body.assignees = body.assignees.map((a: any) => ({
            ...a,
            status: 'Done',
            completedAt: a.completedAt || new Date().toISOString()
          }));
        }
      }
    }

    const updated = await TaskModel.findOneAndUpdate(
      { id },
      { $set: { ...body, updatedAt: new Date().toISOString() } },
      { new: true, lean: true }
    );

    broadcastTaskMutation({
      action: 'UPDATED',
      taskId: id,
      taskTitle: (updated as any)?.title || id,
      task: updated,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/* ── DELETE /api/tasks ───────────────────────────────────────────── */
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const singleId = searchParams.get('id') || searchParams.get('taskId');
    const callerName = req.headers.get('x-user-name') || 'Mr. Sukh Sagar Singh Bhati';
    const callerRole = (req.headers.get('x-user-role') as 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE') || 'SUPER_ADMIN';

    if (singleId) {
      const deleted = await TaskModel.findOneAndDelete({ id: singleId }).lean();
      if (!deleted) {
        return NextResponse.json({ success: false, error: `Task '${singleId}' not found` }, { status: 404 });
      }
      globalDeletedTaskIds.add(singleId);
      broadcastTaskMutation({ action: 'DELETED', taskId: singleId, taskTitle: (deleted as any)?.title || singleId });
      return NextResponse.json({ success: true, message: `Task '${singleId}' permanently deleted` });
    }

    const result = await TaskModel.deleteMany({});
    console.log(`[API/tasks DELETE] Cleared ${result.deletedCount} tasks from MongoDB Atlas by ${callerName}`);

    // Reset tombstone set
    globalDeletedTaskIds.clear();

    await AuditLogModel.create({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      taskId: 'all',
      taskTitle: 'All Deliverables',
      action: 'DELETED',
      fieldChanged: 'Task Ledger Wipe',
      oldValue: `${result.deletedCount} tasks`,
      newValue: '0 tasks',
      actor: callerName,
      actorRole: callerRole,
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
      deviceInfo: req.headers.get('user-agent') || 'System Engine',
      notes: `Cleared ${result.deletedCount} tasks from MongoDB Atlas by CEO Mr. Sukh Sagar Singh Bhati`,
    }).catch(() => {});

    // Broadcast mutation to instantly notify all devices in real-time
    broadcastTaskMutation({ action: 'DELETED_ALL', taskId: 'all', taskTitle: 'All Deliverables' });

    return NextResponse.json({
      success: true,
      message: `Cleared ${result.deletedCount} tasks from MongoDB Atlas`,
      deletedCount: result.deletedCount,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[API/tasks DELETE]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
