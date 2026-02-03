"use client";

import { useState } from "react";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Check, Target, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SetLogger } from "./set-logger";
import type { Exercise, TemplateExercise, WorkoutSet } from "@/lib/db";
import { cn } from "@/lib/utils";

interface ExerciseCardProps {
  exercise: Exercise;
  templateExercise: TemplateExercise;
  loggedSets: WorkoutSet[];
  previousSets: WorkoutSet[];
  onLogSet: (
    weight: number,
    reps: number,
    special?: {
      partialsCount?: number;
      dropSetWeight?: number;
      dropSetReps?: number;
      forcedRepsCount?: number;
      isPausedReps?: boolean;
    }
  ) => void;
  onDeleteSet?: (setId: number) => void;
  onEditSet?: (setId: number, weight: number, reps: number) => void;
  energy?: number;
  unit: string;
  initialExpanded?: boolean;
}

export function ExerciseCard({
  exercise,
  templateExercise,
  loggedSets,
  previousSets,
  onLogSet,
  onDeleteSet,
  onEditSet,
  energy,
  unit,
  initialExpanded = false,
}: ExerciseCardProps) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const [editingSetId, setEditingSetId] = useState<number | null>(null);

  const targetSets = templateExercise.targetSets;
  const completedSets = loggedSets.length;
  const isComplete = completedSets >= targetSets;
  const currentSetNumber = completedSets + 1;

  // Get previous data for the next set to log
  const previousSet = previousSets[completedSets];
  const previousWeight = previousSet?.weight ?? 0;
  const previousReps = previousSet?.reps ?? 0;

  // Parse target reps for comparison
  const targetRepsMatch = templateExercise.targetReps.match(/^(\d+)/);
  const targetRepsNum = targetRepsMatch ? Number(targetRepsMatch[1]) : null;

  return (
    <Card
      className={cn(
        "transition-colors",
        isComplete && "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/30"
      )}
    >
      <button
        className="flex w-full items-center justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
              isComplete
                ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400"
                : "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400"
            )}
          >
            {isComplete ? (
              <Check className="h-4 w-4" />
            ) : (
              `${completedSets}/${targetSets}`
            )}
          </div>
          <div className="text-left">
            <p className="font-medium text-zinc-900 dark:text-zinc-100">{exercise.name}</p>
            <p className="text-xs text-zinc-500">
              {templateExercise.targetSets > 1
                ? `${templateExercise.targetSets}x${templateExercise.targetReps}`
                : `${templateExercise.targetReps} reps`}
              {templateExercise.weightDescriptor &&
                ` · ${templateExercise.weightDescriptor}`}
              {templateExercise.intensityDescriptor &&
                ` · ${templateExercise.intensityDescriptor}`}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-zinc-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-zinc-400" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {/* Logged sets with actual vs planned — swipe to delete, tap to edit */}
          {loggedSets.length > 0 && (
            <div className="space-y-1">
              <AnimatePresence>
                {loggedSets.map((set, i) => {
                  const prev = previousSets[i];
                  const weightDiff = prev ? set.weight - prev.weight : 0;
                  const repsDiff = prev ? set.reps - prev.reps : 0;

                  return (
                    <SwipeableSetRow
                      key={set.id}
                      setId={set.id!}
                      onDelete={onDeleteSet}
                      onTap={() => {
                        if (onEditSet && set.id) {
                          setEditingSetId(
                            editingSetId === set.id ? null : set.id
                          );
                        }
                      }}
                    >
                      <span className="text-zinc-500">Set {i + 1}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {set.weight}
                          {unit} x {set.reps}
                        </span>
                        {/* Comparison badges */}
                        {prev && (weightDiff !== 0 || repsDiff !== 0) && (
                          <span
                            className={cn(
                              "text-xs font-medium",
                              weightDiff > 0 || repsDiff > 0
                                ? "text-green-600"
                                : weightDiff < 0 || repsDiff < 0
                                  ? "text-red-500"
                                  : "text-zinc-400"
                            )}
                          >
                            {weightDiff > 0 ? `+${weightDiff}` : weightDiff < 0 ? weightDiff : ""}
                            {weightDiff !== 0 && repsDiff !== 0 ? "/" : ""}
                            {repsDiff > 0 ? `+${repsDiff}r` : repsDiff < 0 ? `${repsDiff}r` : ""}
                          </span>
                        )}
                        {set.rpe !== undefined && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0">
                            RPE {set.rpe}
                          </Badge>
                        )}
                        {/* Special set indicators */}
                        {set.dropSetWeight && (
                          <Badge variant="warning" className="text-xs px-1.5 py-0">
                            DS
                          </Badge>
                        )}
                        {set.forcedRepsCount && (
                          <Badge variant="warning" className="text-xs px-1.5 py-0">
                            FR{set.forcedRepsCount}
                          </Badge>
                        )}
                        {set.partialsCount && (
                          <Badge variant="warning" className="text-xs px-1.5 py-0">
                            P{set.partialsCount}
                          </Badge>
                        )}
                        {set.isPausedReps && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0">
                            Paused
                          </Badge>
                        )}
                      </div>
                    </SwipeableSetRow>
                  );
                })}
              </AnimatePresence>
              {/* Inline edit form for tapped set */}
              {editingSetId && onEditSet && (
                <InlineSetEdit
                  set={loggedSets.find((s) => s.id === editingSetId)!}
                  unit={unit}
                  onSave={(weight, reps) => {
                    onEditSet(editingSetId, weight, reps);
                    setEditingSetId(null);
                  }}
                  onCancel={() => setEditingSetId(null)}
                />
              )}
            </div>
          )}

          {/* Target comparison summary */}
          {loggedSets.length > 0 && targetRepsNum && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Target className="h-3 w-3" />
              <span>
                Target: {targetSets}x{templateExercise.targetReps} ·
                Logged: {completedSets} sets,{" "}
                avg {Math.round(loggedSets.reduce((s, set) => s + set.reps, 0) / loggedSets.length)} reps
              </span>
            </div>
          )}

          {/* Set logger for next set */}
          {!isComplete && (
            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Logging: {exercise.name} — Set {currentSetNumber} of {targetSets}
                </p>
                {templateExercise.restSeconds > 0 && (
                  <span className="text-xs text-zinc-400">
                    Rest {templateExercise.restSeconds}s
                  </span>
                )}
              </div>
              <SetLogger
                exerciseId={exercise.id!}
                templateExerciseId={templateExercise.id}
                setNumber={currentSetNumber}
                previousWeight={previousWeight}
                previousReps={previousReps}
                previousRpe={previousSet?.rpe}
                energy={energy}
                targetReps={templateExercise.targetReps}
                onLog={onLogSet}
                unit={unit}
              />
            </div>
          )}

          {/* Notes */}
          {templateExercise.notes && (
            <p className="text-xs italic text-zinc-500">
              {templateExercise.notes}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

// ── Swipeable set row (B5: swipe-to-delete) ──

function SwipeableSetRow({
  setId,
  onDelete,
  onTap,
  children,
}: {
  setId: number;
  onDelete?: (id: number) => void;
  onTap: () => void;
  children: React.ReactNode;
}) {
  const x = useMotionValue(0);
  const bgOpacity = useTransform(x, [-100, -50, 0], [1, 0.5, 0]);
  const deleteScale = useTransform(x, [-100, -50, 0], [1, 0.8, 0.5]);

  return (
    <div className="relative overflow-hidden rounded">
      {/* Delete backdrop */}
      <motion.div
        className="absolute inset-y-0 right-0 flex w-20 items-center justify-center bg-red-500"
        style={{ opacity: bgOpacity }}
      >
        <motion.div style={{ scale: deleteScale }}>
          <Trash2 className="h-4 w-4 text-white" />
        </motion.div>
      </motion.div>

      <motion.div
        className="relative flex items-center justify-between bg-zinc-50 dark:bg-zinc-800 px-3 py-1.5 text-sm cursor-pointer"
        style={{ x }}
        drag="x"
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={0.1}
        onDragEnd={(_, info) => {
          if (info.offset.x < -80 && onDelete) {
            onDelete(setId);
          }
        }}
        onClick={onTap}
        layout
        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </div>
  );
}

// ── Inline set editor (B6: tap-to-edit) ──

function InlineSetEdit({
  set,
  unit,
  onSave,
  onCancel,
}: {
  set: WorkoutSet;
  unit: string;
  onSave: (weight: number, reps: number) => void;
  onCancel: () => void;
}) {
  const [weight, setWeight] = useState(set.weight);
  const [reps, setReps] = useState(set.reps);

  return (
    <motion.div
      className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/30 p-2"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
    >
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label className="text-xs text-zinc-500 dark:text-zinc-400">Weight ({unit})</label>
          <input
            type="number"
            inputMode="decimal"
            value={weight || ""}
            onChange={(e) => setWeight(Number(e.target.value) || 0)}
            className="h-9 w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 text-center text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="w-16">
          <label className="text-xs text-zinc-500 dark:text-zinc-400">Reps</label>
          <input
            type="number"
            inputMode="numeric"
            value={reps || ""}
            onChange={(e) => setReps(Number(e.target.value) || 0)}
            className="h-9 w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 text-center text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="flex gap-1 pt-4">
          <button
            onClick={() => onSave(weight, reps)}
            disabled={weight <= 0 || reps <= 0}
            className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={onCancel}
            className="rounded px-2 py-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"
          >
            ✕
          </button>
        </div>
      </div>
    </motion.div>
  );
}
