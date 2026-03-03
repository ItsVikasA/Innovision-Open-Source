// Offline-First Capabilities with LWW Conflict Resolution
import { openDB } from "idb";

const DB_NAME = "InnoVisionOffline";
const DB_VERSION = 2;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

// Prevent concurrent syncs
let syncInProgress = false;

/**
 * Initialize IndexedDB for offline storage
 */
export async function initOfflineDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // Courses store
      if (!db.objectStoreNames.contains("courses")) {
        db.createObjectStore("courses", { keyPath: "id" });
      }

      // Progress store — deduplicated by courseId+chapter
      if (!db.objectStoreNames.contains("progress")) {
        const progressStore = db.createObjectStore("progress", {
          keyPath: "id",
          autoIncrement: true,
        });
        progressStore.createIndex("synced", "synced");
        progressStore.createIndex("timestamp", "timestamp");
        progressStore.createIndex("courseId", "courseId");
      }

      // v2: add courseId index to existing stores
      if (oldVersion < 2) {
        if (db.objectStoreNames.contains("progress")) {
          const tx = db.transaction("progress", "readwrite");
          if (!tx.store.indexNames.contains("courseId")) {
            tx.store.createIndex("courseId", "courseId");
          }
        }
      }

      // Cache store
      if (!db.objectStoreNames.contains("cache")) {
        db.createObjectStore("cache", { keyPath: "url" });
      }
    },
  });
}

/**
 * Save course for offline access
 */
export async function saveCourseOffline(course) {
  const db = await initOfflineDB();
  await db.put("courses", {
    ...course,
    downloadedAt: Date.now(),
  });
}

/**
 * Get offline courses
 */
export async function getOfflineCourses() {
  const db = await initOfflineDB();
  return db.getAll("courses");
}

/**
 * Save progress offline with deduplication.
 * If a record for the same courseId + chapter already exists (unsynced),
 * update it instead of creating a duplicate.
 */
export async function saveProgressOffline(progress) {
  const db = await initOfflineDB();

  // Check for existing unsynced record with same courseId + chapter
  const allUnsynced = await getUnsyncedProgress();
  const existing = allUnsynced.find(
    (p) =>
      p.courseId === progress.courseId &&
      p.chapter === progress.chapter
  );

  if (existing) {
    // Update existing record with newer data (LWW at client level)
    const updated = {
      ...existing,
      ...progress,
      timestamp: Date.now(),
      synced: 0,
    };
    await db.put("progress", updated);
  } else {
    await db.add("progress", {
      ...progress,
      synced: 0,
      timestamp: Date.now(),
    });
  }

  // Request background sync if supported
  if ("serviceWorker" in navigator && "SyncManager" in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register("sync-progress");
    } catch {
      // Background sync not available — will sync on reconnect
    }
  }
}

/**
 * Get unsynced progress
 */
export async function getUnsyncedProgress() {
  const db = await initOfflineDB();
  const tx = db.transaction("progress", "readonly");
  const index = tx.store.index("synced");
  return index.getAll(0);
}

/**
 * Mark progress as synced
 */
export async function markProgressSynced(progressId) {
  const db = await initOfflineDB();
  const progress = await db.get("progress", progressId);
  if (progress) {
    progress.synced = 1;
    await db.put("progress", progress);
  }
}

/**
 * Group unsynced progress entries by courseId for batch sync
 */
function groupByCourse(progressEntries) {
  const grouped = {};
  for (const entry of progressEntries) {
    const key = entry.courseId;
    if (!key) continue;
    if (!grouped[key]) {
      grouped[key] = {
        courseId: entry.courseId,
        courseType: entry.courseType || "roadmap",
        chapters: {},
        ids: [], // track IndexedDB IDs for marking synced
      };
    }
    // LWW: if same chapter appears multiple times, keep the newest
    const chapterKey = entry.chapter || entry.chapterKey || "unknown";
    const existing = grouped[key].chapters[chapterKey];
    if (!existing || (entry.timestamp || 0) > (existing.completedAt || 0)) {
      grouped[key].chapters[chapterKey] = {
        completed: entry.completed || false,
        completedAt: entry.timestamp || Date.now(),
        timeSpent: entry.timeSpent || 0,
      };
    }
    grouped[key].ids.push(entry.id);
  }
  return grouped;
}

/**
 * Sync offline data when online — with batch sync, LWW merge, and retry
 */
export async function syncOfflineData() {
  if (!navigator.onLine) {
    return { success: false, message: "Device is offline", synced: 0, failed: 0 };
  }

  if (syncInProgress) {
    return { success: false, message: "Sync already in progress", synced: 0, failed: 0 };
  }

  syncInProgress = true;

  try {
    const unsyncedProgress = await getUnsyncedProgress();
    if (unsyncedProgress.length === 0) {
      return { success: true, message: "Nothing to sync", synced: 0, failed: 0 };
    }

    // Group by course for batch sync
    const grouped = groupByCourse(unsyncedProgress);
    let synced = 0;
    let failed = 0;
    const conflicts = [];

    for (const [courseId, group] of Object.entries(grouped)) {
      let lastError = null;

      // Retry with exponential backoff
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          const response = await fetch("/api/progress/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              courseId: group.courseId,
              courseType: group.courseType,
              chapters: group.chapters,
              clientTimestamp: Date.now(),
            }),
          });

          if (response.ok) {
            const data = await response.json();
            // Mark all related IndexedDB records as synced
            for (const id of group.ids) {
              await markProgressSynced(id);
            }
            synced += group.ids.length;
            if (data.conflicts?.length > 0) {
              conflicts.push(...data.conflicts);
            }
            lastError = null;
            break; // Success — exit retry loop
          } else if (response.status === 401) {
            // Auth error — don't retry
            lastError = "Unauthorized";
            break;
          } else {
            lastError = `Server error (${response.status})`;
          }
        } catch (error) {
          lastError = error.message;
        }

        // Exponential backoff before retry
        if (attempt < MAX_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, BASE_DELAY_MS * Math.pow(2, attempt)));
        }
      }

      if (lastError) {
        failed += group.ids.length;
        console.warn(`Failed to sync course ${courseId}:`, lastError);
      }
    }

    return { success: true, synced, failed, conflicts };
  } finally {
    syncInProgress = false;
  }
}

/**
 * Check if device is online and setup listeners.
 * Returns a cleanup function to remove listeners.
 */
export function setupOfflineListeners(onOnline, onOffline) {
  const handleOnline = () => {
    if (onOnline) onOnline();
  };

  const handleOffline = () => {
    if (onOffline) onOffline();
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  // Return cleanup function
  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}
