"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

const AppThemeContext = createContext(null);

function applyColorTheme(theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.add("light");
    root.classList.remove("dark");
  }
}

export function AppThemeProvider({ children }) {
  const [theme, setThemeState] = useState("light");

  useEffect(() => {
    const saved = localStorage.getItem("theme") || "light";
    setThemeState(saved);
    applyColorTheme(saved);
  }, []);

  const setColorTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);
    applyColorTheme(newTheme);
  }, []);

  return (
    <AppThemeContext.Provider value={{ theme, setColorTheme, isDark: theme === "dark" }}>
      {children}
    </AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used within AppThemeProvider");
  }
  return context;
}
