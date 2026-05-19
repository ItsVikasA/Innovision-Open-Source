import { NextResponse } from 'next/server';
import { logActivity } from '@/lib/activity-stream';

export async function POST(req) {
  try {
    const { userId, type, metadata = {} } = await req.json();

    if (!userId || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, type' },
        { status: 400 }
      );
    }

    const validTypes = ['message', 'code_push', 'pr_created', 'issue_resolved', 'collaboration_started'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid activity type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    await logActivity(userId, { type, metadata });

    return NextResponse.json({ success: true, type, timestamp: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
