'use client';
import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function ContributorActivityFeed({ limit = 10 }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'contributorActivity'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allActivities = [];
      snapshot.forEach(doc => {
        const userActivities = doc.data();
        if (userActivities.activities) {
          allActivities.push(...userActivities.activities.slice(0, limit));
        }
      });
      setActivities(allActivities.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [limit]);

  const getActivityIcon = (type) => {
    const icons = {
      message: '💬',
      code_push: '📝',
      pr_created: '🔄',
      issue_resolved: '✅',
      collaboration_started: '👥',
    };
    return icons[type] || '📌';
  };

  const getActivityLabel = (type) => {
    const labels = {
      message: 'sent a message',
      code_push: 'pushed code',
      pr_created: 'created a pull request',
      issue_resolved: 'resolved an issue',
      collaboration_started: 'started collaborating',
    };
    return labels[type] || 'was active';
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-400">Loading activities...</div>;
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm px-4 pt-4">Recent Activity</h3>
      {activities.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-6">No activities yet</p>
      ) : (
        activities.map((activity, idx) => (
          <div key={idx} className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded text-sm">
            <div className="flex gap-2 items-start">
              <span className="text-lg">{getActivityIcon(activity.type)}</span>
              <div>
                <p className="text-gray-700 dark:text-gray-300">
                  <span className="font-medium">{activity.metadata?.username || 'Contributor'}</span>{' '}
                  {getActivityLabel(activity.type)}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {activity.timestamp?.toDate?.()?.toLocaleString() ||
                    new Date(activity.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
