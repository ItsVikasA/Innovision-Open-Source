'use client';
import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import MessageThread from './MessageThread';
import PresenceIndicator from './PresenceIndicator';

export default function IssueLinkedChannel({ issueId, issueTitle }) {
  const [roomId, setRoomId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Create or retrieve room for this issue
    if (issueId) {
      // Generate consistent room ID based on issue
      const generatedRoomId = `issue-${issueId}`;
      setRoomId(generatedRoomId);
      setLoading(false);
    }
  }, [issueId]);

  if (loading) {
    return <div className="text-center py-8 text-gray-400">Loading channel...</div>;
  }

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50 dark:bg-gray-800">
        <div>
          <h3 className="font-semibold text-sm">
            {issueTitle || 'Issue Discussion'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            #{issueId}
          </p>
        </div>
        <PresenceIndicator />
      </div>

      <div className="flex-1 overflow-hidden">
        {roomId && (
          <MessageThread />
        )}
      </div>
    </div>
  );
}
