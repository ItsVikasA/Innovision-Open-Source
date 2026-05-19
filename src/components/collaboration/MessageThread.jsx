'use client';
import { useState, useEffect, useRef } from 'react';
import { useCollaboration } from '@/contexts/collaboration';
import { sendMessage } from '@/lib/message-store';
import { useAuth } from '@/contexts/auth';

export default function MessageThread() {
  const { messages, roomId } = useCollaboration();
  const { user } = useAuth();
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim()) return;
    await sendMessage(roomId, {
      content: text.trim(),
      authorId: user.uid,
      authorName: user.displayName || 'Anonymous',
      authorAvatar: user.photoURL || ''
    });
    setText('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-gray-400 text-sm text-center">No messages yet. Start the conversation!</p>
        )}
        {messages.map(msg => (
          <div key={msg.id} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs shrink-0">
              {msg.authorName?.[0]?.toUpperCase()}
            </div>
            <div>
              <div className="flex gap-2 items-baseline">
                <span className="font-medium text-sm">{msg.authorName}</span>
                <span className="text-xs text-gray-400">
                  {msg.timestamp?.toDate?.()?.toLocaleTimeString()}
                </span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">{msg.content}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="border-t p-3 flex gap-2">
        <input
          className="flex-1 border rounded px-3 py-2 text-sm"
          placeholder="Type a message..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button
          onClick={handleSend}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm"
        >
          Send
        </button>
      </div>
    </div>
  );
}
