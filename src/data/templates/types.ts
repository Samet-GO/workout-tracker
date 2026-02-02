import type { MuscleGroup, SplitFocus, SpecialSetType, StructureType } from "../../lib/constants";

export interface TemplateExerciseSeed {
  _exerciseName?: string; // resolved to exerciseId at seed time
  isChoice: boolean;
  choiceMuscleGroup?: MuscleGroup;
  targetSets: number;
  targetReps: string;
  restSeconds: number;
  weightDescriptor?: string;
  intensityDescriptor?: string;
  specialSetType?: SpecialSetType;
  notes?: string;
  order: number;
}

export interface TemplatePartSeed {
  name: string;
  structure?: StructureType;
  exercises: TemplateExerciseSeed[];
}

export interface TemplateDaySeed {
  dayIndex: number;
  parts: TemplatePartSeed[];
}

export interface TemplateSeed {
  name: string;
  frequency: number;
  focus: string;
  durationMinutes: number;
  splitDays: SplitFocus[];
  description: string;
  days: TemplateDaySeed[];
}
