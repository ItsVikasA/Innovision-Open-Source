import { NextResponse } from 'next/server';
import { sendMessage } from '@/lib/message-store';

export async function POST(req) {
  try {
    const { roomId, content, authorId, authorName, authorAvatar } = await req.json();

    if (!roomId || !content || !authorId) {
      return NextResponse.json(
        { error: 'Missing required fields: roomId, content, authorId' },
        { status: 400 }
      );
    }

    await sendMessage(roomId, {
      content: content.trim(),
      authorId,
      authorName: authorName || 'Anonymous',
      authorAvatar: authorAvatar || '',
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
