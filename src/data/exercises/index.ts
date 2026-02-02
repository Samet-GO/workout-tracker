export type { ExerciseSeed } from "./types";

export { chestExercises } from "./chest";
export { backExercises } from "./back";
export { shoulderExercises } from "./shoulders";
export { bicepsExercises } from "./biceps";
export { tricepsExercises } from "./triceps";
export { forearmExercises } from "./forearms";
export { quadExercises } from "./quads";
export { hamstringExercises } from "./hamstrings";
export { gluteExercises } from "./glutes";
export { calfExercises } from "./calves";
export { abExercises } from "./abs";
export { trapExercises } from "./traps";
export { latExercises } from "./lats";

import { chestExercises } from "./chest";
import { backExercises } from "./back";
import { shoulderExercises } from "./shoulders";
import { bicepsExercises } from "./biceps";
import { tricepsExercises } from "./triceps";
import { forearmExercises } from "./forearms";
import { quadExercises } from "./quads";
import { hamstringExercises } from "./hamstrings";
import { gluteExercises } from "./glutes";
import { calfExercises } from "./calves";
import { abExercises } from "./abs";
import { trapExercises } from "./traps";
import { latExercises } from "./lats";

export const allExercises = [
  ...chestExercises,
  ...backExercises,
  ...shoulderExercises,
  ...bicepsExercises,
  ...tricepsExercises,
  ...forearmExercises,
  ...quadExercises,
  ...hamstringExercises,
  ...gluteExercises,
  ...calfExercises,
  ...abExercises,
  ...trapExercises,
  ...latExercises,
];
