"use client";

import { useEffect, useState } from "react";
import {
  saveCourseOffline,
  getOfflineCourses,
  saveProgressOffline,
  syncOfflineData,
  setupOfflineListeners,
  getCacheStatus,
  clearServiceWorkerCache,
  onCacheUpdate,
} from "@/lib/offline";
import { toast } from "sonner";

export function useOffline() {
  const [isOnline, setIsOnline] = useState(true);
  const [offlineCourses, setOfflineCourses] = useState([]);
  const [cacheStatus, setCacheStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);

  // Initialize
  useEffect(() => {
    setIsOnline(navigator.onLine);
    loadOfflineCourses();
    loadCacheStatus();

    // Setup offline listeners
    const cleanup = setupOfflineListeners(
      async () => {
        setIsOnline(true);
        setSyncing(true);
        try {
          const result = await syncOfflineData();
          if (result.success) {
            toast.success("Data synced successfully");
          }
        } catch (error) {
          console.error("Sync error:", error);
          toast.error("Failed to sync data");
        } finally {
          setSyncing(false);
        }
      },
      () => {
        setIsOnline(false);
      }
    );

    // Listen for cache updates
    const unsubscribeCacheUpdate = onCacheUpdate((update) => {
      if (update.type === 'CACHE_UPDATED') {
        loadCacheStatus();
        toast.info("App updated to latest version");
      } else if (update.type === 'API_UPDATED') {
        loadCacheStatus();
      }
    });

    return () => {
      cleanup();
      unsubscribeCacheUpdate();
    };
  }, []);

  const loadOfflineCourses = async () => {
    try {
      const courses = await getOfflineCourses();
      setOfflineCourses(courses);
    } catch (error) {
      console.error("Failed to load offline courses:", error);
      toast.error("Failed to load offline courses");
    }
  };

  const loadCacheStatus = async () => {
    try {
      const status = await getCacheStatus();
      setCacheStatus(status);
    } catch (error) {
      console.warn("Failed to get cache status:", error);
    }
  };

  const downloadCourse = async (course) => {
    try {
      setSyncing(true);
      await saveCourseOffline(course);
      await loadOfflineCourses();
      toast.success("Course downloaded successfully");
      return true;
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Failed to download course");
      return false;
    } finally {
      setSyncing(false);
    }
  };

  const saveProgress = async (progress) => {
    try {
      if (isOnline) {
        // Save directly to server
        const response = await fetch("/api/progress/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(progress),
        });

        if (!response.ok) {
          throw new Error("Failed to save progress");
        }
      } else {
        // Save offline for later sync
        await saveProgressOffline(progress);
        toast.info("Progress saved locally - will sync when online");
      }
      return true;
    } catch (error) {
      console.error("Save progress error:", error);
      toast.error("Failed to save progress");
      return false;
    }
  };

  const clearCache = async (type = "all") => {
    try {
      await clearServiceWorkerCache(type);
      await loadCacheStatus();
      toast.success("Cache cleared successfully");
      return true;
    } catch (error) {
      console.error("Clear cache error:", error);
      toast.error("Failed to clear cache");
      return false;
    }
  };

  return {
    isOnline,
    syncing,
    offlineCourses,
    cacheStatus,
    downloadCourse,
    saveProgress,
    clearCache,
    loadCacheStatus,
    loadOfflineCourses,
  };
}
