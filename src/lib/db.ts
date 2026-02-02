import Dexie, { type EntityTable } from "dexie";
import type {
  MuscleGroup,
  EquipmentType,
  SpecialSetType,
  WeightUnit,
  SplitFocus,
  StructureType,
} from "./constants";

// ── Entity types ──

export interface Exercise {
  id?: number;
  name: string;
  muscleGroup: MuscleGroup;
  secondaryMuscles?: MuscleGroup[];
  equipment: EquipmentType;
  isCustom: boolean;
}

export interface WorkoutTemplate {
  id?: number;
  name: string;
  frequency: number; // days per week
  focus: string;
  durationMinutes: number;
  splitDays: SplitFocus[];
  description?: string;
}

export interface TemplatePart {
  id?: number;
  templateId: number;
  dayIndex: number;
  partOrder: number;
  name: string;
  structure?: StructureType;
}

export interface TemplateExercise {
  id?: number;
  partId: number;
  exerciseId?: number;
  isChoice: boolean;
  choiceMuscleGroup?: MuscleGroup;
  targetSets: number;
  targetReps: string; // e.g. "8-12", "5", "AMRAP"
  restSeconds: number;
  weightDescriptor?: string; // e.g. "moderate", "heavy"
  intensityDescriptor?: string; // e.g. "RPE 7-8"
  specialSetType?: SpecialSetType;
  notes?: string;
  order: number;
}

export interface WorkoutSession {
  id?: number;
  templateId: number;
  dayIndex: number;
  startedAt: Date;
  completedAt?: Date;
  mood?: number; // 1-10
  energy?: number; // 1-10
  notes?: string;
}

export interface WorkoutSet {
  id?: number;
  sessionId: number;
  exerciseId: number;
  templateExerciseId?: number;
  setNumber: number;
  weight: number;
  reps: number;
  rpe?: number;
  partialsCount?: number;
  dropSetWeight?: number;
  dropSetReps?: number;
  forcedRepsCount?: number;
  isPausedReps?: boolean;
  completedAt: Date;
}

export interface UserPreferences {
  id?: number;
  weightUnit: WeightUnit;
  activeTemplateId?: number;
  theme: "light" | "dark" | "system";
  restTimerEnabled: boolean;
  showRpePrompt: boolean;
  defaultIncrement: number;
  seedVersion?: number;
}

// ── Database class ──

class WorkoutDB extends Dexie {
  exercises!: EntityTable<Exercise, "id">;
  workoutTemplates!: EntityTable<WorkoutTemplate, "id">;
  templateParts!: EntityTable<TemplatePart, "id">;
  templateExercises!: EntityTable<TemplateExercise, "id">;
  workoutSessions!: EntityTable<WorkoutSession, "id">;
  workoutSets!: EntityTable<WorkoutSet, "id">;
  userPreferences!: EntityTable<UserPreferences, "id">;

  constructor() {
    super("WorkoutTrackerDB");

    this.version(1).stores({
      exercises: "++id, name, muscleGroup, equipment, isCustom",
      workoutTemplates: "++id, name, frequency",
      templateParts: "++id, templateId, dayIndex, partOrder",
      templateExercises: "++id, partId, exerciseId, isChoice, order",
      workoutSessions: "++id, templateId, dayIndex, startedAt, completedAt",
      workoutSets: "++id, sessionId, exerciseId, templateExerciseId, completedAt",
      userPreferences: "++id",
    });
  }
}

export const db = new WorkoutDB();
