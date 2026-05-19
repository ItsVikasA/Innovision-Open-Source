'use client';
import { useCollaboration } from '@/contexts/collaboration';

export default function PresenceIndicator() {
  const { presence } = useCollaboration();
  const online = presence.filter(u => u.online);

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
      <span>{online.length} online</span>
      <div className="flex -space-x-2">
        {online.slice(0, 5).map(u => (
          <div key={u.userId}
            className="w-7 h-7 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-white text-xs"
            title={u.userId}>
            {u.userId[0]?.toUpperCase()}
          </div>
        ))}
      </div>
    </div>
  );
}
