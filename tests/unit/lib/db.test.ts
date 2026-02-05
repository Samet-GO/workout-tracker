import { describe, it, expect, beforeEach } from "vitest";
import {
  db,
  isSafari,
  isIOS,
  isPrivateBrowsing,
  getStorageEstimate,
  checkDatabaseHealth,
  isDiskFullError,
  type Exercise,
  type WorkoutSession,
  type WorkoutSet,
  type UserPreferences,
} from "@/lib/db";

describe("db", () => {
  beforeEach(async () => {
    // Clear all tables before each test
    await db.exercises.clear();
    await db.workoutTemplates.clear();
    await db.templateParts.clear();
    await db.templateExercises.clear();
    await db.workoutSessions.clear();
    await db.workoutSets.clear();
    await db.userPreferences.clear();
  });

  describe("database operations", () => {
    it("adds and retrieves an exercise", async () => {
      const exercise: Exercise = {
        name: "Barbell Bench Press",
        muscleGroup: "chest",
        equipment: "barbell",
        isCustom: false,
      };

      const id = await db.exercises.add(exercise);
      const retrieved = await db.exercises.get(id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe("Barbell Bench Press");
      expect(retrieved?.muscleGroup).toBe("chest");
    });

    it("adds and retrieves a workout session", async () => {
      const session: WorkoutSession = {
        templateId: 1,
        dayIndex: 0,
        startedAt: new Date(),
      };

      const id = await db.workoutSessions.add(session);
      const retrieved = await db.workoutSessions.get(id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.templateId).toBe(1);
      expect(retrieved?.dayIndex).toBe(0);
      expect(retrieved?.completedAt).toBeUndefined();
    });

    it("adds workout sets linked to session", async () => {
      const session: WorkoutSession = {
        templateId: 1,
        dayIndex: 0,
        startedAt: new Date(),
      };

      const sessionId = await db.workoutSessions.add(session);

      const set1: WorkoutSet = {
        sessionId,
        exerciseId: 1,
        setNumber: 1,
        weight: 100,
        reps: 8,
        completedAt: new Date(),
      };

      const set2: WorkoutSet = {
        sessionId,
        exerciseId: 1,
        setNumber: 2,
        weight: 100,
        reps: 8,
        completedAt: new Date(),
      };

      await db.workoutSets.bulkAdd([set1, set2]);

      const sets = await db.workoutSets
        .where("sessionId")
        .equals(sessionId)
        .toArray();

      expect(sets).toHaveLength(2);
      expect(sets[0].weight).toBe(100);
      expect(sets[0].reps).toBe(8);
    });

    it("updates a workout session with completion data", async () => {
      const session: WorkoutSession = {
        templateId: 1,
        dayIndex: 0,
        startedAt: new Date(),
      };

      const id = await db.workoutSessions.add(session);

      await db.workoutSessions.update(id, {
        completedAt: new Date(),
        mood: 7,
        energy: 6,
      });

      const updated = await db.workoutSessions.get(id);

      expect(updated?.completedAt).toBeDefined();
      expect(updated?.mood).toBe(7);
      expect(updated?.energy).toBe(6);
    });

    it("deletes a workout set", async () => {
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

    it("queries exercises by muscle group", async () => {
      await db.exercises.bulkAdd([
        { name: "Bench Press", muscleGroup: "chest", equipment: "barbell", isCustom: false },
        { name: "Incline Press", muscleGroup: "chest", equipment: "dumbbell", isCustom: false },
        { name: "Squat", muscleGroup: "quads", equipment: "barbell", isCustom: false },
      ]);

      const chestExercises = await db.exercises
        .where("muscleGroup")
        .equals("chest")
        .toArray();

      expect(chestExercises).toHaveLength(2);
    });

    it("filters active sessions (no completedAt)", async () => {
      await db.workoutSessions.bulkAdd([
        { templateId: 1, dayIndex: 0, startedAt: new Date(), completedAt: new Date() },
        { templateId: 1, dayIndex: 1, startedAt: new Date() },
        { templateId: 1, dayIndex: 2, startedAt: new Date(), completedAt: new Date() },
      ]);

      const activeSessions = await db.workoutSessions
        .filter((s) => !s.completedAt)
        .toArray();

      expect(activeSessions).toHaveLength(1);
      expect(activeSessions[0].dayIndex).toBe(1);
    });

    it("adds and retrieves user preferences", async () => {
      const prefs: UserPreferences = {
        weightUnit: "kg",
        theme: "dark",
        restTimerEnabled: true,
        showRpePrompt: true,
        showMoodPrompt: true,
        defaultIncrement: 2.5,
        seedVersion: 1,
      };

      const id = await db.userPreferences.add(prefs);
      const retrieved = await db.userPreferences.get(id);

      expect(retrieved?.weightUnit).toBe("kg");
      expect(retrieved?.theme).toBe("dark");
      expect(retrieved?.defaultIncrement).toBe(2.5);
    });
  });

  describe("transactions", () => {
    it("rolls back on transaction error", async () => {
      const sessionId = await db.workoutSessions.add({
        templateId: 1,
        dayIndex: 0,
        startedAt: new Date(),
      });

      try {
        await db.transaction("rw", [db.workoutSets], async () => {
          await db.workoutSets.add({
            sessionId,
            exerciseId: 1,
            setNumber: 1,
            weight: 100,
            reps: 8,
            completedAt: new Date(),
          });
          throw new Error("Simulated failure");
        });
      } catch {
        // Expected error
      }

      const sets = await db.workoutSets.toArray();
      expect(sets).toHaveLength(0);
    });
  });

  describe("cascade operations", () => {
    it("deletes session and its sets together", async () => {
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

      // Delete sets first, then session (manual cascade)
      await db.workoutSets.where("sessionId").equals(sessionId).delete();
      await db.workoutSessions.delete(sessionId);

      const session = await db.workoutSessions.get(sessionId);
      const sets = await db.workoutSets.where("sessionId").equals(sessionId).toArray();

      expect(session).toBeUndefined();
      expect(sets).toHaveLength(0);
    });
  });
});

describe("utility functions", () => {
  describe("isSafari", () => {
    it("returns false in test environment", () => {
      expect(isSafari()).toBe(false);
    });
  });

  describe("isIOS", () => {
    it("returns false in test environment", () => {
      expect(isIOS()).toBe(false);
    });
  });

  describe("isPrivateBrowsing", () => {
    it("returns false when quota is non-zero", async () => {
      const result = await isPrivateBrowsing();
      expect(result).toBe(false);
    });
  });

  describe("getStorageEstimate", () => {
    it("returns storage estimate", async () => {
      const estimate = await getStorageEstimate();
      expect(estimate).toBeDefined();
      expect(estimate?.used).toBe(1000);
      expect(estimate?.quota).toBe(100000000);
    });
  });

  describe("checkDatabaseHealth", () => {
    it("returns ok: true when database is healthy", async () => {
      const health = await checkDatabaseHealth();
      expect(health.ok).toBe(true);
      expect(health.isSafari).toBe(false);
      expect(health.isIOS).toBe(false);
    });
  });

  describe("isDiskFullError", () => {
    it("detects QuotaExceededError", () => {
      const error = { name: "QuotaExceededError", message: "Storage full" };
      expect(isDiskFullError(error)).toBe(true);
    });

    it("detects wrapped QuotaExceededError in AbortError", () => {
      const error = {
        name: "AbortError",
        inner: { name: "QuotaExceededError", message: "Storage full" },
      };
      expect(isDiskFullError(error)).toBe(true);
    });

    it("detects quota in message", () => {
      const error = { name: "Error", message: "Quota exceeded" };
      expect(isDiskFullError(error)).toBe(true);
    });

    it("returns false for unrelated errors", () => {
      const error = { name: "TypeError", message: "Something went wrong" };
      expect(isDiskFullError(error)).toBe(false);
    });

    it("returns false for null/undefined", () => {
      expect(isDiskFullError(null)).toBe(false);
      expect(isDiskFullError(undefined)).toBe(false);
    });
  });
});
