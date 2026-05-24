"use client";

import { createContext, useContext, useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/auth";
import xpContext from "@/contexts/xp";
import { toast } from "sonner";

const StudyTimeContext = createContext();

export const StudyTimeProvider = ({ children }) => {
  const { user } = useAuth();
  const xpCtx = useContext(xpContext);
  const awardXP = xpCtx?.awardXP;
  const fireConfetti = xpCtx?.fireConfetti;

  const [studyGoal, setStudyGoal] = useState(30); // in minutes
  const [dailyLogs, setDailyLogs] = useState({}); // YYYY-MM-DD -> seconds
  const [loading, setLoading] = useState(true);
  const [useLocalFallback, setUseLocalFallback] = useState(false);

  const activeSecondsRef = useRef(0);
  const lastActiveTimeRef = useRef(typeof window !== "undefined" ? Date.now() : 0);
  const userRef = useRef(null);

  // Sync latest user state to ref for callbacks/intervals
  useEffect(() => {
    userRef.current = user;
    if (user?.email) {
      fetchStudyData(user.email);
    } else {
      setDailyLogs({});
      setStudyGoal(30);
      setLoading(false);
    }
  }, [user]);

  const fetchStudyData = async (email) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/study-time?userId=${email}`);
      const data = await res.json();
      
      if (data._warning === "Firebase not configured") {
        setUseLocalFallback(true);
        loadLocalData(email);
      } else {
        setStudyGoal(data.studyGoal || 30);
        setDailyLogs(data.dailyStudyTime || {});
        setUseLocalFallback(false);
      }
    } catch (error) {
      console.error("Error fetching study data, falling back to local storage:", error);
      setUseLocalFallback(true);
      loadLocalData(email);
    } finally {
      setLoading(false);
    }
  };

  const loadLocalData = (email) => {
    const goalKey = `study_goal_${email}`;
    const logsKey = `daily_study_time_${email}`;
    
    const savedGoal = localStorage.getItem(goalKey);
    const savedLogs = localStorage.getItem(logsKey);
    
    if (savedGoal) setStudyGoal(Number(savedGoal));
    else setStudyGoal(30);

    if (savedLogs) {
      try {
        setDailyLogs(JSON.parse(savedLogs));
      } catch {
        setDailyLogs({});
      }
    } else {
      setDailyLogs({});
    }
  };

  const syncStudyTime = async () => {
    const email = userRef.current?.email;
    if (!email || activeSecondsRef.current <= 0) return;

    const duration = activeSecondsRef.current;
    activeSecondsRef.current = 0; // reset buffer

    const todayStr = new Date().toISOString().split("T")[0];

    // Optimistic state update
    setDailyLogs((prev) => {
      const newLogs = { ...prev };
      newLogs[todayStr] = (newLogs[todayStr] || 0) + duration;
      
      // Check if daily goal reached
      const goalSeconds = studyGoal * 60;
      const prevTime = prev[todayStr] || 0;
      if (prevTime < goalSeconds && newLogs[todayStr] >= goalSeconds) {
        // Trigger congratulations
        setTimeout(() => {
          toast.success("🎉 Daily study goal reached! Amazing job!");
          if (fireConfetti) fireConfetti("xp_milestone");
          if (awardXP) {
            awardXP("study_goal_completed", 10).catch(err => console.error("Error awarding XP:", err));
          }
        }, 100);
      }

      // Sync local storage if fallback
      if (useLocalFallback) {
        localStorage.setItem(`daily_study_time_${email}`, JSON.stringify(newLogs));
      }
      return newLogs;
    });

    if (!useLocalFallback) {
      try {
        const response = await fetch("/api/study-time", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: email, action: "track", duration }),
          keepalive: true
        });
        const result = await response.json();
        if (result.success) {
          setDailyLogs(result.dailyStudyTime || {});
        }
      } catch (error) {
        console.error("Failed to sync study time with server:", error);
      }
    }
  };

  const updateGoal = async (minutes) => {
    const email = user?.email;
    if (!email) return;

    setStudyGoal(minutes);

    if (useLocalFallback) {
      localStorage.setItem(`study_goal_${email}`, minutes.toString());
      toast.success("Study goal updated successfully!");
    } else {
      try {
        const res = await fetch("/api/study-time", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: email, action: "setGoal", goal: minutes })
        });
        const data = await res.json();
        if (data.success) {
          toast.success("Study goal updated successfully!");
        } else {
          toast.error("Failed to update study goal.");
        }
      } catch (error) {
        console.error("Error setting study goal:", error);
        toast.error("Failed to update study goal.");
      }
    }
  };

  const resetStudyTime = async () => {
    const email = user?.email;
    if (!email) return;

    setDailyLogs({});

    if (useLocalFallback) {
      localStorage.removeItem(`daily_study_time_${email}`);
      toast.success("Study analytics history reset.");
    } else {
      try {
        const res = await fetch("/api/study-time", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: email, action: "reset" })
        });
        const data = await res.json();
        if (data.success) {
          toast.success("Study analytics history reset.");
        } else {
          toast.error("Failed to reset study history.");
        }
      } catch (error) {
        console.error("Error resetting study history:", error);
        toast.error("Failed to reset study history.");
      }
    }
  };

  // Setup activity listeners and interval
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleActivity = () => {
      lastActiveTimeRef.current = Date.now();
    };

    // Events that signify user activity
    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("click", handleActivity);
    window.addEventListener("scroll", handleActivity);
    window.addEventListener("touchstart", handleActivity);

    // Periodic check (every 1 second)
    const interval = setInterval(() => {
      const email = userRef.current?.email;
      if (!email) return;

      const timeSinceLastActive = Date.now() - lastActiveTimeRef.current;
      // Active if there was an interaction in the last 60 seconds
      if (timeSinceLastActive < 60000) {
        activeSecondsRef.current += 1;

        // Auto sync every 30 seconds of active time
        if (activeSecondsRef.current >= 30) {
          syncStudyTime();
        }
      }
    }, 1000);

    // Sync on page hide/unload to not lose unsaved time
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        syncStudyTime();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const handleBeforeUnload = () => {
      syncStudyTime();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      clearInterval(interval);
    };
  }, []);

  return (
    <StudyTimeContext.Provider
      value={{
        studyGoal,
        dailyLogs,
        loading,
        updateGoal,
        resetStudyTime,
        syncStudyTime
      }}
    >
      {children}
    </StudyTimeContext.Provider>
  );
};

export const useStudyTime = () => {
  const context = useContext(StudyTimeContext);
  if (!context) {
    throw new Error("useStudyTime must be used within a StudyTimeProvider");
  }
  return context;
};
