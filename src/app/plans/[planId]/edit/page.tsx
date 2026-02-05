"use client";

import { use, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Merge,
  Split,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { db, type TemplateExercise, type Exercise } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExercisePicker } from "@/components/plans/exercise-picker";
import { STRUCTURE_TYPES, MUSCLE_GROUPS, type StructureType, type MuscleGroup } from "@/lib/constants";

export default function EditPlanPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = use(params);
  const templateId = Number(planId);
  const router = useRouter();

  const [expandedParts, setExpandedParts] = useState<Set<number>>(new Set());
  const [selectedParts, setSelectedParts] = useState<Set<number>>(new Set());
  const [addingExerciseTo, setAddingExerciseTo] = useState<{
    partId: number;
    muscleGroup: MuscleGroup;
  } | null>(null);
  const [showMuscleGroupPicker, setShowMuscleGroupPicker] = useState<number | null>(null);

  const template = useLiveQuery(
    () => db.workoutTemplates.get(templateId),
    [templateId]
  );

  const parts = useLiveQuery(
    () =>
      db.templateParts
        .where("templateId")
        .equals(templateId)
        .sortBy("partOrder"),
    [templateId]
  );

  const allTemplateExercises = useLiveQuery(async () => {
    if (!parts?.length) return new Map<number, TemplateExercise[]>();
    const partIds = parts.map((p) => p.id!);
    const exercises = await db.templateExercises
      .where("partId")
      .anyOf(partIds)
      .sortBy("order");

    const byPart = new Map<number, TemplateExercise[]>();
    for (const te of exercises) {
      const list = byPart.get(te.partId) ?? [];
      list.push(te);
      byPart.set(te.partId, list);
    }
    return byPart;
  }, [parts]);

  const exercises = useLiveQuery(async () => {
    if (!allTemplateExercises) return new Map<number, Exercise>();
    const ids = new Set<number>();
    for (const list of allTemplateExercises.values()) {
      for (const te of list) {
        if (te.exerciseId) ids.add(te.exerciseId);
      }
    }
    if (ids.size === 0) return new Map<number, Exercise>();
    const exList = await db.exercises.where("id").anyOf([...ids]).toArray();
    return new Map(exList.map((e) => [e.id!, e]));
  }, [allTemplateExercises]);

  function togglePart(partId: number) {
    setExpandedParts((prev) => {
      const next = new Set(prev);
      if (next.has(partId)) {
        next.delete(partId);
      } else {
        next.add(partId);
      }
      return next;
    });
  }

  function toggleSelectPart(partId: number) {
    setSelectedParts((prev) => {
      const next = new Set(prev);
      if (next.has(partId)) {
        next.delete(partId);
      } else {
        next.add(partId);
      }
      return next;
    });
  }

  async function handlePartNameChange(partId: number, name: string) {
    await db.templateParts.update(partId, { name });
  }

  async function handleStructureChange(partId: number, structure: StructureType) {
    await db.templateParts.update(partId, { structure });
  }

  async function handleAddPart() {
    const maxOrder = parts?.reduce((max, p) => Math.max(max, p.partOrder), 0) ?? 0;
    const dayIndex = parts?.[0]?.dayIndex ?? 0;
    await db.templateParts.add({
      templateId,
      dayIndex,
      partOrder: maxOrder + 1,
      name: `Part ${(parts?.length ?? 0) + 1}`,
      structure: "straight-sets",
    });
  }

  async function handleDeletePart(partId: number) {
    // Delete all exercises in this part first
    await db.templateExercises.where("partId").equals(partId).delete();
    await db.templateParts.delete(partId);
  }

  async function handleAddExercise(partId: number, exercise: Exercise) {
    const partExercises = allTemplateExercises?.get(partId) ?? [];
    const maxOrder = partExercises.reduce((max, te) => Math.max(max, te.order), 0);

    await db.templateExercises.add({
      partId,
      exerciseId: exercise.id,
      isChoice: false,
      targetSets: 3,
      targetReps: "8-12",
      restSeconds: 90,
      order: maxOrder + 1,
    });
    setAddingExerciseTo(null);
    setShowMuscleGroupPicker(null);
  }

  async function handleDeleteExercise(templateExerciseId: number) {
    await db.templateExercises.delete(templateExerciseId);
  }

  async function handleMergeSelected() {
    if (selectedParts.size < 2 || !parts) return;

    const partsToMerge = parts.filter((p) => selectedParts.has(p.id!));
    if (partsToMerge.length < 2) return;

    const dayIndex = partsToMerge[0].dayIndex;
    const minOrder = Math.min(...partsToMerge.map((p) => p.partOrder));

    // Collect all exercises from selected parts
    const allExercises: TemplateExercise[] = [];
    for (const part of partsToMerge) {
      const partExercises = allTemplateExercises?.get(part.id!) ?? [];
      allExercises.push(...partExercises);
    }

    // Group exercises by exerciseId (or choiceMuscleGroup for choice exercises)
    // so same exercises are back-to-back for straight sets
    const exerciseGroups = new Map<string, TemplateExercise[]>();
    const groupOrder: string[] = []; // Track first appearance order

    for (const te of allExercises) {
      const key = te.isChoice
        ? `choice-${te.choiceMuscleGroup}`
        : `exercise-${te.exerciseId}`;

      if (!exerciseGroups.has(key)) {
        exerciseGroups.set(key, []);
        groupOrder.push(key);
      }
      exerciseGroups.get(key)!.push(te);
    }

    // Flatten back to array with same exercises grouped together
    const sortedExercises: TemplateExercise[] = [];
    for (const key of groupOrder) {
      sortedExercises.push(...exerciseGroups.get(key)!);
    }

    // Generate merged name
    const mergedName = partsToMerge.map((p) => p.name).join(" + ");

    await db.transaction("rw", [db.templateParts, db.templateExercises], async () => {
      // Create new merged part
      const newPartId = await db.templateParts.add({
        templateId,
        dayIndex,
        partOrder: minOrder,
        name: mergedName,
        structure: "straight-sets",
      });

      // Move all exercises to new part with grouped order
      for (let i = 0; i < sortedExercises.length; i++) {
        await db.templateExercises.update(sortedExercises[i].id!, {
          partId: newPartId,
          order: i + 1,
        });
      }

      // Delete old parts
      for (const part of partsToMerge) {
        await db.templateParts.delete(part.id!);
      }
    });

    setSelectedParts(new Set());
  }

  async function handleSplitExercises(partId: number) {
    const partExercises = allTemplateExercises?.get(partId) ?? [];
    if (partExercises.length < 2) return;

    const part = parts?.find((p) => p.id === partId);
    if (!part) return;

    const midpoint = Math.ceil(partExercises.length / 2);
    const firstHalf = partExercises.slice(0, midpoint);
    const secondHalf = partExercises.slice(midpoint);

    await db.transaction("rw", [db.templateParts, db.templateExercises], async () => {
      // Create Part 1
      const part1Id = await db.templateParts.add({
        templateId,
        dayIndex: part.dayIndex,
        partOrder: part.partOrder,
        name: `${part.name} (1)`,
        structure: part.structure,
      }) as number;

      // Create Part 2
      const part2Id = await db.templateParts.add({
        templateId,
        dayIndex: part.dayIndex,
        partOrder: part.partOrder + 1,
        name: `${part.name} (2)`,
        structure: part.structure,
      }) as number;

      // Move exercises to Part 1
      for (let i = 0; i < firstHalf.length; i++) {
        await db.templateExercises.update(firstHalf[i].id!, {
          partId: part1Id,
          order: i + 1,
        });
      }

      // Move exercises to Part 2
      for (let i = 0; i < secondHalf.length; i++) {
        await db.templateExercises.update(secondHalf[i].id!, {
          partId: part2Id,
          order: i + 1,
        });
      }

      // Delete original part
      await db.templateParts.delete(partId);
    });
  }

  async function handleSplitToCircuitRounds(partId: number) {
    const partExercises = allTemplateExercises?.get(partId) ?? [];
    if (partExercises.length === 0) return;

    const part = parts?.find((p) => p.id === partId);
    if (!part) return;

    // Find max sets among exercises - this determines number of rounds
    const maxSets = Math.max(...partExercises.map((te) => te.targetSets));
    if (maxSets < 2) return; // Need at least 2 sets to split into rounds

    await db.transaction("rw", [db.templateParts, db.templateExercises], async () => {
      // Create a round for each set
      const roundIds: number[] = [];
      for (let round = 1; round <= maxSets; round++) {
        const roundId = await db.templateParts.add({
          templateId,
          dayIndex: part.dayIndex,
          partOrder: part.partOrder + round - 1,
          name: `Round ${round}`,
          structure: "circuit",
        }) as number;
        roundIds.push(roundId);
      }

      // For each exercise, create copies in each round (with 1 set each)
      for (const te of partExercises) {
        const setsForThisExercise = te.targetSets;

        for (let round = 0; round < setsForThisExercise; round++) {
          if (round === 0) {
            // Update original exercise to be in round 1 with 1 set
            await db.templateExercises.update(te.id!, {
              partId: roundIds[round],
              targetSets: 1,
              order: te.order,
            });
          } else {
            // Create new exercise entries for subsequent rounds
            await db.templateExercises.add({
              partId: roundIds[round],
              exerciseId: te.exerciseId,
              isChoice: te.isChoice,
              choiceMuscleGroup: te.choiceMuscleGroup,
              targetSets: 1,
              targetReps: te.targetReps,
              restSeconds: te.restSeconds,
              weightDescriptor: te.weightDescriptor,
              intensityDescriptor: te.intensityDescriptor,
              specialSetType: te.specialSetType,
              notes: te.notes,
              order: te.order,
            });
          }
        }
      }

      // Delete original part
      await db.templateParts.delete(partId);
    });
  }

  if (!template || !parts || !allTemplateExercises || !exercises) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const structureLabels: Record<StructureType, string> = {
    "straight-sets": "Straight",
    circuit: "Circuit",
    superset: "Superset",
  };

  return (
    <div>
      <div className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-zinc-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900/80 px-4 backdrop-blur-md">
        <Link
          href={`/plans/${planId}`}
          className="rounded-full p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex-1 text-lg font-bold text-zinc-900 dark:text-zinc-100 truncate">
          Edit Template
        </h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Merge selected button - show when 2+ parts selected */}
        {selectedParts.size >= 2 && (
          <button
            onClick={handleMergeSelected}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 py-3 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            <Merge className="h-4 w-4" />
            Merge Selected ({selectedParts.size})
          </button>
        )}

        {/* Selection hint */}
        {parts.length >= 2 && selectedParts.size === 0 && (
          <p className="text-xs text-center text-zinc-500 dark:text-zinc-400">
            Tap checkboxes to select parts to merge
          </p>
        )}

        {/* Parts */}
        {parts.map((part) => {
          const isExpanded = expandedParts.has(part.id!);
          const partExercises = allTemplateExercises.get(part.id!) ?? [];

          const isSelected = selectedParts.has(part.id!);

          return (
            <Card
              key={part.id}
              className={`overflow-hidden transition-colors ${
                isSelected ? "ring-2 ring-blue-500 dark:ring-blue-400" : ""
              }`}
            >
              {/* Part Header */}
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => togglePart(part.id!)}
              >
                {/* Selection checkbox - only show when multiple parts */}
                {parts.length >= 2 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelectPart(part.id!);
                    }}
                    className={`h-5 w-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "border-zinc-300 dark:border-zinc-600 hover:border-blue-500"
                    }`}
                  >
                    {isSelected && (
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                )}
                <GripVertical className="h-4 w-4 text-zinc-400 shrink-0" />
                <input
                  type="text"
                  value={part.name}
                  onChange={(e) => handlePartNameChange(part.id!, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 min-w-0 bg-transparent font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 rounded px-1 -mx-1"
                />
                <Badge variant="secondary" className="text-xs shrink-0">
                  {partExercises.length} exercises
                </Badge>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Delete this part and all its exercises?")) {
                      handleDeletePart(part.id!);
                    }
                  }}
                  className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-zinc-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-zinc-400" />
                )}
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700 space-y-3">
                  {/* Split buttons */}
                  <div className="flex gap-2">
                    {/* Split exercises in half - show when 2+ exercises */}
                    {partExercises.length >= 2 && (
                      <button
                        onClick={() => handleSplitExercises(part.id!)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 py-2 text-xs font-medium text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                      >
                        <Split className="h-3.5 w-3.5" />
                        Split Exercises
                      </button>
                    )}

                    {/* Split to circuit rounds - show when exercises have 2+ sets */}
                    {partExercises.length > 0 &&
                      Math.max(...partExercises.map((te) => te.targetSets)) >= 2 && (
                      <button
                        onClick={() => handleSplitToCircuitRounds(part.id!)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 py-2 text-xs font-medium text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                      >
                        <Split className="h-3.5 w-3.5" />
                        Split to Rounds
                      </button>
                    )}
                  </div>

                  {/* Structure selector */}
                  <div className="flex gap-1.5">
                    {STRUCTURE_TYPES.map((structure) => (
                      <button
                        key={structure}
                        onClick={() => handleStructureChange(part.id!, structure)}
                        className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                          (part.structure ?? "straight-sets") === structure
                            ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-500"
                            : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600"
                        }`}
                      >
                        {structureLabels[structure]}
                      </button>
                    ))}
                  </div>

                  {/* Exercises list */}
                  <div className="space-y-1.5">
                    {partExercises.map((te) => {
                      const exercise = te.exerciseId ? exercises.get(te.exerciseId) : null;
                      return (
                        <div
                          key={te.id}
                          className="flex items-center gap-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2"
                        >
                          <span className="flex-1 text-sm text-zinc-900 dark:text-zinc-100 truncate">
                            {te.isChoice
                              ? `Any ${te.choiceMuscleGroup} exercise`
                              : exercise?.name ?? "Unknown"}
                          </span>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400 shrink-0">
                            {te.targetSets}x{te.targetReps}
                          </span>
                          <button
                            onClick={() => handleDeleteExercise(te.id!)}
                            className="p-1 text-zinc-400 hover:text-red-500 rounded transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add exercise button */}
                  {showMuscleGroupPicker === part.id ? (
                    <div className="grid grid-cols-3 gap-1.5">
                      {MUSCLE_GROUPS.map((mg) => (
                        <button
                          key={mg}
                          onClick={() => {
                            setAddingExerciseTo({ partId: part.id!, muscleGroup: mg });
                            setShowMuscleGroupPicker(null);
                          }}
                          className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-2 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors capitalize"
                        >
                          {mg}
                        </button>
                      ))}
                      <button
                        onClick={() => setShowMuscleGroupPicker(null)}
                        className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-2 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowMuscleGroupPicker(part.id!)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-600 py-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Add Exercise
                    </button>
                  )}
                </div>
              )}
            </Card>
          );
        })}

        {/* Add Part button */}
        <button
          onClick={handleAddPart}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-600 py-4 text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add Part
        </button>
      </div>

      {/* Exercise picker */}
      {addingExerciseTo && (
        <ExercisePicker
          open={!!addingExerciseTo}
          onClose={() => setAddingExerciseTo(null)}
          muscleGroup={addingExerciseTo.muscleGroup}
          onSelect={(exercise) => handleAddExercise(addingExerciseTo.partId, exercise)}
        />
      )}
    </div>
  );
}
