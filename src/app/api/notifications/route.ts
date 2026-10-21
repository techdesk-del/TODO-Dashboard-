/**
 * app/api/notifications/route.ts — In-App Notifications API (Flowchart 20)
 * GET: Fetch unread and recent in-app notifications for employee
 * PATCH: Mark notification as read (or all as read)
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { InAppNotificationModel } from '@/models/InAppNotification';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ success: true, data: [], unreadCount: 0 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Fetch recent 40 notifications
    const notifications = await InAppNotificationModel.find({
      recipientEmail: cleanEmail,
    })
      .sort({ createdAt: -1 })
      .limit(40)
      .lean()
      .exec();

    const unreadCount = await InAppNotificationModel.countDocuments({
      recipientEmail: cleanEmail,
      read: false,
    });

    return NextResponse.json({
      success: true,
      data: notifications,
      unreadCount,
    });
  } catch (error: any) {
    console.error('[API /api/notifications GET Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { notificationId, email, markAllRead } = body;

    if (markAllRead && email) {
      await InAppNotificationModel.updateMany(
        { recipientEmail: email.trim().toLowerCase(), read: false },
        { $set: { read: true } }
      );
      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    if (notificationId) {
      await InAppNotificationModel.updateOne(
        { id: notificationId },
        { $set: { read: true } }
      );
      return NextResponse.json({ success: true, message: 'Notification marked as read' });
    }

    return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
  } catch (error: any) {
    console.error('[API /api/notifications PATCH Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update notification' },
      { status: 500 }
    );
  }
}
