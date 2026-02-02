import type { MuscleGroup, EquipmentType } from "../../lib/constants";

export interface ExerciseSeed {
  name: string;
  muscleGroup: MuscleGroup;
  secondaryMuscles?: MuscleGroup[];
  equipment: EquipmentType;
  isCustom: false;
}
