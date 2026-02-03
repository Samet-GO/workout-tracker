"use client";

import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  type TimeRange,
  type ExerciseStrengthPoint,
  getExerciseStrengthCurve,
} from "@/lib/analytics";
import { TrendingUp } from "lucide-react";

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "180d", label: "180D" },
  { value: "1y", label: "1Y" },
  { value: "all", label: "All" },
];

export function StrengthChart() {
  const [exerciseId, setExerciseId] = useState<number | null>(null);
  const [range, setRange] = useState<TimeRange>("90d");
  const [data, setData] = useState<ExerciseStrengthPoint[]>([]);

  // Get exercises that have logged sets
  const exercisesWithSets = useLiveQuery(async () => {
    const setExIds = new Set(
      (await db.workoutSets.toArray()).map((s) => s.exerciseId)
    );
    const exercises = await db.exercises.toArray();
    return exercises.filter((e) => setExIds.has(e.id!));
  }, []);

  // Auto-select first exercise
  useEffect(() => {
    if (!exerciseId && exercisesWithSets?.length) {
      setExerciseId(exercisesWithSets[0].id!);
    }
  }, [exercisesWithSets, exerciseId]);

  // Load data when exercise or range changes
  useEffect(() => {
    if (exerciseId) {
      getExerciseStrengthCurve(exerciseId, range).then(setData);
    }
  }, [exerciseId, range]);

  return (
    <div className="space-y-3">
      {/* Exercise selector */}
      <div>
        <label htmlFor="exercise-select" className="sr-only">Select exercise to view strength progress</label>
        <select
          id="exercise-select"
          value={exerciseId ?? ""}
          onChange={(e) => setExerciseId(Number(e.target.value) || null)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        >
          <option value="">Select exercise...</option>
          {(exercisesWithSets ?? []).map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </div>

      {/* Time range */}
      <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800" role="group" aria-label="Time range">
        {TIME_RANGES.map((tr) => (
          <button
            key={tr.value}
            onClick={() => setRange(tr.value)}
            aria-pressed={range === tr.value}
            className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors min-h-[36px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
              range === tr.value
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
            }`}
          >
            {tr.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      {!exercisesWithSets?.length ? (
        <div className="py-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
            <TrendingUp className="h-6 w-6 text-zinc-400" />
          </div>
          <p className="mb-1 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            No exercise data yet
          </p>
          <p className="text-xs text-zinc-400">
            Complete a workout to track your strength progress
          </p>
        </div>
      ) : data.length >= 2 ? (
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#71717a" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#71717a" }}
                tickLine={false}
                axisLine={false}
                width={45}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid #e4e4e7",
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="maxWeight"
                name="Max Weight"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ r: 3, fill: "#2563eb" }}
              />
              <Line
                type="monotone"
                dataKey="bestSetVolume"
                name="Best Set Vol"
                stroke="#16a34a"
                strokeWidth={2}
                dot={{ r: 3, fill: "#16a34a" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : data.length === 1 ? (
        <div className="py-6 text-center">
          <p className="mb-1 text-sm text-zinc-500 dark:text-zinc-400">
            One session logged
          </p>
          <p className="text-xs text-zinc-400">
            Complete another workout to see your strength trend
          </p>
        </div>
      ) : exerciseId ? (
        <div className="py-6 text-center">
          <p className="mb-1 text-sm text-zinc-500 dark:text-zinc-400">
            No data in this time range
          </p>
          <p className="text-xs text-zinc-400">
            Try selecting a longer time period above
          </p>
        </div>
      ) : null}
    </div>
  );
}
