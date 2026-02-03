"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Exercise, type TemplateExercise } from "@/lib/db";
import { useActiveWorkout } from "@/hooks/use-active-workout";
import { usePreviousWorkout } from "@/hooks/use-previous-workout";
import { useRestTimer } from "@/hooks/use-rest-timer";
import { usePreferences } from "@/hooks/use-preferences";
import { ExerciseCard } from "@/components/workout/exercise-card";
import { RestTimer } from "@/components/workout/rest-timer";
import { RpePrompt } from "@/components/workout/rpe-prompt";
import { MoodEnergyPrompt } from "@/components/workout/mood-energy-prompt";
import { ExercisePicker } from "@/components/plans/exercise-picker";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { playBeep } from "@/lib/sound";
import Link from "next/link";
import type { MuscleGroup } from "@/lib/constants";

export default function WorkoutPage() {
  const { session, sets, logSet, deleteSet, updateSet, completeWorkout, cancelWorkout } =
    useActiveWorkout();
  const { prefs } = usePreferences();
  const { remaining, isRunning, start: startTimer, stop: stopTimer } =
    useRestTimer();

  // RPE state
  const [rpeOpen, setRpeOpen] = useState(false);
  const [lastSetId, setLastSetId] = useState<number | null>(null);

  // Mood/energy prompt state
  const [showMoodPrompt, setShowMoodPrompt] = useState(false);
  const moodPromptHandledRef = useRef(false);

  // Exercise picker state for choice exercises
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMuscleGroup, setPickerMuscleGroup] =
    useState<MuscleGroup>("biceps");
  const [pickerTemplateExId, setPickerTemplateExId] = useState<number | null>(
    null
  );

  // Track chosen exercises for choice slots: templateExerciseId -> Exercise
  const [chosenExercises, setChosenExercises] = useState<
    Map<number, Exercise>
  >(new Map());

  const template = useLiveQuery(
    () =>
      session?.templateId
        ? db.workoutTemplates.get(session.templateId)
        : undefined,
    [session?.templateId]
  );

  const parts = useLiveQuery(
    () =>
      session?.templateId
        ? db.templateParts
            .where("templateId")
            .equals(session.templateId)
            .filter((p) => p.dayIndex === session.dayIndex)
            .sortBy("partOrder")
        : [],
    [session?.templateId, session?.dayIndex]
  );

  const templateExercises = useLiveQuery(async () => {
    if (!parts?.length) return [];
    const partIds = parts.map((p) => p.id!);
    return db.templateExercises
      .where("partId")
      .anyOf(partIds)
      .sortBy("order");
  }, [parts?.map((p) => p.id).join(",")]);

  const exercises = useLiveQuery(async () => {
    if (!templateExercises?.length) return [];
    const ids = new Set<number>();
    for (const te of templateExercises) {
      if (te.exerciseId) ids.add(te.exerciseId);
    }
    if (ids.size === 0) return [];
    return db.exercises.where("id").anyOf([...ids]).toArray();
  }, [templateExercises?.map((te) => te.id).join(",")]);

  const { getPreviousForExercise } = usePreviousWorkout(
    session?.templateId,
    session?.dayIndex
  );

  // Check if mood/energy prompt needed (no mood set yet on active session)
  const needsMoodPrompt =
    !!session && session.mood === undefined && sets.length === 0 && prefs.showMoodPrompt;

  // Show mood prompt when workout starts and no sets logged yet
  // Use ref to prevent re-showing after submit (live query delay race condition)
  useEffect(() => {
    if (needsMoodPrompt && !showMoodPrompt && !moodPromptHandledRef.current) {
      setShowMoodPrompt(true);
    }
  }, [needsMoodPrompt, showMoodPrompt]);

  // Reset ref when session changes (new workout)
  useEffect(() => {
    moodPromptHandledRef.current = false;
  }, [session?.id]);

  const handleMoodSubmit = useCallback(
    async (mood: number, energy: number) => {
      moodPromptHandledRef.current = true;
      setShowMoodPrompt(false);
      if (session?.id) {
        await db.workoutSessions.update(session.id, { mood, energy });
      }
    },
    [session?.id]
  );

  const handleMoodSkip = useCallback(() => {
    moodPromptHandledRef.current = true;
    setShowMoodPrompt(false);
  }, []);

  // No active session
  if (!session) {
    return (
      <div>
        <Header title="Workout" />
        <div className="flex flex-col items-center justify-center gap-4 p-8 pt-24">
          <div className="rounded-full bg-zinc-100 p-6">
            <Clock className="h-12 w-12 text-zinc-400" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-700">
            No Active Workout
          </h2>
          <p className="text-center text-sm text-zinc-500">
            Start a workout from your plans to begin logging sets.
          </p>
          <Link href="/plans">
            <Button size="lg">Browse Plans</Button>
          </Link>
        </div>
      </div>
    );
  }

  const exerciseMap = new Map(exercises?.map((e) => [e.id, e]) ?? []);

  // Build ordered list including choice exercises
  const orderedExercises: {
    templateExercise: TemplateExercise;
    exercise: Exercise | undefined;
    isChoiceResolved: boolean;
  }[] = (templateExercises ?? []).map((te) => {
    if (te.isChoice) {
      const chosen = chosenExercises.get(te.id!);
      return {
        templateExercise: te,
        exercise: chosen,
        isChoiceResolved: !!chosen,
      };
    }
    return {
      templateExercise: te,
      exercise: te.exerciseId ? exerciseMap.get(te.exerciseId) : undefined,
      isChoiceResolved: true,
    };
  });

  const elapsed = session.startedAt
    ? Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 60000)
    : 0;

  function handleLogSet(
    exerciseId: number,
    templateExerciseId: number | undefined,
    weight: number,
    reps: number,
    special?: {
      partialsCount?: number;
      dropSetWeight?: number;
      dropSetReps?: number;
      forcedRepsCount?: number;
      isPausedReps?: boolean;
    }
  ) {
    const exerciseSets = sets.filter((s) => s.exerciseId === exerciseId);
    logSet({
      exerciseId,
      templateExerciseId,
      setNumber: exerciseSets.length + 1,
      weight,
      reps,
      ...special,
    }).then((id) => {
      if (typeof id === "number") {
        setLastSetId(id);
        // Show RPE prompt if enabled
        if (prefs.showRpePrompt) {
          setRpeOpen(true);
        }
      }
    });

    // Start rest timer
    if (prefs.restTimerEnabled) {
      const te = templateExercises?.find((t) => t.id === templateExerciseId);
      startTimer(te?.restSeconds ?? 90, () => {
        playBeep();
      });
    }
  }

  async function handleRpeSubmit(rpe: number) {
    if (lastSetId) {
      await db.workoutSets.update(lastSetId, { rpe });
    }
    setRpeOpen(false);
  }

  function handleRpeDismiss() {
    setRpeOpen(false);
  }

  function openPicker(te: TemplateExercise) {
    if (te.choiceMuscleGroup) {
      setPickerMuscleGroup(te.choiceMuscleGroup);
      setPickerTemplateExId(te.id!);
      setPickerOpen(true);
    }
  }

  function handleExercisePicked(exercise: Exercise) {
    if (pickerTemplateExId !== null) {
      setChosenExercises((prev) => {
        const next = new Map(prev);
        next.set(pickerTemplateExId, exercise);
        return next;
      });
    }
  }

  // Determine first incomplete exercise for auto-expand
  const firstIncompleteIdx = orderedExercises.findIndex((item) => {
    if (!item.exercise) return true; // unresolved choice
    const logged = sets.filter(
      (s) => s.exerciseId === item.exercise!.id
    ).length;
    return logged < item.templateExercise.targetSets;
  });

  return (
    <div>
      <div className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-zinc-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900/80 px-4 backdrop-blur-md">
        <div>
          <h1 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            {template?.name ?? "Workout"}
          </h1>
          <p className="text-xs text-zinc-500">
            {template?.splitDays[session.dayIndex]} · {elapsed} min
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={cancelWorkout}>
            <XCircle className="mr-1 h-4 w-4" />
            Cancel
          </Button>
          <Button size="sm" onClick={completeWorkout}>
            <CheckCircle className="mr-1 h-4 w-4" />
            Finish
          </Button>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {/* Mood/energy badges if set */}
        {session.mood && session.energy && (
          <div className="flex gap-2">
            <Badge variant="secondary">
              Mood: {session.mood}/10
            </Badge>
            <Badge variant="secondary">
              Energy: {session.energy}/10
            </Badge>
          </div>
        )}

        {(parts ?? []).map((part) => {
          const partExercises = orderedExercises.filter(
            (item) => item.templateExercise.partId === part.id
          );
          if (partExercises.length === 0) return null;

          const isCircuit = part.structure === "circuit";
          const isSuperset = part.structure === "superset";

          // For circuit/superset: organize by rounds
          if (isCircuit || isSuperset) {
            // Calculate max sets needed
            const maxSets = Math.max(
              ...partExercises.map((item) => item.templateExercise.targetSets)
            );

            // For each round, show all exercises
            const rounds = Array.from({ length: maxSets }, (_, roundIdx) => roundIdx + 1);

            return (
              <div key={part.id}>
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                    {part.name}
                  </h3>
                  <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                    {part.structure?.replace(/-/g, " ")}
                  </Badge>
                </div>

                {rounds.map((roundNum) => {
                  // Check if this round is complete (all exercises have this set logged)
                  const roundComplete = partExercises.every((item) => {
                    if (!item.exercise) return true;
                    const logged = sets.filter(
                      (s) => s.templateExerciseId === item.templateExercise.id
                    ).length;
                    return logged >= roundNum;
                  });

                  // Check if previous round is complete (to know if this round is active)
                  const prevRoundComplete = roundNum === 1 || partExercises.every((item) => {
                    if (!item.exercise) return true;
                    const logged = sets.filter(
                      (s) => s.templateExerciseId === item.templateExercise.id
                    ).length;
                    return logged >= roundNum - 1;
                  });

                  const isActiveRound = prevRoundComplete && !roundComplete;

                  return (
                    <div
                      key={roundNum}
                      className={`mb-3 rounded-lg border-2 p-3 transition-colors ${
                        roundComplete
                          ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/20"
                          : isActiveRound
                            ? "border-blue-300 bg-blue-50/50 dark:border-blue-700 dark:bg-blue-900/20"
                            : "border-zinc-200 bg-zinc-50/50 dark:border-zinc-700 dark:bg-zinc-800/50"
                      }`}
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <span className={`text-xs font-bold uppercase tracking-wider ${
                          roundComplete
                            ? "text-green-600 dark:text-green-400"
                            : isActiveRound
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-zinc-400"
                        }`}>
                          Round {roundNum}
                        </span>
                        {roundComplete && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      </div>

                      <div className="space-y-2">
                        {partExercises.map((item) => {
                          // Skip if exercise doesn't need this many sets
                          if (item.templateExercise.targetSets < roundNum) return null;

                          // Choice exercise not yet selected
                          if (item.templateExercise.isChoice && !item.isChoiceResolved) {
                            return (
                              <Card key={`${item.templateExercise.id}-${roundNum}`} className="p-3">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                                    Pick a{" "}
                                    <span className="capitalize">
                                      {item.templateExercise.choiceMuscleGroup}
                                    </span>{" "}
                                    exercise
                                  </p>
                                  <Button size="sm" onClick={() => openPicker(item.templateExercise)}>
                                    Choose
                                  </Button>
                                </div>
                              </Card>
                            );
                          }

                          if (!item.exercise) return null;

                          const loggedSets = sets.filter(
                            (s) => s.templateExerciseId === item.templateExercise.id
                          );
                          const thisSetLogged = loggedSets.length >= roundNum;
                          const canLogThisSet = loggedSets.length === roundNum - 1 && isActiveRound;

                          return (
                            <ExerciseCard
                              key={`${item.templateExercise.id}-${roundNum}`}
                              exercise={item.exercise}
                              templateExercise={{
                                ...item.templateExercise,
                                targetSets: 1, // Show as single set for circuit
                              }}
                              loggedSets={loggedSets.slice(roundNum - 1, roundNum)}
                              previousSets={getPreviousForExercise(item.exercise.id!)}
                              onLogSet={(weight, reps, special) =>
                                handleLogSet(
                                  item.exercise!.id!,
                                  item.templateExercise.id,
                                  weight,
                                  reps,
                                  special
                                )
                              }
                              onDeleteSet={(setId) => deleteSet(setId)}
                              onEditSet={(setId, weight, reps) =>
                                updateSet(setId, { weight, reps })
                              }
                              energy={session.energy}
                              unit={prefs.weightUnit}
                              initialExpanded={canLogThisSet}
                              disabled={thisSetLogged || !prevRoundComplete}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          }

          // Default: straight sets (original behavior)
          return (
            <div key={part.id}>
              <div className="mb-2 flex items-center gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  {part.name}
                </h3>
                {part.structure && (
                  <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                    {part.structure.replace(/-/g, " ")}
                  </Badge>
                )}
              </div>
              <div className="space-y-2">
                {partExercises.map((item) => {
                  const globalIdx = orderedExercises.indexOf(item);

                  // Choice exercise not yet selected
                  if (
                    item.templateExercise.isChoice &&
                    !item.isChoiceResolved
                  ) {
                    return (
                      <Card key={item.templateExercise.id}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                              Pick a{" "}
                              <span className="capitalize">
                                {item.templateExercise.choiceMuscleGroup}
                              </span>{" "}
                              exercise
                            </p>
                            <p className="text-xs text-zinc-400">
                              {item.templateExercise.targetSets} x{" "}
                              {item.templateExercise.targetReps}
                              {item.templateExercise.weightDescriptor &&
                                ` · ${item.templateExercise.weightDescriptor}`}
                              {item.templateExercise.intensityDescriptor &&
                                ` · ${item.templateExercise.intensityDescriptor}`}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => openPicker(item.templateExercise)}
                          >
                            Choose
                          </Button>
                        </div>
                      </Card>
                    );
                  }

                  if (!item.exercise) return null;

                  return (
                    <ExerciseCard
                      key={item.templateExercise.id}
                      exercise={item.exercise}
                      templateExercise={item.templateExercise}
                      loggedSets={sets.filter(
                        (s) => s.templateExerciseId === item.templateExercise.id
                      )}
                      previousSets={getPreviousForExercise(
                        item.exercise.id!
                      )}
                      onLogSet={(weight, reps, special) =>
                        handleLogSet(
                          item.exercise!.id!,
                          item.templateExercise.id,
                          weight,
                          reps,
                          special
                        )
                      }
                      onDeleteSet={(setId) => deleteSet(setId)}
                      onEditSet={(setId, weight, reps) =>
                        updateSet(setId, { weight, reps })
                      }
                      energy={session.energy}
                      unit={prefs.weightUnit}
                      initialExpanded={globalIdx === firstIncompleteIdx}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <RestTimer
        remaining={remaining}
        isRunning={isRunning}
        onSkip={stopTimer}
      />

      <RpePrompt
        open={rpeOpen}
        onSubmit={handleRpeSubmit}
        onDismiss={handleRpeDismiss}
      />

      <MoodEnergyPrompt
        open={showMoodPrompt}
        onSubmit={handleMoodSubmit}
        onSkip={handleMoodSkip}
      />

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        muscleGroup={pickerMuscleGroup}
        onSelect={handleExercisePicked}
      />
    </div>
  );
}
