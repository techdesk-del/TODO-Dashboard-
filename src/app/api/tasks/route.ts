/**
 * app/api/tasks/route.ts
 * GET  /api/tasks        — fetch tasks (optional ?date=YYYY-MM-DD filter)
 * POST /api/tasks        — create a new task (seeds DB if empty)
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { TaskModel } from '@/models/Task';
import { MemberModel } from '@/models/Member';
import { AuditLogModel } from '@/models/AuditLog';
import { INITIAL_TASKS, INITIAL_MEMBERS } from '@/lib/mockData';
import { broadcastTaskMutation, isTaskDeleted, unmarkTaskDeleted, globalDeletedTaskIds } from '@/lib/events';
import { sendTaskAssignmentEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/* ── Helpers ─────────────────────────────────────────────────────── */
let hasCheckedInitialSeed = false;

async function seedIfEmpty(forceSeed = false) {
  if (hasCheckedInitialSeed && !forceSeed) return;

  const memberCount = await MemberModel.countDocuments();
  if (memberCount === 0) {
    await MemberModel.insertMany(INITIAL_MEMBERS, { ordered: false });
    console.log(`[API/tasks] ✓ Seeded ${INITIAL_MEMBERS.length} members`);
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

    // Mandatory fields check per Flowchart 6: "All mandatory fields filled?"
    const missing: string[] = [];
    if (!body.title || !body.title.trim()) missing.push('title');
    if (!body.scheduledDate) missing.push('scheduledDate');
    if (!body.priority) missing.push('priority');
    if (!body.department) missing.push('department');
    if (!body.project) missing.push('project');
    if (!body.location) missing.push('location');
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
      time: body.time || '09:00 AM',
      priority: body.priority,
      status: initialStatus,
      project: body.project,
      location: body.location,
      department: body.department,
      creator: body.creator || {
        id: 'mem-exec',
        name: 'Mr. Sukh Sagar Singh Bhati',
        email: 'ceo@urbangaon.com',
        role: 'SUPER_ADMIN',
        avatar: 'SS',
      },
      assignees: normalizedAssignees,
      notes: body.notes?.trim() || '',
      pastDueReason: isPastDue ? body.pastDueReason.trim() : (body.pastDueReason?.trim() || ''),
      inputMethod: body.inputMethod || 'Type',
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
    await AuditLogModel.create({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      taskId: savedTask.id,
      taskTitle: savedTask.title,
      action: 'CREATED',
      fieldChanged: 'Task Created (Flowchart 6)',
      oldValue: 'None',
      newValue: `Status: ${savedTask.status} | Priority: ${savedTask.priority} | Assignees: ${normalizedAssignees.map((a: any) => a.name).join(', ')}`,
      actor: creatorName,
      actorRole: creatorRole,
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
      deviceInfo: req.headers.get('user-agent') || 'Employee Dashboard',
      notes: `Task created via Flowchart 6 lifecycle. Initial Status: ${savedTask.status}. Project: ${savedTask.project}, Dept: ${savedTask.department}, Location: ${savedTask.location}${savedTask.pastDueReason ? `. Past due justification: ${savedTask.pastDueReason}` : ''}`,
    }).catch(err => console.error('[API/tasks POST AuditLog]', err));

    // Flowchart 6: "Send instant in-app and email notification to all assignees"
    sendTaskAssignmentEmail({
      taskTitle: savedTask.title,
      taskId: savedTask.id,
      assignees: normalizedAssignees.map((a: any) => ({ name: a.name, email: a.email })),
      creatorName: creatorName,
      creatorRole: creatorRole,
      priority: savedTask.priority,
      scheduledDate: savedTask.scheduledDate,
      department: savedTask.department,
      project: savedTask.project,
      location: savedTask.location,
      notes: savedTask.notes || savedTask.description,
      pastDueReason: savedTask.pastDueReason,
    }).catch(err => console.error('[API/tasks POST Email]', err));

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

/* ── DELETE /api/tasks (Clear all deliverables for fresh testing) ── */
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const callerName = req.headers.get('x-user-name') || 'Mr. Sukh Sagar Singh Bhati';
    const callerRole = (req.headers.get('x-user-role') as 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE') || 'SUPER_ADMIN';

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
