"use client";

import { useEffect, useState, type ReactNode } from "react";
import { seedDatabase } from "@/lib/seed";

export function DbProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    seedDatabase()
      .then(async () => {
        setReady(true);
        // Request persistent storage (silent, no user prompt)
        if (navigator.storage?.persist) {
          const granted = await navigator.storage.persist();
          console.log(
            `Persistent storage ${granted ? "granted" : "not granted"}`
          );
        }
      })
      .catch((err) => {
        console.error("Failed to seed database:", err);
        setError(err.message);
        setReady(true); // Still render, just without seed data
      });
  }, []);

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

  if (error) {
    console.warn("Seed error (non-fatal):", error);
  }

  return <>{children}</>;
}
