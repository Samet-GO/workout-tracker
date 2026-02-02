"use client";

import { useEffect } from "react";
import { usePreferences } from "@/hooks/use-preferences";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { prefs } = usePreferences();

  useEffect(() => {
    const root = document.documentElement;

    function applyTheme(theme: "light" | "dark" | "system") {
      if (theme === "dark") {
        root.classList.add("dark");
      } else if (theme === "light") {
        root.classList.remove("dark");
      } else {
        const isDark = window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches;
        root.classList.toggle("dark", isDark);
      }
    }

    applyTheme(prefs.theme);

    if (prefs.theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) => {
        root.classList.toggle("dark", e.matches);
      };
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [prefs.theme]);

  return <>{children}</>;
}
