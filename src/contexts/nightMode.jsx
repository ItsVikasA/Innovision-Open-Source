"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

const NightModeContext = createContext();

export function NightModeProvider({ children }) {
  const [nightMode, setNightMode] = useState(false);

  // Apply or remove the night-mode class on the DOM
  const applyNightMode = useCallback((enabled) => {
    if (enabled) {
      document.documentElement.classList.add("night-mode");
    } else {
      document.documentElement.classList.remove("night-mode");
    }
  }, []);

  // Load saved night mode preference
  useEffect(() => {
    const saved = localStorage.getItem("nightMode");
    if (saved === "true") {
      setNightMode(true);
      applyNightMode(true);
    }
  }, [applyNightMode]);

  // Watch for theme class changes (light ↔ dark) on <html>.
  // When the theme is toggled, classList operations may briefly remove night-mode
  // or the re-render may cause the class to be missing. This observer re-applies it.
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const hasNightClass = document.documentElement.classList.contains("night-mode");
      if (nightMode && !hasNightClass) {
        // Night mode is enabled in state but missing from DOM — re-apply it
        document.documentElement.classList.add("night-mode");
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, [nightMode]);

  const toggleNightMode = useCallback(() => {
    setNightMode((prev) => {
      const newValue = !prev;
      localStorage.setItem("nightMode", String(newValue));
      applyNightMode(newValue);
      return newValue;
    });
  }, [applyNightMode]);

  return (
    <NightModeContext.Provider value={{ nightMode, toggleNightMode }}>
      {children}
    </NightModeContext.Provider>
  );
}

export function useNightMode() {
  const context = useContext(NightModeContext);
  if (!context) {
    throw new Error("useNightMode must be used within NightModeProvider");
  }
  return context;
}
