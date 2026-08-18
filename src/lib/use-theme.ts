"use client";

import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

/**
 * Self-contained theme controller — no external dependency.
 *
 * The `.dark` class on <html> is set pre-paint by the inline script in the
 * root layout (which reads localStorage, falling back to the OS preference),
 * so the correct theme is live before React hydrates and there is no flash.
 * This hook simply mirrors that class into React state and lets the UI flip
 * it, persisting the explicit choice to localStorage.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("light");

  // After mount, read the real theme the pre-paint script already applied.
  useEffect(() => {
    setThemeState(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  const setTheme = useCallback((next: Theme) => {
    const root = document.documentElement;
    if (next === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* storage unavailable (private mode) — theme stays for this session only */
    }
    setThemeState(next);
  }, []);

  const toggle = useCallback(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "light" : "dark");
  }, [setTheme]);

  return { theme, setTheme, toggle };
}
