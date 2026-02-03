"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, type WorkoutSet } from "@/lib/db";
import { useRouter } from "next/navigation";
import { saveBackupLocally } from "@/lib/export";

export function useActiveWorkout() {
  const router = useRouter();

  // Get current active session (no completedAt)
  const session = useLiveQuery(
    () => db.workoutSessions.filter((s) => !s.completedAt).first(),
    []
  );

  // Get all sets for active session
  const sets = useLiveQuery(
    () =>
      session?.id
        ? db.workoutSets.where("sessionId").equals(session.id).toArray()
        : [],
    [session?.id]
  );

  async function startWorkout(templateId: number, dayIndex: number) {
    const sessionId = await db.workoutSessions.add({
      templateId,
      dayIndex,
      startedAt: new Date(),
    });
    router.push("/workout");
    return sessionId;
  }

  async function logSet(
    data: Omit<WorkoutSet, "id" | "sessionId" | "completedAt">
  ) {
    if (!session?.id) throw new Error("No active session");
    return db.workoutSets.add({
      ...data,
      sessionId: session.id,
      completedAt: new Date(),
    });
  }

  async function deleteSet(setId: number) {
    await db.workoutSets.delete(setId);
  }

  async function updateSet(setId: number, data: Partial<Pick<WorkoutSet, "weight" | "reps">>) {
    await db.workoutSets.update(setId, data);
  }

  async function completeWorkout() {
    if (!session?.id) return;
    await db.workoutSessions.update(session.id, {
      completedAt: new Date(),
    });

    // Auto-backup after completing workout
    try {
      await saveBackupLocally();
    } catch (e) {
      console.warn("Auto-backup failed:", e);
    }

    router.push("/workout/complete");
  }

  async function cancelWorkout() {
    if (!session?.id) return;
    // Delete all sets and the session
    await db.workoutSets.where("sessionId").equals(session.id).delete();
    await db.workoutSessions.delete(session.id);
    router.push("/plans");
  }

  return {
    session,
    sets: sets ?? [],
    startWorkout,
    logSet,
    deleteSet,
    updateSet,
    completeWorkout,
    cancelWorkout,
    isActive: !!session,
  };
}
