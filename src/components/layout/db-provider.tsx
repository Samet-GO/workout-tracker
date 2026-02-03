"use client";

import { useEffect, useState, type ReactNode } from "react";
import { seedDatabase } from "@/lib/seed";
import { checkDatabaseHealth, requestPersistentStorage } from "@/lib/db";

interface HealthWarning {
  type: "safari" | "ios" | "private" | "notPersisted";
  message: string;
}

export function DbProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<HealthWarning[]>([]);
  const [dismissedWarnings, setDismissedWarnings] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function init() {
      // First check if database is accessible
      const health = await checkDatabaseHealth();

      if (!health.ok) {
        setDbError(health.error ?? "Database unavailable");
        setReady(true);
        return;
      }

      // Collect warnings
      const newWarnings: HealthWarning[] = [];

      if (health.isPrivate) {
        newWarnings.push({
          type: "private",
          message: "Private browsing detected. Your data will be lost when you close the browser.",
        });
      }

      if (health.isSafari && !health.isPrivate) {
        newWarnings.push({
          type: "safari",
          message: "Safari may delete your data after 7 days of inactivity. Regular backups recommended.",
        });
      }

      if (health.isIOS) {
        newWarnings.push({
          type: "ios",
          message: "iOS storage can be unstable. Enable backups in Settings to protect your data.",
        });
      }

      // Request persistent storage
      const persisted = await requestPersistentStorage();
      console.log(`Persistent storage ${persisted ? "granted" : "not granted"}`);

      if (!persisted && !health.isPrivate) {
        newWarnings.push({
          type: "notPersisted",
          message: "Storage not persistent. Your browser may delete data under storage pressure.",
        });
      }

      setWarnings(newWarnings);

      // Seed database
      try {
        await seedDatabase();
      } catch (err) {
        console.error("Failed to seed database:", err);
        // Non-fatal - continue anyway
      }

      setReady(true);
    }

    init();
  }, []);

  function dismissWarning(type: string) {
    setDismissedWarnings((prev) => new Set([...prev, type]));
  }

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
          <p className="text-sm text-zinc-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (dbError) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <div className="max-w-sm rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20">
          <h2 className="mb-2 text-lg font-bold text-red-700 dark:text-red-400">
            Storage Unavailable
          </h2>
          <p className="mb-4 text-sm text-red-600 dark:text-red-300">
            {dbError}
          </p>
          <p className="text-xs text-red-500 dark:text-red-400">
            This app requires IndexedDB to store your workout data. Please check
            your browser settings or try a different browser.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const activeWarnings = warnings.filter((w) => !dismissedWarnings.has(w.type));

  return (
    <>
      {activeWarnings.length > 0 && (
        <div className="fixed top-0 left-0 right-0 z-50 mx-auto max-w-lg space-y-1 p-2">
          {activeWarnings.map((warning) => (
            <div
              key={warning.type}
              className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-100 p-3 text-xs shadow-md dark:border-amber-700 dark:bg-amber-950"
            >
              <span className="text-amber-600 dark:text-amber-400">⚠️</span>
              <p className="flex-1 text-amber-800 dark:text-amber-200">{warning.message}</p>
              <button
                onClick={() => dismissWarning(warning.type)}
                className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 min-w-[24px] min-h-[24px] flex items-center justify-center"
                aria-label="Dismiss warning"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      {children}
    </>
  );
}
