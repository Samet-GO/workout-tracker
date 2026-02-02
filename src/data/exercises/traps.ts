import type { ExerciseSeed } from "./types";

export const trapExercises: ExerciseSeed[] = [
  {
    name: "Barbell Shrug",
    muscleGroup: "traps",
    secondaryMuscles: ["shoulders", "forearms"],
    equipment: "barbell",
    isCustom: false,
  },
  {
    name: "Dumbbell Shrug",
    muscleGroup: "traps",
    secondaryMuscles: ["shoulders", "forearms"],
    equipment: "dumbbell",
    isCustom: false,
  },
  {
    name: "Face Pull",
    muscleGroup: "traps",
    secondaryMuscles: ["shoulders", "back"],
    equipment: "cable",
    isCustom: false,
  },
  {
    name: "Rack Pull",
    muscleGroup: "traps",
    secondaryMuscles: ["back", "forearms", "glutes"],
    equipment: "barbell",
    isCustom: false,
  },
  {
    name: "Farmer's Walk (Traps)",
    muscleGroup: "traps",
    secondaryMuscles: ["forearms", "shoulders", "abs"],
    equipment: "dumbbell",
    isCustom: false,
  },
  {
    name: "Cable Shrug",
    muscleGroup: "traps",
    secondaryMuscles: ["shoulders"],
    equipment: "cable",
    isCustom: false,
  },
  {
    name: "Behind-the-Back Shrug",
    muscleGroup: "traps",
    secondaryMuscles: ["shoulders", "forearms"],
    equipment: "smith-machine",
    isCustom: false,
  },
];
