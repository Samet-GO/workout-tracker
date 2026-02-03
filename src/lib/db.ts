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
  showMoodPrompt: boolean;
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

// Error handling for database operations
db.on("blocked", () => {
  console.warn("Database blocked - another tab may have an older version open");
});

// Detect Safari (for 7-day eviction warning)
export function isSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes("safari") && !ua.includes("chrome") && !ua.includes("chromium");
}

// Detect iOS
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

// Detect private browsing (best effort)
export async function isPrivateBrowsing(): Promise<boolean> {
  // Firefox <115 private mode: IndexedDB throws specific error
  // Firefox 115+: Works but data lost on restart
  // Safari: storage.estimate() returns 0 quota in private mode
  try {
    if (navigator.storage?.estimate) {
      const estimate = await navigator.storage.estimate();
      // Safari private mode reports 0 quota
      if (estimate.quota === 0) return true;
    }
  } catch {
    // Ignore
  }
  return false;
}

// Get storage estimate
export async function getStorageEstimate(): Promise<{
  used: number;
  quota: number;
  percentUsed: number;
} | null> {
  if (!navigator.storage?.estimate) return null;
  try {
    const estimate = await navigator.storage.estimate();
    const used = estimate.usage ?? 0;
    const quota = estimate.quota ?? 0;
    return {
      used,
      quota,
      percentUsed: quota > 0 ? (used / quota) * 100 : 0,
    };
  } catch {
    return null;
  }
}

// Check database health with comprehensive diagnostics
export async function checkDatabaseHealth(): Promise<{
  ok: boolean;
  error?: string;
  persisted?: boolean;
  isPrivate?: boolean;
  isSafari?: boolean;
  isIOS?: boolean;
  storageEstimate?: { used: number; quota: number; percentUsed: number } | null;
}> {
  const safari = isSafari();
  const ios = isIOS();

  try {
    // Try a simple read operation
    await db.userPreferences.count();

    // Check storage persistence
    let persisted = false;
    if (navigator.storage?.persisted) {
      persisted = await navigator.storage.persisted();
    }

    const isPrivate = await isPrivateBrowsing();
    const storageEstimate = await getStorageEstimate();

    return {
      ok: true,
      persisted,
      isPrivate,
      isSafari: safari,
      isIOS: ios,
      storageEstimate,
    };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "Database unavailable";

    // Detect Firefox private browsing specific error
    if (errorMessage.includes("mutation operation")) {
      return {
        ok: false,
        error: "Private browsing mode detected. Data cannot be saved.",
        isPrivate: true,
        isSafari: safari,
        isIOS: ios,
      };
    }

    return {
      ok: false,
      error: errorMessage,
      isSafari: safari,
      isIOS: ios,
    };
  }
}

// Request persistent storage
export async function requestPersistentStorage(): Promise<boolean> {
  if (navigator.storage?.persist) {
    return navigator.storage.persist();
  }
  return false;
}

// Handle Dexie errors properly (QuotaExceededError can be wrapped in AbortError)
export function isDiskFullError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const err = error as { name?: string; inner?: unknown; message?: string };

  // Direct QuotaExceededError
  if (err.name === "QuotaExceededError") return true;

  // QuotaExceededError wrapped in AbortError (common in some browsers)
  if (err.name === "AbortError" && err.inner) {
    return isDiskFullError(err.inner);
  }

  // Check message as fallback
  if (err.message?.toLowerCase().includes("quota")) return true;

  return false;
}
