import { NextResponse } from 'next/server';
import { createRoom, getRoom } from '@/lib/collaboration-service';

export async function POST(req) {
  try {
    const body = await req.json();
    const roomId = await createRoom(body);
    return NextResponse.json({ roomId });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get('roomId');
  if (!roomId) return NextResponse.json({ error: 'roomId required' }, { status: 400 });
  const room = await getRoom(roomId);
  return NextResponse.json(room);
}
