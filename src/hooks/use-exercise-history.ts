"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, type WorkoutSet } from "@/lib/db";

export function useExerciseHistory(exerciseId?: number) {
  const history = useLiveQuery(async () => {
    if (!exerciseId) return [];

    const sets = await db.workoutSets
      .where("exerciseId")
      .equals(exerciseId)
      .reverse()
      .toArray();

    return sets;
  }, [exerciseId]);

  const bestSet = (history ?? []).reduce<WorkoutSet | null>((best, set) => {
    const volume = set.weight * set.reps;
    const bestVolume = best ? best.weight * best.reps : 0;
    if (volume > bestVolume) return set;
    return best;
  }, null);

  return {
    history: history ?? [],
    bestSet,
  };
}
