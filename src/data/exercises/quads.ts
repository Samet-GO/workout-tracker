import type { ExerciseSeed } from "./types";

export const quadExercises: ExerciseSeed[] = [
  {
    name: "Barbell Squat",
    muscleGroup: "quads",
    secondaryMuscles: ["glutes", "hamstrings", "abs"],
    equipment: "barbell",
    isCustom: false,
  },
  {
    name: "Leg Press",
    muscleGroup: "quads",
    secondaryMuscles: ["glutes", "hamstrings"],
    equipment: "machine",
    isCustom: false,
  },
  {
    name: "Leg Extension",
    muscleGroup: "quads",
    secondaryMuscles: [],
    equipment: "machine",
    isCustom: false,
  },
  {
    name: "Front Squat",
    muscleGroup: "quads",
    secondaryMuscles: ["glutes", "abs"],
    equipment: "barbell",
    isCustom: false,
  },
  {
    name: "Goblet Squat",
    muscleGroup: "quads",
    secondaryMuscles: ["glutes", "abs"],
    equipment: "kettlebell",
    isCustom: false,
  },
  {
    name: "Hack Squat",
    muscleGroup: "quads",
    secondaryMuscles: ["glutes"],
    equipment: "machine",
    isCustom: false,
  },
  {
    name: "Bulgarian Split Squat",
    muscleGroup: "quads",
    secondaryMuscles: ["glutes", "hamstrings"],
    equipment: "dumbbell",
    isCustom: false,
  },
  {
    name: "Walking Lunge",
    muscleGroup: "quads",
    secondaryMuscles: ["glutes", "hamstrings", "abs"],
    equipment: "dumbbell",
    isCustom: false,
  },
  {
    name: "Sissy Squat",
    muscleGroup: "quads",
    secondaryMuscles: ["abs"],
    equipment: "bodyweight",
    isCustom: false,
  },
];
