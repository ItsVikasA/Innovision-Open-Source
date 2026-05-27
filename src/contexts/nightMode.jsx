"use client";

import { createContext, useContext, useState, useEffect } from "react";

const NightModeContext = createContext();

export function NightModeProvider({ children }) {
  const [nightMode, setNightMode] = useState(false);

  // Load saved night mode preference
  useEffect(() => {
    const saved = localStorage.getItem("nightMode");
    if (saved === "true") {
      setNightMode(true);
      document.documentElement.classList.add("night-mode");
    }
  }, []);

  const toggleNightMode = () => {
    const newValue = !nightMode;
    setNightMode(newValue);
    localStorage.setItem("nightMode", String(newValue));

    if (newValue) {
      document.documentElement.classList.add("night-mode");
    } else {
      document.documentElement.classList.remove("night-mode");
    }
  };

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
