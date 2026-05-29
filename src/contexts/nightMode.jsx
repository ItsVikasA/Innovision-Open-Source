"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

const NightModeContext = createContext();

export function NightModeProvider({ children }) {
  const [nightMode, setNightMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("nightMode");
    if (saved === "true") {
      setNightMode(true);
      document.documentElement.classList.add("night-mode");
    }
  }, []);

  const applyReadingMode = useCallback((enabled) => {
    setNightMode(enabled);
    localStorage.setItem("nightMode", String(enabled));
    if (enabled) {
      document.documentElement.classList.add("night-mode");
    } else {
      document.documentElement.classList.remove("night-mode");
    }
  }, []);

  const toggleNightMode = () => applyReadingMode(!nightMode);

  return (
    <NightModeContext.Provider
      value={{ nightMode, toggleNightMode, setReadingMode: applyReadingMode }}
    >
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
