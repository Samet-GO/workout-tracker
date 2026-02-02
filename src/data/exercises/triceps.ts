import type { ExerciseSeed } from "./types";

export const tricepsExercises: ExerciseSeed[] = [
  {
    name: "Tricep Pushdown",
    muscleGroup: "triceps",
    secondaryMuscles: [],
    equipment: "cable",
    isCustom: false,
  },
  {
    name: "Overhead Tricep Extension",
    muscleGroup: "triceps",
    secondaryMuscles: ["shoulders"],
    equipment: "dumbbell",
    isCustom: false,
  },
  {
    name: "Close-Grip Bench Press",
    muscleGroup: "triceps",
    secondaryMuscles: ["chest", "shoulders"],
    equipment: "barbell",
    isCustom: false,
  },
  {
    name: "Skull Crusher",
    muscleGroup: "triceps",
    secondaryMuscles: ["shoulders"],
    equipment: "ez-bar",
    isCustom: false,
  },
  {
    name: "Dumbbell Kickback",
    muscleGroup: "triceps",
    secondaryMuscles: [],
    equipment: "dumbbell",
    isCustom: false,
  },
  {
    name: "Cable Overhead Extension",
    muscleGroup: "triceps",
    secondaryMuscles: ["shoulders"],
    equipment: "cable",
    isCustom: false,
  },
  {
    name: "Dip",
    muscleGroup: "triceps",
    secondaryMuscles: ["chest", "shoulders"],
    equipment: "bodyweight",
    isCustom: false,
  },
  {
    name: "Diamond Push-Up",
    muscleGroup: "triceps",
    secondaryMuscles: ["chest", "shoulders", "abs"],
    equipment: "bodyweight",
    isCustom: false,
  },
];
