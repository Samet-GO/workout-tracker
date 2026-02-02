import type { ExerciseSeed } from "./types";

export const forearmExercises: ExerciseSeed[] = [
  {
    name: "Wrist Curl",
    muscleGroup: "forearms",
    secondaryMuscles: [],
    equipment: "barbell",
    isCustom: false,
  },
  {
    name: "Reverse Wrist Curl",
    muscleGroup: "forearms",
    secondaryMuscles: [],
    equipment: "barbell",
    isCustom: false,
  },
  {
    name: "Farmer's Walk",
    muscleGroup: "forearms",
    secondaryMuscles: ["traps", "abs", "shoulders"],
    equipment: "dumbbell",
    isCustom: false,
  },
  {
    name: "Dead Hang",
    muscleGroup: "forearms",
    secondaryMuscles: ["shoulders", "back"],
    equipment: "bodyweight",
    isCustom: false,
  },
  {
    name: "Reverse Curl",
    muscleGroup: "forearms",
    secondaryMuscles: ["biceps"],
    equipment: "barbell",
    isCustom: false,
  },
  {
    name: "Plate Pinch Hold",
    muscleGroup: "forearms",
    secondaryMuscles: [],
    equipment: "other",
    isCustom: false,
  },
  {
    name: "Towel Pull-Up",
    muscleGroup: "forearms",
    secondaryMuscles: ["biceps", "back", "lats"],
    equipment: "bodyweight",
    isCustom: false,
  },
];
