import { NextResponse } from 'next/server';
import { setPresence, setOffline } from '@/lib/presence-manager';

export async function POST(req) {
  try {
    const { roomId, userId, status = 'active', online = true } = await req.json();

    if (!roomId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: roomId, userId' },
        { status: 400 }
      );
    }

    if (online) {
      await setPresence(roomId, userId, status);
    } else {
      await setOffline(roomId, userId);
    }

    return NextResponse.json({ success: true, online, status });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
