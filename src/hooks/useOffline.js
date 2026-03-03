// Custom hook for offline functionality with conflict resolution
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  saveCourseOffline,
  getOfflineCourses,
  saveProgressOffline,
  syncOfflineData,
  setupOfflineListeners,
} from "@/lib/offline";

export function useOffline() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [offlineCourses, setOfflineCourses] = useState([]);
  const cleanupRef = useRef(null);

  const loadOfflineCourses = useCallback(async () => {
    try {
      const courses = await getOfflineCourses();
      setOfflineCourses(courses);
    } catch (error) {
      console.warn("Failed to load offline courses:", error);
    }
  }, []);

  const triggerSync = useCallback(async () => {
    if (!navigator.onLine) return;
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncOfflineData();
      setSyncResult(result);
      // Clear result after 5 seconds
      setTimeout(() => setSyncResult(null), 5000);
    } catch (error) {
      setSyncResult({ success: false, message: error.message, synced: 0, failed: 0 });
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    loadOfflineCourses();

    // Single place for online/offline listeners — no duplicates
    const cleanup = setupOfflineListeners(
      () => {
        setIsOnline(true);
        triggerSync();
      },
      () => {
        setIsOnline(false);
      }
    );
    cleanupRef.current = cleanup;

    return () => {
      if (cleanupRef.current) cleanupRef.current();
    };
  }, [loadOfflineCourses, triggerSync]);

  const downloadCourse = useCallback(
    async (course) => {
      await saveCourseOffline(course);
      await loadOfflineCourses();
    },
    [loadOfflineCourses]
  );

  const saveProgress = useCallback(
    async (progress) => {
      if (isOnline) {
        // Save to server directly; also store locally for resilience
        try {
          const response = await fetch("/api/progress/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              courseId: progress.courseId,
              courseType: progress.courseType || "roadmap",
              chapters: {
                [progress.chapter || progress.chapterKey || "unknown"]: {
                  completed: progress.completed || false,
                  completedAt: Date.now(),
                  timeSpent: progress.timeSpent || 0,
                },
              },
              clientTimestamp: Date.now(),
            }),
          });

          if (!response.ok) {
            // Server rejected — save offline for later retry
            await saveProgressOffline(progress);
          }
        } catch {
          // Network error — save offline
          await saveProgressOffline(progress);
        }
      } else {
        // Offline — save locally for later sync
        await saveProgressOffline(progress);
      }
    },
    [isOnline]
  );

  return {
    isOnline,
    isSyncing,
    syncResult,
    offlineCourses,
    downloadCourse,
    saveProgress,
    triggerSync,
  };
}
