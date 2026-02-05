import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/lib/db";
import {
  exportAllData,
  importData,
  saveBackupLocally,
  getBackupMeta,
  getLocalBackup,
  restoreFromLocalBackup,
  isFileSystemAccessSupported,
  type ExportData,
} from "@/lib/export";

describe("export", () => {
  beforeEach(async () => {
    // Clear all tables and localStorage before each test
    await db.exercises.clear();
    await db.workoutTemplates.clear();
    await db.templateParts.clear();
    await db.templateExercises.clear();
    await db.workoutSessions.clear();
    await db.workoutSets.clear();
    await db.userPreferences.clear();
    localStorage.clear();
  });

  describe("exportAllData", () => {
    it("exports empty database", async () => {
      const data = await exportAllData();

      expect(data.version).toBe(1);
      expect(data.exportedAt).toBeDefined();
      expect(data.exercises).toEqual([]);
      expect(data.workoutSessions).toEqual([]);
      expect(data.workoutSets).toEqual([]);
    });

    it("exports all data from database", async () => {
      // Seed test data
      await db.exercises.add({
        name: "Bench Press",
        muscleGroup: "chest",
        equipment: "barbell",
        isCustom: false,
      });

      await db.workoutTemplates.add({
        name: "Test Template",
        frequency: 3,
        focus: "strength",
        durationMinutes: 60,
        splitDays: ["push", "pull", "legs"],
      });

      const sessionId = await db.workoutSessions.add({
        templateId: 1,
        dayIndex: 0,
        startedAt: new Date("2026-01-15T10:00:00Z"),
        completedAt: new Date("2026-01-15T11:00:00Z"),
        mood: 7,
        energy: 8,
      });

      await db.workoutSets.add({
        sessionId,
        exerciseId: 1,
        setNumber: 1,
        weight: 100,
        reps: 8,
        rpe: 7,
        completedAt: new Date("2026-01-15T10:15:00Z"),
      });

      await db.userPreferences.add({
        weightUnit: "kg",
        theme: "dark",
        restTimerEnabled: true,
        showRpePrompt: true,
        showMoodPrompt: true,
        defaultIncrement: 2.5,
        seedVersion: 1,
      });

      const data = await exportAllData();

      expect(data.version).toBe(1);
      expect(data.exercises).toHaveLength(1);
      expect(data.exercises[0].name).toBe("Bench Press");
      expect(data.workoutTemplates).toHaveLength(1);
      expect(data.workoutSessions).toHaveLength(1);
      expect(data.workoutSessions[0].mood).toBe(7);
      expect(data.workoutSets).toHaveLength(1);
      expect(data.workoutSets[0].weight).toBe(100);
      expect(data.userPreferences).toHaveLength(1);
      expect(data.userPreferences[0].weightUnit).toBe("kg");
    });

    it("exports large dataset correctly", async () => {
      // Add 100 sessions with 10 sets each
      const exerciseId = await db.exercises.add({
        name: "Test Exercise",
        muscleGroup: "chest",
        equipment: "barbell",
        isCustom: false,
      });

      const templateId = await db.workoutTemplates.add({
        name: "Test Template",
        frequency: 3,
        focus: "strength",
        durationMinutes: 60,
        splitDays: ["push"],
      });

      for (let i = 0; i < 100; i++) {
        const sessionId = await db.workoutSessions.add({
          templateId,
          dayIndex: 0,
          startedAt: new Date(Date.now() - i * 86400000), // Different days
          completedAt: new Date(Date.now() - i * 86400000 + 3600000),
        });

        const sets = Array.from({ length: 10 }, (_, j) => ({
          sessionId,
          exerciseId,
          setNumber: j + 1,
          weight: 100 + j,
          reps: 8,
          completedAt: new Date(),
        }));

        await db.workoutSets.bulkAdd(sets);
      }

      const data = await exportAllData();

      expect(data.workoutSessions).toHaveLength(100);
      expect(data.workoutSets).toHaveLength(1000);
    });
  });

  describe("importData", () => {
    it("imports valid backup file", async () => {
      const backup: ExportData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        exercises: [
          { id: 1, name: "Squat", muscleGroup: "quads", equipment: "barbell", isCustom: false },
          { id: 2, name: "Deadlift", muscleGroup: "back", equipment: "barbell", isCustom: false },
        ],
        workoutTemplates: [
          { id: 1, name: "Template", frequency: 3, focus: "strength", durationMinutes: 60, splitDays: ["lower"] },
        ],
        templateParts: [],
        templateExercises: [],
        workoutSessions: [
          { id: 1, templateId: 1, dayIndex: 0, startedAt: new Date("2026-01-10"), completedAt: new Date("2026-01-10") },
        ],
        workoutSets: [
          { id: 1, sessionId: 1, exerciseId: 1, setNumber: 1, weight: 140, reps: 5, completedAt: new Date("2026-01-10") },
        ],
        userPreferences: [
          { id: 1, weightUnit: "kg", theme: "light", restTimerEnabled: true, showRpePrompt: true, showMoodPrompt: true, defaultIncrement: 2.5 },
        ],
      };

      const file = new File([JSON.stringify(backup)], "backup.json", { type: "application/json" });
      const result = await importData(file);

      expect(result.success).toBe(true);

      const exercises = await db.exercises.toArray();
      expect(exercises).toHaveLength(2);
      expect(exercises[0].name).toBe("Squat");

      const sessions = await db.workoutSessions.toArray();
      expect(sessions).toHaveLength(1);

      const sets = await db.workoutSets.toArray();
      expect(sets).toHaveLength(1);
      expect(sets[0].weight).toBe(140);
    });

    it("clears existing data on import", async () => {
      // Add existing data
      await db.exercises.add({ name: "Old Exercise", muscleGroup: "chest", equipment: "barbell", isCustom: false });
      await db.workoutSessions.add({ templateId: 1, dayIndex: 0, startedAt: new Date() });

      const backup: ExportData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        exercises: [
          { id: 1, name: "New Exercise", muscleGroup: "back", equipment: "cable", isCustom: false },
        ],
        workoutTemplates: [],
        templateParts: [],
        templateExercises: [],
        workoutSessions: [],
        workoutSets: [],
        userPreferences: [],
      };

      const file = new File([JSON.stringify(backup)], "backup.json");
      await importData(file);

      const exercises = await db.exercises.toArray();
      expect(exercises).toHaveLength(1);
      expect(exercises[0].name).toBe("New Exercise");

      const sessions = await db.workoutSessions.toArray();
      expect(sessions).toHaveLength(0);
    });

    it("rejects unsupported version", async () => {
      const backup = {
        version: 99,
        exportedAt: new Date().toISOString(),
        exercises: [],
        workoutTemplates: [],
        templateParts: [],
        templateExercises: [],
        workoutSessions: [],
        workoutSets: [],
        userPreferences: [],
      };

      const file = new File([JSON.stringify(backup)], "backup.json");
      const result = await importData(file);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unsupported backup version");
    });

    it("handles corrupt JSON gracefully", async () => {
      const file = new File(["not valid json {{{"], "backup.json");
      const result = await importData(file);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("handles empty file gracefully", async () => {
      const file = new File([""], "backup.json");
      const result = await importData(file);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("localStorage backup", () => {
    it("saves backup to localStorage", async () => {
      await db.exercises.add({
        name: "Press",
        muscleGroup: "shoulders",
        equipment: "barbell",
        isCustom: false,
      });

      const sessionId = await db.workoutSessions.add({
        templateId: 1,
        dayIndex: 0,
        startedAt: new Date(),
        completedAt: new Date(),
      });

      await db.workoutSets.add({
        sessionId,
        exerciseId: 1,
        setNumber: 1,
        weight: 60,
        reps: 10,
        completedAt: new Date(),
      });

      await saveBackupLocally();

      const meta = getBackupMeta();
      expect(meta).toBeDefined();
      expect(meta?.sessionCount).toBe(1);
      expect(meta?.setCount).toBe(1);
      expect(meta?.savedAt).toBeDefined();
    });

    it("retrieves local backup", async () => {
      await db.exercises.add({
        name: "Curl",
        muscleGroup: "biceps",
        equipment: "dumbbell",
        isCustom: false,
      });

      await saveBackupLocally();

      const backup = getLocalBackup();
      expect(backup).toBeDefined();
      expect(backup?.version).toBe(1);
      expect(backup?.exercises).toHaveLength(1);
      expect(backup?.exercises[0].name).toBe("Curl");
    });

    it("returns null when no backup exists", () => {
      const backup = getLocalBackup();
      expect(backup).toBeNull();

      const meta = getBackupMeta();
      expect(meta).toBeNull();
    });
  });

  describe("restoreFromLocalBackup", () => {
    it("restores data from local backup", async () => {
      // Create and save backup
      await db.exercises.add({
        name: "Original Exercise",
        muscleGroup: "chest",
        equipment: "barbell",
        isCustom: false,
      });
      await saveBackupLocally();

      // Clear database (simulating data loss)
      await db.exercises.clear();

      // Restore from backup
      const result = await restoreFromLocalBackup();

      expect(result.success).toBe(true);

      const exercises = await db.exercises.toArray();
      expect(exercises).toHaveLength(1);
      expect(exercises[0].name).toBe("Original Exercise");
    });

    it("returns error when no backup exists", async () => {
      const result = await restoreFromLocalBackup();

      expect(result.success).toBe(false);
      expect(result.error).toBe("No local backup found");
    });
  });

  describe("export/import roundtrip", () => {
    it("preserves all data through export/import cycle", async () => {
      // Setup complex data
      const exerciseId = await db.exercises.add({
        name: "Complex Exercise",
        muscleGroup: "back",
        secondaryMuscles: ["biceps", "forearms"],
        equipment: "cable",
        isCustom: true,
      });

      const templateId = await db.workoutTemplates.add({
        name: "Full Template",
        frequency: 4,
        focus: "hypertrophy",
        durationMinutes: 75,
        splitDays: ["upper", "lower", "push", "pull"],
        description: "A comprehensive template",
      });

      const partId = await db.templateParts.add({
        templateId,
        dayIndex: 0,
        partOrder: 0,
        name: "Main Lifts",
        structure: "straight-sets",
      });

      await db.templateExercises.add({
        partId,
        exerciseId,
        isChoice: false,
        targetSets: 4,
        targetReps: "8-12",
        restSeconds: 120,
        weightDescriptor: "moderate",
        order: 0,
      });

      const sessionId = await db.workoutSessions.add({
        templateId,
        dayIndex: 0,
        startedAt: new Date("2026-01-20T09:00:00Z"),
        completedAt: new Date("2026-01-20T10:15:00Z"),
        mood: 8,
        energy: 7,
        notes: "Great workout!",
      });

      await db.workoutSets.add({
        sessionId,
        exerciseId,
        templateExerciseId: 1,
        setNumber: 1,
        weight: 80,
        reps: 10,
        rpe: 8,
        completedAt: new Date("2026-01-20T09:30:00Z"),
      });

      await db.userPreferences.add({
        weightUnit: "lbs",
        activeTemplateId: templateId,
        theme: "system",
        restTimerEnabled: false,
        showRpePrompt: false,
        showMoodPrompt: true,
        defaultIncrement: 5,
        seedVersion: 2,
      });

      // Export
      const exported = await exportAllData();

      // Clear everything
      await db.exercises.clear();
      await db.workoutTemplates.clear();
      await db.templateParts.clear();
      await db.templateExercises.clear();
      await db.workoutSessions.clear();
      await db.workoutSets.clear();
      await db.userPreferences.clear();

      // Import
      const file = new File([JSON.stringify(exported)], "backup.json");
      const result = await importData(file);
      expect(result.success).toBe(true);

      // Verify all data restored
      const exercises = await db.exercises.toArray();
      expect(exercises).toHaveLength(1);
      expect(exercises[0].name).toBe("Complex Exercise");
      expect(exercises[0].secondaryMuscles).toEqual(["biceps", "forearms"]);

      const templates = await db.workoutTemplates.toArray();
      expect(templates).toHaveLength(1);
      expect(templates[0].description).toBe("A comprehensive template");

      const parts = await db.templateParts.toArray();
      expect(parts).toHaveLength(1);
      expect(parts[0].structure).toBe("straight-sets");

      const templateExercises = await db.templateExercises.toArray();
      expect(templateExercises).toHaveLength(1);
      expect(templateExercises[0].targetReps).toBe("8-12");

      const sessions = await db.workoutSessions.toArray();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].mood).toBe(8);
      expect(sessions[0].notes).toBe("Great workout!");

      const sets = await db.workoutSets.toArray();
      expect(sets).toHaveLength(1);
      expect(sets[0].rpe).toBe(8);

      const prefs = await db.userPreferences.toArray();
      expect(prefs).toHaveLength(1);
      expect(prefs[0].weightUnit).toBe("lbs");
      expect(prefs[0].defaultIncrement).toBe(5);
    });
  });

  describe("isFileSystemAccessSupported", () => {
    it("returns false when showDirectoryPicker not available", () => {
      expect(isFileSystemAccessSupported()).toBe(false);
    });
  });
});
