import {
  db,
  type Exercise,
  type WorkoutTemplate,
  type TemplatePart,
  type TemplateExercise,
  type WorkoutSession,
  type WorkoutSet,
  type UserPreferences,
} from "./db";

export interface ExportData {
  version: 1;
  exportedAt: string;
  exercises: Exercise[];
  workoutTemplates: WorkoutTemplate[];
  templateParts: TemplatePart[];
  templateExercises: TemplateExercise[];
  workoutSessions: WorkoutSession[];
  workoutSets: WorkoutSet[];
  userPreferences: UserPreferences[];
}

export async function exportAllData(): Promise<ExportData> {
  const [
    exercises,
    workoutTemplates,
    templateParts,
    templateExercises,
    workoutSessions,
    workoutSets,
    userPreferences,
  ] = await Promise.all([
    db.exercises.toArray(),
    db.workoutTemplates.toArray(),
    db.templateParts.toArray(),
    db.templateExercises.toArray(),
    db.workoutSessions.toArray(),
    db.workoutSets.toArray(),
    db.userPreferences.toArray(),
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    exercises,
    workoutTemplates,
    templateParts,
    templateExercises,
    workoutSessions,
    workoutSets,
    userPreferences,
  };
}

export function downloadJson(data: ExportData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `workout-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importData(
  file: File
): Promise<{ success: boolean; error?: string }> {
  try {
    const text = await file.text();
    const data = JSON.parse(text) as ExportData;

    if (data.version !== 1) {
      return { success: false, error: "Unsupported backup version" };
    }

    // Clear existing data and import
    await db.transaction(
      "rw",
      [
        db.exercises,
        db.workoutTemplates,
        db.templateParts,
        db.templateExercises,
        db.workoutSessions,
        db.workoutSets,
        db.userPreferences,
      ],
      async () => {
        await Promise.all([
          db.exercises.clear(),
          db.workoutTemplates.clear(),
          db.templateParts.clear(),
          db.templateExercises.clear(),
          db.workoutSessions.clear(),
          db.workoutSets.clear(),
          db.userPreferences.clear(),
        ]);

        await Promise.all([
          db.exercises.bulkAdd(data.exercises),
          db.workoutTemplates.bulkAdd(data.workoutTemplates),
          db.templateParts.bulkAdd(data.templateParts),
          db.templateExercises.bulkAdd(data.templateExercises),
          db.workoutSessions.bulkAdd(data.workoutSessions),
          db.workoutSets.bulkAdd(data.workoutSets),
          db.userPreferences.bulkAdd(data.userPreferences),
        ]);
      }
    );

    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Import failed",
    };
  }
}
