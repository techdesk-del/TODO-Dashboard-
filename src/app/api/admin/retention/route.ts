/**
 * app/api/admin/retention/route.ts
 *
 * GET & POST: Data Retention & Archive Evaluation API
 * Implements full 4-branch lifecycle flow:
 * - Completed tasks -> Move to archive table, keep summary only
 * - Audit logs -> Move to cold storage, keep 7 years
 * - Email logs -> Delete after 1 year, keep summary counts
 * - Inactive users -> Anonymise personal data, keep history
 * - Audit log entry created
 * - Notify Super Admin of archive run
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeDataRetention } from '@/lib/retentionEngine';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const taskRetentionDays = searchParams.get('taskRetentionDays')
      ? parseInt(searchParams.get('taskRetentionDays')!, 10)
      : 365;
    const auditRetentionDays = searchParams.get('auditRetentionDays')
      ? parseInt(searchParams.get('auditRetentionDays')!, 10)
      : 730;
    const emailRetentionDays = searchParams.get('emailRetentionDays')
      ? parseInt(searchParams.get('emailRetentionDays')!, 10)
      : 365;
    const inactiveRetentionDays = searchParams.get('inactiveRetentionDays')
      ? parseInt(searchParams.get('inactiveRetentionDays')!, 10)
      : 180;

    const result = await executeDataRetention({
      taskRetentionDays,
      auditRetentionDays,
      emailRetentionDays,
      inactiveRetentionDays,
      actor: 'Admin Retention API (Data Retention Engine)',
      actorRole: 'ADMIN'
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: `Data retention completed. Archived ${result.archivedTasksCount} tasks, moved ${result.coldStorageAuditLogsCount} audit logs to 7-yr cold storage, deleted ${result.deletedEmailLogsCount} emails (summary saved), anonymized ${result.anonymizedUsersCount} inactive users. Notified ${result.superAdminNotifiedCount} Super Admins.`
    });
  } catch (error: any) {
    console.error('[API /api/admin/retention GET Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Data retention execution failed' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {}

    const taskRetentionDays = typeof body.taskRetentionDays === 'number' ? body.taskRetentionDays : 365;
    const auditRetentionDays = typeof body.auditRetentionDays === 'number' ? body.auditRetentionDays : 730;
    const emailRetentionDays = typeof body.emailRetentionDays === 'number' ? body.emailRetentionDays : 365;
    const inactiveRetentionDays = typeof body.inactiveRetentionDays === 'number' ? body.inactiveRetentionDays : 180;

    const result = await executeDataRetention({
      taskRetentionDays,
      auditRetentionDays,
      emailRetentionDays,
      inactiveRetentionDays,
      actor: body.actor || 'Super Admin Manual Trigger (Data Retention Engine)',
      actorRole: body.actorRole || 'SUPER_ADMIN'
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: `Data retention completed. Archived ${result.archivedTasksCount} tasks, moved ${result.coldStorageAuditLogsCount} audit logs to 7-yr cold storage, deleted ${result.deletedEmailLogsCount} emails (summary saved), anonymized ${result.anonymizedUsersCount} inactive users. Notified ${result.superAdminNotifiedCount} Super Admins.`
    });
  } catch (error: any) {
    console.error('[API /api/admin/retention POST Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Data retention execution failed' },
      { status: 500 }
    );
  }
}
