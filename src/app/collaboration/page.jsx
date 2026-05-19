'use client';
import { useState } from 'react';
import WorkspacePanel from '@/components/collaboration/WorkspacePanel';
import ContributorActivityFeed from '@/components/collaboration/ContributorActivityFeed';
import ContributorDirectory from '@/components/collaboration/ContributorDirectory';
import { Users, Activity, MessageSquare } from 'lucide-react';

export default function CollaborationPage() {
  const [roomId, setRoomId] = useState('general');
  const [activeTab, setActiveTab] = useState('chat');
  const rooms = ['general', 'architecture', 'issues', 'announcements'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-gray-900 dark:text-white">
            Collaboration Workspace
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time communication hub for contributors and maintainers
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Rooms */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Rooms
                </h2>
              </div>
              <div className="p-2 space-y-1">
                {rooms.map(room => (
                  <button
                    key={room}
                    onClick={() => setRoomId(room)}
                    className={`w-full text-left px-3 py-2 rounded text-sm capitalize transition-colors ${
                      roomId === room
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    #{room}
                  </button>
                ))}
              </div>
            </div>

            {/* Right Sidebar - Tabs Selector for Mobile */}
            <div className="lg:hidden mt-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2 flex gap-2">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-2 rounded text-xs font-medium transition-colors ${
                  activeTab === 'chat'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`flex-1 py-2 rounded text-xs font-medium transition-colors ${
                  activeTab === 'activity'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Activity
              </button>
              <button
                onClick={() => setActiveTab('contributors')}
                className={`flex-1 py-2 rounded text-xs font-medium transition-colors ${
                  activeTab === 'contributors'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Team
              </button>
            </div>
          </div>

          {/* Middle - Chat */}
          <div className={`lg:col-span-2 ${activeTab !== 'chat' && 'hidden lg:block'}`}>
            <WorkspacePanel roomId={roomId} title={`#${roomId}`} />
          </div>

          {/* Right Sidebar - Activity & Contributors */}
          <div className={`lg:col-span-1 space-y-4 ${activeTab !== 'activity' && activeTab !== 'contributors' && 'hidden lg:block'}`}>
            {/* Show activity by default, but allow switching on mobile */}
            {(activeTab === 'activity' || activeTab === 'chat') && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Activity
                  </h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  <ContributorActivityFeed limit={8} />
                </div>
              </div>
            )}

            {/* Contributors on mobile when selected, always visible on desktop */}
            {(activeTab === 'contributors' || window.innerWidth >= 1024) && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Contributors
                  </h3>
                </div>
                <div className="p-4 max-h-96 overflow-y-auto">
                  <ContributorDirectory />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info Banner */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            💡 <strong>Tip:</strong> Open this page in multiple tabs to test real-time collaboration. Send a message in one tab and watch it appear instantly in the other!
          </p>
        </div>
      </div>
    </div>
  );
}
