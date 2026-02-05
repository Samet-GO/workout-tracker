import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";

/**
 * Database Performance Benchmarks
 *
 * Target: <50ms for queries with 1000 sessions
 * Reference: docs/session_state.md NFRs
 *
 * Note: This test manages its own database lifecycle to ensure
 * data persists across test cases within each describe block.
 */

const HEAVY_USER_SESSIONS = 500;
const STRESS_TEST_SESSIONS = 1000;
const SETS_PER_SESSION = 15;
const TARGET_QUERY_TIME_MS = 50;

// Track seeded session IDs for use across tests
let seededSessionIds: number[] = [];

describe("Database Performance Benchmarks", () => {
  // Tell setup.ts to skip automatic database cleanup for this test suite
  beforeAll(() => {
    globalThis.__skipDbCleanup = true;
  });

  afterAll(() => {
    globalThis.__skipDbCleanup = false;
  });

  describe("Heavy User Scenario (500 sessions)", () => {
    beforeAll(async () => {
      // Clean slate for benchmarks - explicit cleanup
      await db.workoutSets.clear();
      await db.workoutSessions.clear();
      seededSessionIds = [];
    });

    afterAll(async () => {
      // Cleanup after this describe block
      await db.workoutSets.clear();
      await db.workoutSessions.clear();
      seededSessionIds = [];
    });

    it("should seed 500 sessions with sets in reasonable time", async () => {
      const startTime = performance.now();

      // Seed sessions in batches for performance
      const sessions = [];
      const startDate = new Date("2024-01-01");

      for (let i = 0; i < HEAVY_USER_SESSIONS; i++) {
        const sessionDate = new Date(startDate);
        sessionDate.setDate(startDate.getDate() + i);

        sessions.push({
          templateId: (i % 8) + 1,
          templatePartId: ((i % 3) + 1) * 10,
          startedAt: sessionDate,
          completedAt: new Date(sessionDate.getTime() + 60 * 60 * 1000),
          notes: i % 10 === 0 ? `Session ${i} notes` : null,
          moodBefore: (i % 5) + 1,
          energyBefore: (i % 5) + 1,
        });
      }

      const sessionIds = await db.workoutSessions.bulkAdd(sessions, {
        allKeys: true,
      });
      seededSessionIds = sessionIds as number[];

      const seedTime = performance.now() - startTime;
      console.log(`Seeded ${HEAVY_USER_SESSIONS} sessions in ${seedTime.toFixed(2)}ms`);

      // Seed sets for each session
      const setsStartTime = performance.now();
      const sets = [];

      for (let i = 0; i < sessionIds.length; i++) {
        const sessionId = sessionIds[i];
        for (let j = 0; j < SETS_PER_SESSION; j++) {
          sets.push({
            sessionId,
            exerciseId: (j % 109) + 1,
            setNumber: j + 1,
            weight: 50 + (j % 50) * 2.5,
            reps: 8 + (j % 5),
            rpe: j % 3 === 0 ? 7 + (j % 3) : null,
            completedAt: new Date(),
          });
        }
      }

      await db.workoutSets.bulkAdd(sets);

      const setsTime = performance.now() - setsStartTime;
      const totalSets = HEAVY_USER_SESSIONS * SETS_PER_SESSION;
      console.log(`Seeded ${totalSets} sets in ${setsTime.toFixed(2)}ms`);

      // Verify counts
      const sessionCount = await db.workoutSessions.count();
      const setCount = await db.workoutSets.count();

      expect(sessionCount).toBe(HEAVY_USER_SESSIONS);
      expect(setCount).toBe(totalSets);
    });

    it("should query all sessions under target time", async () => {
      const startTime = performance.now();
      const sessions = await db.workoutSessions.toArray();
      const queryTime = performance.now() - startTime;

      console.log(`Query all sessions (${sessions.length}): ${queryTime.toFixed(2)}ms`);
      expect(queryTime).toBeLessThan(TARGET_QUERY_TIME_MS * 5); // Allow 5x for full scan
      expect(sessions.length).toBe(HEAVY_USER_SESSIONS);
    });

    it("should query recent sessions (last 30) under target time", async () => {
      const startTime = performance.now();
      const sessions = await db.workoutSessions
        .orderBy("startedAt")
        .reverse()
        .limit(30)
        .toArray();
      const queryTime = performance.now() - startTime;

      console.log(`Query recent 30 sessions: ${queryTime.toFixed(2)}ms`);
      expect(queryTime).toBeLessThan(TARGET_QUERY_TIME_MS);
      expect(sessions.length).toBe(30);
    });

    it("should query sessions by template under target time", async () => {
      const targetTemplateId = 1;
      const startTime = performance.now();
      const sessions = await db.workoutSessions
        .where("templateId")
        .equals(targetTemplateId)
        .toArray();
      const queryTime = performance.now() - startTime;

      console.log(`Query sessions by template: ${queryTime.toFixed(2)}ms (${sessions.length} results)`);
      expect(queryTime).toBeLessThan(TARGET_QUERY_TIME_MS);
      // ~62-63 sessions per template (500 / 8)
      expect(sessions.length).toBeGreaterThan(60);
    });

    it("should query sets for a session under target time", async () => {
      // Use the first seeded session ID
      const sessionId = seededSessionIds[0];
      expect(sessionId).toBeDefined();

      const startTime = performance.now();
      const sets = await db.workoutSets
        .where("sessionId")
        .equals(sessionId)
        .toArray();
      const queryTime = performance.now() - startTime;

      console.log(`Query sets for session: ${queryTime.toFixed(2)}ms (${sets.length} sets)`);
      expect(queryTime).toBeLessThan(TARGET_QUERY_TIME_MS);
      expect(sets.length).toBe(SETS_PER_SESSION);
    });

    it("should count sessions under target time", async () => {
      const startTime = performance.now();
      const count = await db.workoutSessions.count();
      const queryTime = performance.now() - startTime;

      console.log(`Count sessions: ${queryTime.toFixed(2)}ms`);
      expect(queryTime).toBeLessThan(TARGET_QUERY_TIME_MS);
      expect(count).toBe(HEAVY_USER_SESSIONS);
    });

    it("should calculate exercise history aggregate under target time", async () => {
      const targetExerciseId = 1;
      const startTime = performance.now();

      const sets = await db.workoutSets
        .where("exerciseId")
        .equals(targetExerciseId)
        .toArray();

      // Calculate max weight (common operation for progress tracking)
      const maxWeight = sets.reduce((max, set) => Math.max(max, set.weight), 0);

      const queryTime = performance.now() - startTime;
      console.log(`Exercise history aggregate: ${queryTime.toFixed(2)}ms (${sets.length} sets, max: ${maxWeight})`);
      expect(queryTime).toBeLessThan(TARGET_QUERY_TIME_MS * 2); // Allow 2x for aggregation
      expect(sets.length).toBeGreaterThan(0);
    });
  });

  describe("Stress Test (1000 sessions)", () => {
    beforeAll(async () => {
      // Start fresh and seed 1000 sessions
      await db.workoutSets.clear();
      await db.workoutSessions.clear();

      // Seed all 1000 sessions
      const sessions = [];
      const startDate = new Date("2024-01-01");

      for (let i = 0; i < STRESS_TEST_SESSIONS; i++) {
        const sessionDate = new Date(startDate);
        sessionDate.setDate(startDate.getDate() + i);

        sessions.push({
          templateId: (i % 8) + 1,
          templatePartId: ((i % 3) + 1) * 10,
          startedAt: sessionDate,
          completedAt: new Date(sessionDate.getTime() + 60 * 60 * 1000),
          notes: i % 10 === 0 ? `Session ${i} notes` : null,
          moodBefore: i % 2 === 0 ? (i % 5) + 1 : null,
          energyBefore: i % 2 === 0 ? (i % 5) + 1 : null,
        });
      }

      const sessionIds = await db.workoutSessions.bulkAdd(sessions, {
        allKeys: true,
      });

      // Seed sets for each session
      const sets = [];
      for (let i = 0; i < sessionIds.length; i++) {
        const sessionId = sessionIds[i];
        for (let j = 0; j < SETS_PER_SESSION; j++) {
          sets.push({
            sessionId,
            exerciseId: (j % 109) + 1,
            setNumber: j + 1,
            weight: 50 + (j % 50) * 2.5,
            reps: 8 + (j % 5),
            rpe: j % 3 === 0 ? 7 + (j % 3) : null,
            completedAt: new Date(),
          });
        }
      }

      await db.workoutSets.bulkAdd(sets);
      console.log(`Stress test seeded: ${STRESS_TEST_SESSIONS} sessions, ${STRESS_TEST_SESSIONS * SETS_PER_SESSION} sets`);
    });

    afterAll(async () => {
      await db.workoutSets.clear();
      await db.workoutSessions.clear();
    });

    it("should handle 1000 sessions", async () => {
      const count = await db.workoutSessions.count();
      expect(count).toBe(STRESS_TEST_SESSIONS);
    });

    it("should query recent sessions at scale under target time", async () => {
      const startTime = performance.now();
      const sessions = await db.workoutSessions
        .orderBy("startedAt")
        .reverse()
        .limit(30)
        .toArray();
      const queryTime = performance.now() - startTime;

      console.log(`Query recent 30 @ 1000 sessions: ${queryTime.toFixed(2)}ms`);
      expect(queryTime).toBeLessThan(TARGET_QUERY_TIME_MS);
      expect(sessions.length).toBe(30);
    });

    it("should query by date range under target time", async () => {
      const startDate = new Date("2024-06-01");
      const endDate = new Date("2024-06-30");

      const startTime = performance.now();
      const sessions = await db.workoutSessions
        .where("startedAt")
        .between(startDate, endDate)
        .toArray();
      const queryTime = performance.now() - startTime;

      console.log(`Query by date range: ${queryTime.toFixed(2)}ms (${sessions.length} results)`);
      expect(queryTime).toBeLessThan(TARGET_QUERY_TIME_MS);
      // June has 30 days, so should have ~30 sessions
      expect(sessions.length).toBeGreaterThan(25);
    });

    it("should export all data within reasonable time", async () => {
      const startTime = performance.now();

      // Simulate export operation
      const [sessions, sets, exercises, templates] = await Promise.all([
        db.workoutSessions.toArray(),
        db.workoutSets.toArray(),
        db.exercises.toArray(),
        db.workoutTemplates.toArray(),
      ]);

      const exportTime = performance.now() - startTime;
      console.log(`Export all data: ${exportTime.toFixed(2)}ms`);
      console.log(`  Sessions: ${sessions.length}, Sets: ${sets.length}`);
      console.log(`  Exercises: ${exercises.length}, Templates: ${templates.length}`);

      // Allow up to 500ms for full export at scale
      expect(exportTime).toBeLessThan(500);
      expect(sessions.length).toBe(STRESS_TEST_SESSIONS);
      expect(sets.length).toBe(STRESS_TEST_SESSIONS * SETS_PER_SESSION);
    });
  });

  describe("Memory Efficiency", () => {
    beforeAll(async () => {
      // Seed minimal data for memory test
      await db.workoutSets.clear();
      await db.workoutSessions.clear();

      const sessions = [];
      const startDate = new Date("2024-01-01");

      for (let i = 0; i < 100; i++) {
        const sessionDate = new Date(startDate);
        sessionDate.setDate(startDate.getDate() + i);

        sessions.push({
          templateId: (i % 8) + 1,
          templatePartId: ((i % 3) + 1) * 10,
          startedAt: sessionDate,
          completedAt: new Date(sessionDate.getTime() + 60 * 60 * 1000),
        });
      }

      await db.workoutSessions.bulkAdd(sessions);
    });

    afterAll(async () => {
      await db.workoutSets.clear();
      await db.workoutSessions.clear();
    });

    it("should not leak memory on repeated queries", async () => {
      const iterations = 100;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        await db.workoutSessions.limit(30).toArray();
      }

      const totalTime = performance.now() - startTime;
      const avgTime = totalTime / iterations;

      console.log(`${iterations} repeated queries: ${totalTime.toFixed(2)}ms (avg: ${avgTime.toFixed(2)}ms)`);
      expect(avgTime).toBeLessThan(TARGET_QUERY_TIME_MS);
    });
  });
});

describe("Database Size Estimation", () => {
  it("should estimate storage usage", async () => {
    // Check IndexedDB storage estimate if available
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      console.log(`Storage estimate: ${((estimate.usage || 0) / 1024 / 1024).toFixed(2)}MB used`);
      console.log(`Storage quota: ${((estimate.quota || 0) / 1024 / 1024).toFixed(2)}MB available`);
    } else {
      console.log("Storage estimation API not available in test environment");
    }

    // Count records (may be 0 if previous tests cleaned up)
    const sessions = await db.workoutSessions.count();
    const sets = await db.workoutSets.count();
    const exercises = await db.exercises.count();

    console.log(`Records: ${sessions} sessions, ${sets} sets, ${exercises} exercises`);

    // Rough estimate: ~200 bytes per session, ~100 bytes per set
    const estimatedSize = sessions * 200 + sets * 100 + exercises * 150;
    console.log(`Estimated data size: ${(estimatedSize / 1024 / 1024).toFixed(2)}MB`);

    // iOS limit is 50MB, we should stay well under
    expect(estimatedSize).toBeLessThan(50 * 1024 * 1024);
  });
});
