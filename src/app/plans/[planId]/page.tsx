"use client";

import { use, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Play, Timer, Dumbbell } from "lucide-react";
import Link from "next/link";
import { db, type TemplateExercise } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useActiveWorkout } from "@/hooks/use-active-workout";

export default function PlanDetailPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = use(params);
  const templateId = Number(planId);
  const { startWorkout, isActive } = useActiveWorkout();
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const template = useLiveQuery(
    () => db.workoutTemplates.get(templateId),
    [templateId]
  );

  // Single query that loads parts + exercises together
  const dayData = useLiveQuery(async () => {
    const parts = await db.templateParts
      .where("templateId")
      .equals(templateId)
      .sortBy("partOrder");

    if (!parts.length) return { parts: [], exercisesByPart: new Map() };

    const partIds = parts.map((p) => p.id!);
    const texercises = await db.templateExercises
      .where("partId")
      .anyOf(partIds)
      .sortBy("order");

    const exercisesByPart = new Map<number, TemplateExercise[]>();
    for (const te of texercises) {
      const list = exercisesByPart.get(te.partId) ?? [];
      list.push(te);
      exercisesByPart.set(te.partId, list);
    }

    return { parts, exercisesByPart };
  }, [templateId]);

  const exercises = useLiveQuery(async () => {
    if (!dayData?.exercisesByPart) return [];
    const ids = new Set<number>();
    for (const list of dayData.exercisesByPart.values()) {
      for (const te of list) {
        if (te.exerciseId) ids.add(te.exerciseId);
      }
    }
    if (ids.size === 0) return [];
    return db.exercises.where("id").anyOf([...ids]).toArray();
  }, [dayData]);

  if (!template || !dayData || !exercises) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const { parts, exercisesByPart } = dayData;
  const exerciseMap = new Map(exercises?.map((e) => [e.id, e]) ?? []);
  const uniqueDays = [...new Set(parts.map((p) => p.dayIndex))].sort(
    (a, b) => a - b
  );
  const activeDayIndex = selectedDay ?? uniqueDays[0] ?? 0;

  function handleStartWorkout() {
    startWorkout(templateId, activeDayIndex);
  }

  const dayParts = parts.filter((p) => p.dayIndex === activeDayIndex);

  return (
    <div>
      <div className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-zinc-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900/80 px-4 backdrop-blur-md">
        <Link href="/plans" className="rounded-full p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 truncate">
          {template.name}
        </h1>
      </div>

      <div className="p-4 space-y-4">
        {template.description && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{template.description}</p>
        )}

        {/* Day selector */}
        {uniqueDays.length > 1 && (
          <div>
            <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Select Day
            </p>
            <div className="flex gap-2">
              {uniqueDays.map((dayIdx) => (
                <button
                  key={dayIdx}
                  onClick={() => setSelectedDay(dayIdx)}
                  className={`flex-1 rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                    activeDayIndex === dayIdx
                      ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600"
                  }`}
                >
                  <div className="capitalize">
                    {template.splitDays[dayIdx]}
                  </div>
                  <div className="text-xs opacity-70">Day {dayIdx + 1}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Exercise list for selected day */}
        <div className="space-y-4">
          {dayParts.map((part) => {
            const partExercises: TemplateExercise[] = exercisesByPart.get(part.id!) ?? [];
            const structureLabel = part.structure
              ? part.structure
                  .replace(/-/g, " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase())
              : null;
            return (
              <Card key={part.id}>
                <div className="mb-3">
                  <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {part.name}
                  </h4>
                  {structureLabel && (
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {structureLabel}
                    </Badge>
                  )}
                </div>
                <div className="space-y-2">
                  {partExercises.map((te) => {
                    const exercise = te.exerciseId
                      ? exerciseMap.get(te.exerciseId)
                      : null;
                    return (
                      <div
                        key={te.id}
                        className="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {te.isChoice
                              ? `Any ${te.choiceMuscleGroup} exercise`
                              : exercise?.name ?? "Unknown"}
                          </p>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <Badge variant="outline">
                              {te.targetSets > 1
                                ? `${te.targetSets}x${te.targetReps}`
                                : `${te.targetReps} reps`}
                            </Badge>
                            {te.intensityDescriptor && (
                              <Badge
                                variant={
                                  te.intensityDescriptor.includes("All Out") ||
                                  te.intensityDescriptor.includes("Harder")
                                    ? "destructive"
                                    : te.intensityDescriptor.includes("Hard")
                                      ? "warning"
                                      : "secondary"
                                }
                              >
                                {te.intensityDescriptor}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {/* Weight descriptor & rest time */}
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                          {te.weightDescriptor && (
                            <span className="flex items-center gap-1">
                              <Dumbbell className="h-3 w-3" />
                              {te.weightDescriptor}
                            </span>
                          )}
                          {te.restSeconds > 0 && (
                            <span className="flex items-center gap-1">
                              <Timer className="h-3 w-3" />
                              Rest {te.restSeconds}s
                            </span>
                          )}
                        </div>
                        {te.notes && (
                          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 italic">
                            {te.notes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>

        {dayParts.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No exercises found for this day.
          </p>
        )}

        <Button
          size="xl"
          className="w-full"
          onClick={handleStartWorkout}
          disabled={isActive}
        >
          <Play className="mr-2 h-5 w-5" />
          {isActive ? "Workout In Progress" : "Start Workout"}
        </Button>
      </div>
    </div>
  );
}
