export const MUSCLE_GROUPS = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "forearms",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "abs",
  "traps",
  "lats",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const EQUIPMENT_TYPES = [
  "barbell",
  "dumbbell",
  "cable",
  "machine",
  "bodyweight",
  "smith-machine",
  "ez-bar",
  "kettlebell",
  "band",
  "other",
] as const;

export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

export const SPECIAL_SET_TYPES = [
  "normal",
  "drop-set",
  "forced-reps",
  "partials",
  "paused-reps",
  "rest-pause",
] as const;

export type SpecialSetType = (typeof SPECIAL_SET_TYPES)[number];

export const WEIGHT_UNITS = ["kg", "lbs"] as const;
export type WeightUnit = (typeof WEIGHT_UNITS)[number];

export const SPLIT_FOCUS = [
  "full-body",
  "upper",
  "lower",
  "push",
  "pull",
  "legs",
  "chest-back",
  "shoulders-arms",
] as const;

export type SplitFocus = (typeof SPLIT_FOCUS)[number];

export const STRUCTURE_TYPES = [
  "straight-sets",
  "circuit",
  "superset",
] as const;

export type StructureType = (typeof STRUCTURE_TYPES)[number];

export const DEFAULT_REST_SECONDS = 90;
export const RPE_AUTO_DISMISS_MS = 3000;
export const QUICK_LOG_INCREMENTS = [0, 2.5, 5] as const;
