/**
 * app/api/system-config/route.ts — Live Real-Time System Configuration API
 *
 * GET: Fetches current system configuration from MongoDB Atlas
 * POST: Persists changes (working days, email schedule, policies) in MongoDB Atlas
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { SystemConfigModel } from '@/models/SystemConfig';
import { AuditLogModel } from '@/models/AuditLog';
import { INITIAL_SYSTEM_CONFIG } from '@/shared/lib/mockData';
import type { SystemConfig } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    await connectDB();
    const doc = await SystemConfigModel.findOne({ key: 'global_system_config' }).lean();

    if (!doc || !doc.config) {
      // First time initialization in DB
      await SystemConfigModel.findOneAndUpdate(
        { key: 'global_system_config' },
        {
          key: 'global_system_config',
          config: INITIAL_SYSTEM_CONFIG,
          updatedAt: new Date().toISOString(),
          updatedBy: 'SYSTEM_INIT'
        },
        { upsert: true, new: true }
      );
      return NextResponse.json({ success: true, data: INITIAL_SYSTEM_CONFIG });
    }

    return NextResponse.json({ success: true, data: doc.config });
  } catch (err: any) {
    console.error('[API /api/system-config GET Error]:', err);
    return NextResponse.json({ success: true, data: INITIAL_SYSTEM_CONFIG, fallback: true });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { config, actor, actorRole, notes } = body;

    if (!config) {
      return NextResponse.json({ success: false, error: 'Config payload is required' }, { status: 400 });
    }

    // Fetch existing config
    const existing = await SystemConfigModel.findOne({ key: 'global_system_config' }).lean();
    const mergedConfig: SystemConfig = existing?.config
      ? { ...existing.config, ...config }
      : { ...INITIAL_SYSTEM_CONFIG, ...config };

    const now = new Date().toISOString();

    await SystemConfigModel.findOneAndUpdate(
      { key: 'global_system_config' },
      {
        key: 'global_system_config',
        config: mergedConfig,
        updatedAt: now,
        updatedBy: actor || 'Admin'
      },
      { upsert: true, new: true }
    );

    // Write Audit Log
    try {
      await AuditLogModel.create({
        id: `audit-cfg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: now,
        action: 'CONFIG_CHANGED',
        fieldChanged: 'System Configuration & Email Schedule Settings Updated',
        oldValue: JSON.stringify(existing?.config?.workingDays || INITIAL_SYSTEM_CONFIG.workingDays),
        newValue: JSON.stringify(mergedConfig.workingDays || []),
        actor: actor || 'Admin',
        actorRole: actorRole || 'SUPER_ADMIN',
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
        deviceInfo: req.headers.get('user-agent') || 'Browser Web Client',
        notes: notes || 'Updated working days / email schedule settings in real-time MongoDB Atlas'
      });
    } catch (auditErr) {
      console.warn('[Audit Log Write Warning]:', auditErr);
    }

    return NextResponse.json({ success: true, data: mergedConfig });
  } catch (err: any) {
    console.error('[API /api/system-config POST Error]:', err);
    return NextResponse.json({ success: false, error: err.message || 'Failed to update system config' }, { status: 500 });
  }
}
