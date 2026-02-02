"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

export function usePreviousWorkout(templateId?: number, dayIndex?: number) {
  const previousSets = useLiveQuery(async () => {
    if (templateId === undefined || dayIndex === undefined) return [];

    // Find the most recent completed session for this template/day
    const previousSession = await db.workoutSessions
      .where("templateId")
      .equals(templateId)
      .filter((s) => s.dayIndex === dayIndex && !!s.completedAt)
      .reverse()
      .first();

    if (!previousSession?.id) return [];

    return db.workoutSets
      .where("sessionId")
      .equals(previousSession.id)
      .toArray();
  }, [templateId, dayIndex]);

  function getPreviousForExercise(exerciseId: number) {
    return (previousSets ?? []).filter((s) => s.exerciseId === exerciseId);
  }

  return {
    previousSets: previousSets ?? [],
    getPreviousForExercise,
  };
}
