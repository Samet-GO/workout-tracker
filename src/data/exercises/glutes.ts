import type { ExerciseSeed } from "./types";

export const gluteExercises: ExerciseSeed[] = [
  {
    name: "Hip Thrust",
    muscleGroup: "glutes",
    secondaryMuscles: ["hamstrings", "abs"],
    equipment: "barbell",
    isCustom: false,
  },
  {
    name: "Cable Kickback",
    muscleGroup: "glutes",
    secondaryMuscles: ["hamstrings"],
    equipment: "cable",
    isCustom: false,
  },
  {
    name: "Glute Bridge",
    muscleGroup: "glutes",
    secondaryMuscles: ["hamstrings", "abs"],
    equipment: "bodyweight",
    isCustom: false,
  },
  {
    name: "Sumo Deadlift",
    muscleGroup: "glutes",
    secondaryMuscles: ["hamstrings", "quads", "back"],
    equipment: "barbell",
    isCustom: false,
  },
  {
    name: "Step-Up",
    muscleGroup: "glutes",
    secondaryMuscles: ["quads", "hamstrings"],
    equipment: "dumbbell",
    isCustom: false,
  },
  {
    name: "Cable Pull-Through",
    muscleGroup: "glutes",
    secondaryMuscles: ["hamstrings", "back"],
    equipment: "cable",
    isCustom: false,
  },
  {
    name: "Frog Pump",
    muscleGroup: "glutes",
    secondaryMuscles: ["hamstrings"],
    equipment: "bodyweight",
    isCustom: false,
  },
  {
    name: "Banded Hip Abduction",
    muscleGroup: "glutes",
    secondaryMuscles: [],
    equipment: "band",
    isCustom: false,
  },
];
