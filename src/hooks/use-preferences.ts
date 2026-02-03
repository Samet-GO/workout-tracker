"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, type UserPreferences } from "@/lib/db";

const DEFAULT_PREFS: UserPreferences = {
  id: 1,
  weightUnit: "kg",
  theme: "system",
  restTimerEnabled: true,
  showRpePrompt: true,
  showMoodPrompt: true,
  defaultIncrement: 2.5,
};

export function usePreferences() {
  const prefs = useLiveQuery(() => db.userPreferences.get(1), []);

  async function updatePreferences(updates: Partial<UserPreferences>) {
    await db.userPreferences.update(1, updates);
  }

  return {
    prefs: prefs ?? DEFAULT_PREFS,
    updatePreferences,
  };
}
