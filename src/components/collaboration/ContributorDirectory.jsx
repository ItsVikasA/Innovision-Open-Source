'use client';
import { useState, useEffect } from 'react';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function ContributorDirectory() {
  const [contributors, setContributors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchContributors = async () => {
      try {
        // Fetch presence data to show active contributors
        const presenceSnap = await getDocs(collection(db, 'presence'));
        const contributorMap = new Map();

        presenceSnap.forEach(roomDoc => {
          const roomId = roomDoc.id;
          roomDoc.forEach(userDoc => {
            const userId = userDoc.id;
            const data = userDoc.data();

            if (!contributorMap.has(userId)) {
              contributorMap.set(userId, {
                userId,
                online: data.online,
                lastSeen: data.lastSeen,
                status: data.status,
                rooms: [roomId],
              });
            } else {
              const contrib = contributorMap.get(userId);
              contrib.rooms.push(roomId);
              if (data.online) contrib.online = true;
            }
          });
        });

        setContributors(Array.from(contributorMap.values()));
        setLoading(false);
      } catch (err) {
        console.error('Error fetching contributors:', err);
        setLoading(false);
      }
    };

    fetchContributors();
  }, []);

  const filtered = filter === 'online'
    ? contributors.filter(c => c.online)
    : contributors;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded text-sm ${
            filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          All ({contributors.length})
        </button>
        <button
          onClick={() => setFilter('online')}
          className={`px-3 py-1 rounded text-sm ${
            filter === 'online' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          Online ({contributors.filter(c => c.online).length})
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading contributors...</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(contributor => (
            <div
              key={contributor.userId}
              className="flex items-center gap-3 p-3 rounded border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <div className={`w-3 h-3 rounded-full ${
                contributor.online ? 'bg-green-500' : 'bg-gray-400'
              }`} />
              <div className="flex-1">
                <p className="font-medium text-sm">{contributor.userId}</p>
                <p className="text-xs text-gray-500">
                  {contributor.status || 'collaborating'} in {contributor.rooms.length} room(s)
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
