import { db } from "./db";
import { allExercises } from "../data/exercises";
import { allTemplates } from "../data/templates";

// Bump this version whenever template data changes to force a re-seed.
const SEED_VERSION = 3; // v3 = Sprint G conditional re-seed, no localStorage

export async function seedDatabase() {
  const exerciseCount = await db.exercises.count();

  // Build name→id lookup from existing or newly seeded exercises
  let nameToId: Map<string, number>;

  if (exerciseCount === 0) {
    // First run: seed exercises
    const exerciseIds = (await db.exercises.bulkAdd(
      allExercises.map((e) => ({
        name: e.name,
        muscleGroup: e.muscleGroup,
        secondaryMuscles: e.secondaryMuscles,
        equipment: e.equipment,
        isCustom: e.isCustom as boolean,
      })),
      { allKeys: true }
    )) as number[];

    nameToId = new Map<string, number>();
    allExercises.forEach((e, i) => {
      nameToId.set(e.name.toLowerCase(), exerciseIds[i]);
    });

    // Seed default preferences
    const prefsCount = await db.userPreferences.count();
    if (prefsCount === 0) {
      await db.userPreferences.add({
        weightUnit: "kg",
        theme: "system",
        restTimerEnabled: true,
        showRpePrompt: true,
        showMoodPrompt: true,
        defaultIncrement: 2.5,
        // seedVersion intentionally omitted — set after templates are seeded
      });
    }
  } else {
    // Build lookup from existing exercises
    const existing = await db.exercises.toArray();
    nameToId = new Map<string, number>();
    for (const e of existing) {
      nameToId.set(e.name.toLowerCase(), e.id!);
    }
  }

  // Read seedVersion from IndexedDB (UserPreferences)
  const prefs = await db.userPreferences.toCollection().first();
  const storedVersion = prefs?.seedVersion ?? 0;

  if (storedVersion === SEED_VERSION) {
    // Version matches — nothing to do
    console.log("Database seed check complete (version current)");
    return;
  }

  // Version mismatch — determine strategy based on whether sessions exist
  const sessionCount = await db.workoutSessions.count();

  if (sessionCount === 0) {
    // No workout sessions → safe to clear all template tables + re-seed from scratch
    await db.templateExercises.clear();
    await db.templateParts.clear();
    await db.workoutTemplates.clear();
    console.log(
      `Seed version changed (${storedVersion} → ${SEED_VERSION}), re-seeding templates (no sessions)...`
    );
  } else {
    // Sessions exist → update metadata in place, don't touch parts/exercises
    // This preserves templateId and templateExerciseId references in workoutSets
    console.log(
      `Seed version changed (${storedVersion} → ${SEED_VERSION}), updating template metadata (sessions exist)...`
    );
    const existingTemplates = await db.workoutTemplates.toArray();
    const templatesByName = new Map(existingTemplates.map((t) => [t.name, t]));

    for (const template of allTemplates) {
      const existing = templatesByName.get(template.name);
      if (existing) {
        // Update metadata only (name/desc/focus) — don't touch parts or exercises
        await db.workoutTemplates.update(existing.id!, {
          name: template.name,
          frequency: template.frequency,
          focus: template.focus,
          durationMinutes: template.durationMinutes,
          splitDays: template.splitDays,
          description: template.description,
        });
      } else {
        // Truly new template — seed fully even when sessions exist
        await seedTemplate(template, nameToId);
        console.log(`Seeded new template: ${template.name}`);
      }
    }

    // Stamp version and return early (metadata-only path)
    await stampSeedVersion(SEED_VERSION);
    console.log("Database seed check complete (metadata updated)");
    return;
  }

  // Full seed path (no sessions, tables cleared)
  for (const template of allTemplates) {
    await seedTemplate(template, nameToId);
    console.log(`Seeded template: ${template.name}`);
  }

  // Stamp the current seed version
  await stampSeedVersion(SEED_VERSION);
  console.log("Database seed check complete");
}

async function seedTemplate(
  template: (typeof allTemplates)[number],
  nameToId: Map<string, number>
) {
  const templateId = (await db.workoutTemplates.add({
    name: template.name,
    frequency: template.frequency,
    focus: template.focus,
    durationMinutes: template.durationMinutes,
    splitDays: template.splitDays,
    description: template.description,
  })) as number;

  for (const day of template.days) {
    let partOrder = 0;
    for (const part of day.parts) {
      const partId = (await db.templateParts.add({
        templateId,
        dayIndex: day.dayIndex,
        partOrder: partOrder++,
        name: part.name,
        structure: part.structure,
      })) as number;

      for (const exercise of part.exercises) {
        let exerciseId: number | undefined;
        if (exercise._exerciseName) {
          exerciseId = nameToId.get(exercise._exerciseName.toLowerCase());
          if (!exerciseId) {
            throw new Error(
              `Exercise not found during seed: "${exercise._exerciseName}"`
            );
          }
        }

        await db.templateExercises.add({
          partId,
          exerciseId,
          isChoice: exercise.isChoice,
          choiceMuscleGroup: exercise.choiceMuscleGroup,
          targetSets: exercise.targetSets,
          targetReps: exercise.targetReps,
          restSeconds: exercise.restSeconds,
          weightDescriptor: exercise.weightDescriptor,
          intensityDescriptor: exercise.intensityDescriptor,
          specialSetType: exercise.specialSetType,
          notes: exercise.notes,
          order: exercise.order,
        });
      }
    }
  }
}

async function stampSeedVersion(version: number) {
  const prefs = await db.userPreferences.toCollection().first();
  if (prefs?.id) {
    await db.userPreferences.update(prefs.id, { seedVersion: version });
  } else {
    await db.userPreferences.add({
      weightUnit: "kg",
      theme: "system",
      restTimerEnabled: true,
      showRpePrompt: true,
      showMoodPrompt: true,
      defaultIncrement: 2.5,
      seedVersion: version,
    });
  }
}
