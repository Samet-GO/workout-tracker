"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy, Dumbbell, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function WorkoutCompletePage() {
  // Get most recently completed session
  const session = useLiveQuery(
    () =>
      db.workoutSessions
        .orderBy("completedAt")
        .reverse()
        .first(),
    []
  );

  const sets = useLiveQuery(
    () =>
      session?.id
        ? db.workoutSets.where("sessionId").equals(session.id).toArray()
        : [],
    [session?.id]
  );

  const template = useLiveQuery(
    () =>
      session?.templateId
        ? db.workoutTemplates.get(session.templateId)
        : undefined,
    [session?.templateId]
  );

  const exercises = useLiveQuery(() => db.exercises.toArray(), []);

  if (!session || !sets) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const exerciseMap = new Map(exercises?.map((e) => [e.id, e]) ?? []);

  const totalVolume = sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
  const duration = session.completedAt && session.startedAt
    ? Math.round(
        (new Date(session.completedAt).getTime() -
          new Date(session.startedAt).getTime()) /
          60000
      )
    : 0;

  // Group sets by exercise
  const setsByExercise = sets.reduce(
    (acc, set) => {
      const key = set.exerciseId;
      if (!acc[key]) acc[key] = [];
      acc[key].push(set);
      return acc;
    },
    {} as Record<number, typeof sets>
  );

  return (
    <div className="p-4 space-y-6">
      <div className="flex flex-col items-center pt-8 pb-4">
        <div className="mb-4 rounded-full bg-green-100 p-4">
          <Trophy className="h-10 w-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900">Workout Complete!</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {template?.name} · {template?.splitDays[session.dayIndex]}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center">
          <Dumbbell className="mx-auto mb-1 h-5 w-5 text-blue-600" />
          <p className="text-lg font-bold">{sets.length}</p>
          <p className="text-xs text-zinc-500">Sets</p>
        </Card>
        <Card className="text-center">
          <Trophy className="mx-auto mb-1 h-5 w-5 text-amber-600" />
          <p className="text-lg font-bold">{Math.round(totalVolume)}</p>
          <p className="text-xs text-zinc-500">Volume (kg)</p>
        </Card>
        <Card className="text-center">
          <Clock className="mx-auto mb-1 h-5 w-5 text-green-600" />
          <p className="text-lg font-bold">{duration}</p>
          <p className="text-xs text-zinc-500">Minutes</p>
        </Card>
      </div>

      <div className="space-y-2">
        <h2 className="font-semibold text-zinc-900">Summary</h2>
        {Object.entries(setsByExercise).map(([exerciseId, exerciseSets]) => {
          const exercise = exerciseMap.get(Number(exerciseId));
          return (
            <Card key={exerciseId} className="py-3">
              <p className="font-medium text-zinc-900">
                {exercise?.name ?? "Unknown"}
              </p>
              <div className="mt-1 flex flex-wrap gap-2">
                {exerciseSets.map((set, i) => (
                  <span
                    key={set.id}
                    className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700"
                  >
                    {set.weight}kg x {set.reps}
                  </span>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      <Link href="/plans" className="block">
        <Button size="xl" className="w-full">
          Back to Plans
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </Link>
    </div>
  );
}
