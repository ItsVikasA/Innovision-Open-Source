'use client';
import { CollaborationProvider } from '@/contexts/collaboration';
import MessageThread from './MessageThread';
import PresenceIndicator from './PresenceIndicator';

export default function WorkspacePanel({ roomId, title = 'Collaboration' }) {
  return (
    <CollaborationProvider roomId={roomId}>
      <div className="flex flex-col h-[600px] border rounded-lg overflow-hidden bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50 dark:bg-gray-800">
          <h3 className="font-semibold text-sm">{title}</h3>
          <PresenceIndicator />
        </div>
        <MessageThread />
      </div>
    </CollaborationProvider>
  );
}
