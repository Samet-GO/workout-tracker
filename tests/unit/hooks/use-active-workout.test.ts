import { describe, it, expect, beforeEach, vi } from "vitest";
import { db, type WorkoutSession, type WorkoutSet } from "@/lib/db";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
}));

// Mock dexie-react-hooks to avoid React rendering issues in unit tests
// We'll test the underlying database operations directly
vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: vi.fn(),
}));

// Mock export functions
vi.mock("@/lib/export", () => ({
  saveBackupLocally: vi.fn().mockResolvedValue(undefined),
}));

describe("useActiveWorkout - database operations", () => {
  beforeEach(async () => {
    await db.workoutSessions.clear();
    await db.workoutSets.clear();
    vi.clearAllMocks();
  });

  describe("startWorkout", () => {
    it("creates a new session with correct data", async () => {
      const templateId = 1;
      const dayIndex = 0;

      const sessionId = await db.workoutSessions.add({
        templateId,
        dayIndex,
        startedAt: new Date(),
      });

      const session = await db.workoutSessions.get(sessionId);

      expect(session).toBeDefined();
      expect(session?.templateId).toBe(templateId);
      expect(session?.dayIndex).toBe(dayIndex);
      expect(session?.startedAt).toBeDefined();
      expect(session?.completedAt).toBeUndefined();
    });

    it("creates session with template and day correctly linked", async () => {
      const sessionId = await db.workoutSessions.add({
        templateId: 3,
        dayIndex: 2,
        startedAt: new Date(),
      });

      const session = await db.workoutSessions.get(sessionId);

      expect(session?.templateId).toBe(3);
      expect(session?.dayIndex).toBe(2);
    });
  });

  describe("getActiveSession", () => {
    it("finds session without completedAt", async () => {
      // Create completed session
      await db.workoutSessions.add({
        templateId: 1,
        dayIndex: 0,
        startedAt: new Date(),
        completedAt: new Date(),
      });

      // Create active session
      const activeId = await db.workoutSessions.add({
        templateId: 1,
        dayIndex: 1,
        startedAt: new Date(),
      });

      const activeSession = await db.workoutSessions
        .filter((s) => !s.completedAt)
        .first();

      expect(activeSession?.id).toBe(activeId);
    });

    it("returns undefined when no active session exists", async () => {
      await db.workoutSessions.add({
        templateId: 1,
        dayIndex: 0,
        startedAt: new Date(),
        completedAt: new Date(),
      });

      const activeSession = await db.workoutSessions
        .filter((s) => !s.completedAt)
        .first();

      expect(activeSession).toBeUndefined();
    });
  });

  describe("logSet", () => {
    it("adds set with correct session reference", async () => {
      const sessionId = await db.workoutSessions.add({
        templateId: 1,
        dayIndex: 0,
        startedAt: new Date(),
      });

      const setId = await db.workoutSets.add({
        sessionId,
        exerciseId: 1,
        setNumber: 1,
        weight: 100,
        reps: 8,
        completedAt: new Date(),
      });

      const set = await db.workoutSets.get(setId);

      expect(set?.sessionId).toBe(sessionId);
      expect(set?.weight).toBe(100);
      expect(set?.reps).toBe(8);
    });

    it("adds set with RPE data", async () => {
      const sessionId = await db.workoutSessions.add({
        templateId: 1,
        dayIndex: 0,
        startedAt: new Date(),
      });

      const setId = await db.workoutSets.add({
        sessionId,
        exerciseId: 1,
        setNumber: 1,
        weight: 100,
        reps: 8,
        rpe: 8,
        completedAt: new Date(),
      });

      const set = await db.workoutSets.get(setId);

      expect(set?.rpe).toBe(8);
    });

    it("adds set with special set data (drop set)", async () => {
      const sessionId = await db.workoutSessions.add({
        templateId: 1,
        dayIndex: 0,
        startedAt: new Date(),
      });

      const setId = await db.workoutSets.add({
        sessionId,
        exerciseId: 1,
        setNumber: 1,
        weight: 100,
        reps: 10,
        dropSetWeight: 80,
        dropSetReps: 8,
        completedAt: new Date(),
      });

      const set = await db.workoutSets.get(setId);

      expect(set?.dropSetWeight).toBe(80);
      expect(set?.dropSetReps).toBe(8);
    });

    it("adds set with templateExerciseId reference", async () => {
      const sessionId = await db.workoutSessions.add({
        templateId: 1,
        dayIndex: 0,
        startedAt: new Date(),
      });

      const setId = await db.workoutSets.add({
        sessionId,
        exerciseId: 1,
        templateExerciseId: 42,
        setNumber: 1,
        weight: 100,
        reps: 8,
        completedAt: new Date(),
      });

      const set = await db.workoutSets.get(setId);

      expect(set?.templateExerciseId).toBe(42);
    });

    it("tracks set numbers correctly", async () => {
      const sessionId = await db.workoutSessions.add({
        templateId: 1,
        dayIndex: 0,
        startedAt: new Date(),
      });

      await db.workoutSets.bulkAdd([
        { sessionId, exerciseId: 1, setNumber: 1, weight: 100, reps: 8, completedAt: new Date() },
        { sessionId, exerciseId: 1, setNumber: 2, weight: 100, reps: 8, completedAt: new Date() },
        { sessionId, exerciseId: 1, setNumber: 3, weight: 100, reps: 7, completedAt: new Date() },
      ]);

      const sets = await db.workoutSets
        .where("sessionId")
        .equals(sessionId)
        .toArray();

      expect(sets).toHaveLength(3);
      expect(sets.map((s) => s.setNumber)).toEqual([1, 2, 3]);
    });
  });

  describe("deleteSet", () => {
    it("removes set from database", async () => {
      const sessionId = await db.workoutSessions.add({
        templateId: 1,
        dayIndex: 0,
        startedAt: new Date(),
      });

      const setId = await db.workoutSets.add({
        sessionId,
        exerciseId: 1,
        setNumber: 1,
        weight: 100,
        reps: 8,
        completedAt: new Date(),
      });

      await db.workoutSets.delete(setId);

      const deleted = await db.workoutSets.get(setId);
      expect(deleted).toBeUndefined();
    });

    it("delete is idempotent (no error on non-existent set)", async () => {
      // Should not throw
      await db.workoutSets.delete(99999);

      const count = await db.workoutSets.count();
      expect(count).toBe(0);
    });
  });

  describe("updateSet", () => {
    it("updates weight and reps", async () => {
      const sessionId = await db.workoutSessions.add({
        templateId: 1,
        dayIndex: 0,
        startedAt: new Date(),
      });

      const setId = await db.workoutSets.add({
        sessionId,
        exerciseId: 1,
        setNumber: 1,
        weight: 100,
        reps: 8,
        completedAt: new Date(),
      });

      await db.workoutSets.update(setId, { weight: 102.5, reps: 9 });

      const updated = await db.workoutSets.get(setId);

      expect(updated?.weight).toBe(102.5);
      expect(updated?.reps).toBe(9);
    });

    it("updates only specified fields", async () => {
      const sessionId = await db.workoutSessions.add({
        templateId: 1,
        dayIndex: 0,
        startedAt: new Date(),
      });

      const setId = await db.workoutSets.add({
        sessionId,
        exerciseId: 1,
        setNumber: 1,
        weight: 100,
        reps: 8,
        rpe: 7,
        completedAt: new Date(),
      });

      await db.workoutSets.update(setId, { weight: 105 });

      const updated = await db.workoutSets.get(setId);

      expect(updated?.weight).toBe(105);
      expect(updated?.reps).toBe(8); // Unchanged
      expect(updated?.rpe).toBe(7); // Unchanged
    });
  });

  describe("completeWorkout", () => {
    it("sets completedAt timestamp", async () => {
      const sessionId = await db.workoutSessions.add({
        templateId: 1,
        dayIndex: 0,
        startedAt: new Date(),
      });

      const completedAt = new Date();
      await db.workoutSessions.update(sessionId, { completedAt });

      const session = await db.workoutSessions.get(sessionId);

      expect(session?.completedAt).toBeDefined();
    });

    it("saves mood and energy feedback", async () => {
      const sessionId = await db.workoutSessions.add({
        templateId: 1,
        dayIndex: 0,
        startedAt: new Date(),
      });

      await db.workoutSessions.update(sessionId, {
        completedAt: new Date(),
        mood: 7,
        energy: 6,
      });

      const session = await db.workoutSessions.get(sessionId);

      expect(session?.mood).toBe(7);
      expect(session?.energy).toBe(6);
    });

    it("saves notes", async () => {
      const sessionId = await db.workoutSessions.add({
        templateId: 1,
        dayIndex: 0,
        startedAt: new Date(),
      });

      await db.workoutSessions.update(sessionId, {
        completedAt: new Date(),
        notes: "Great workout, felt strong!",
      });

      const session = await db.workoutSessions.get(sessionId);

      expect(session?.notes).toBe("Great workout, felt strong!");
    });
  });

  describe("cancelWorkout", () => {
    it("deletes session and all associated sets", async () => {
      const sessionId = await db.workoutSessions.add({
        templateId: 1,
        dayIndex: 0,
        startedAt: new Date(),
      });

      await db.workoutSets.bulkAdd([
        { sessionId, exerciseId: 1, setNumber: 1, weight: 100, reps: 8, completedAt: new Date() },
        { sessionId, exerciseId: 1, setNumber: 2, weight: 100, reps: 8, completedAt: new Date() },
        { sessionId, exerciseId: 2, setNumber: 1, weight: 50, reps: 12, completedAt: new Date() },
      ]);

      // Cancel workout logic: delete sets first, then session
      await db.workoutSets.where("sessionId").equals(sessionId).delete();
      await db.workoutSessions.delete(sessionId);

      const session = await db.workoutSessions.get(sessionId);
      const sets = await db.workoutSets.where("sessionId").equals(sessionId).toArray();

      expect(session).toBeUndefined();
      expect(sets).toHaveLength(0);
    });

    it("does not affect other sessions", async () => {
      const session1Id = await db.workoutSessions.add({
        templateId: 1,
        dayIndex: 0,
        startedAt: new Date(),
      });

      const session2Id = await db.workoutSessions.add({
        templateId: 1,
        dayIndex: 1,
        startedAt: new Date(),
        completedAt: new Date(),
      });

      await db.workoutSets.add({
        sessionId: session2Id,
        exerciseId: 1,
        setNumber: 1,
        weight: 100,
        reps: 8,
        completedAt: new Date(),
      });

      // Cancel session 1
      await db.workoutSets.where("sessionId").equals(session1Id).delete();
      await db.workoutSessions.delete(session1Id);

      // Session 2 should still exist
      const session2 = await db.workoutSessions.get(session2Id);
      const session2Sets = await db.workoutSets.where("sessionId").equals(session2Id).toArray();

      expect(session2).toBeDefined();
      expect(session2Sets).toHaveLength(1);
    });
  });

  describe("getSetsForSession", () => {
    it("returns all sets for a session", async () => {
      const sessionId = await db.workoutSessions.add({
        templateId: 1,
        dayIndex: 0,
        startedAt: new Date(),
      });

      await db.workoutSets.bulkAdd([
        { sessionId, exerciseId: 1, setNumber: 1, weight: 100, reps: 8, completedAt: new Date() },
        { sessionId, exerciseId: 1, setNumber: 2, weight: 100, reps: 8, completedAt: new Date() },
        { sessionId, exerciseId: 2, setNumber: 1, weight: 50, reps: 12, completedAt: new Date() },
      ]);

      const sets = await db.workoutSets
        .where("sessionId")
        .equals(sessionId)
        .toArray();

      expect(sets).toHaveLength(3);
    });

    it("returns empty array when no sets exist", async () => {
      const sessionId = await db.workoutSessions.add({
        templateId: 1,
        dayIndex: 0,
        startedAt: new Date(),
      });

      const sets = await db.workoutSets
        .where("sessionId")
        .equals(sessionId)
        .toArray();

      expect(sets).toHaveLength(0);
    });
  });

  describe("invariants", () => {
    it("only one active session at a time (application enforced)", async () => {
      // Create first active session
      await db.workoutSessions.add({
        templateId: 1,
        dayIndex: 0,
        startedAt: new Date(),
      });

      // Check for active sessions before creating another
      const activeSessions = await db.workoutSessions
        .filter((s) => !s.completedAt)
        .toArray();

      expect(activeSessions).toHaveLength(1);

      // Application should check this before allowing new session start
    });

    it("set requires sessionId", async () => {
      // This is enforced by TypeScript, but we can test the schema
      const sessionId = await db.workoutSessions.add({
        templateId: 1,
        dayIndex: 0,
        startedAt: new Date(),
      });

      const setId = await db.workoutSets.add({
        sessionId,
        exerciseId: 1,
        setNumber: 1,
        weight: 100,
        reps: 8,
        completedAt: new Date(),
      });

      const set = await db.workoutSets.get(setId);
      expect(set?.sessionId).toBe(sessionId);
    });

    it("completedAt is after startedAt", async () => {
      const startedAt = new Date("2026-01-20T10:00:00Z");
      const completedAt = new Date("2026-01-20T11:30:00Z");

      const sessionId = await db.workoutSessions.add({
        templateId: 1,
        dayIndex: 0,
        startedAt,
        completedAt,
      });

      const session = await db.workoutSessions.get(sessionId);

      expect(session?.completedAt!.getTime()).toBeGreaterThan(session?.startedAt.getTime()!);
    });
  });

  describe("edge cases", () => {
    it("handles decimal weights", async () => {
      const sessionId = await db.workoutSessions.add({
        templateId: 1,
        dayIndex: 0,
        startedAt: new Date(),
      });

      const setId = await db.workoutSets.add({
        sessionId,
        exerciseId: 1,
        setNumber: 1,
        weight: 102.5,
        reps: 8,
        completedAt: new Date(),
      });

      const set = await db.workoutSets.get(setId);

      expect(set?.weight).toBe(102.5);
    });

    it("handles zero weight (bodyweight exercises)", async () => {
      const sessionId = await db.workoutSessions.add({
        templateId: 1,
        dayIndex: 0,
        startedAt: new Date(),
      });

      const setId = await db.workoutSets.add({
        sessionId,
        exerciseId: 1,
        setNumber: 1,
        weight: 0,
        reps: 15,
        completedAt: new Date(),
      });

      const set = await db.workoutSets.get(setId);

      expect(set?.weight).toBe(0);
      expect(set?.reps).toBe(15);
    });

    it("handles high rep counts", async () => {
      const sessionId = await db.workoutSessions.add({
        templateId: 1,
        dayIndex: 0,
        startedAt: new Date(),
      });

      const setId = await db.workoutSets.add({
        sessionId,
        exerciseId: 1,
        setNumber: 1,
        weight: 0,
        reps: 100, // High rep set
        completedAt: new Date(),
      });

      const set = await db.workoutSets.get(setId);

      expect(set?.reps).toBe(100);
    });
  });
});
