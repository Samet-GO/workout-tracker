"use client";

import { useState, useEffect } from "react";
import { Flame } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getStreakData, type StreakData } from "@/lib/analytics";

export function StreakCalendar() {
  const [data, setData] = useState<StreakData | null>(null);

  useEffect(() => {
    getStreakData().then(setData);
  }, []);

  if (!data) return null;

  const workoutDateSet = new Set(data.workoutDates);

  // Build 12-week grid (84 days) ending today
  const today = new Date();
  const cells: { date: string; hasWorkout: boolean; isToday: boolean }[] = [];
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    cells.push({
      date: dateStr,
      hasWorkout: workoutDateSet.has(dateStr),
      isToday: i === 0,
    });
  }

  // Group by week (7 columns)
  const weeks: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
          Workout Streak
        </h2>
        <div className="flex items-center gap-1.5">
          <Flame
            className={cn(
              "h-5 w-5",
              data.currentStreak > 0 ? "text-orange-500" : "text-zinc-300"
            )}
          />
          <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
            {data.currentStreak} {data.currentStreak === 1 ? "week" : "weeks"}
          </span>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="flex gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-1 flex-col gap-1">
            {week.map((cell) => (
              <div
                key={cell.date}
                className={cn(
                  "aspect-square rounded-sm",
                  cell.hasWorkout
                    ? "bg-green-500"
                    : "bg-zinc-100 dark:bg-zinc-800",
                  cell.isToday && "ring-1 ring-blue-500"
                )}
                title={cell.date}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-2 flex items-center justify-between text-xs text-zinc-400">
        <span>12 weeks ago</span>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm bg-zinc-100" />
          <span>Rest</span>
          <div className="ml-1 h-2.5 w-2.5 rounded-sm bg-green-500" />
          <span>Workout</span>
        </div>
        <span>Today</span>
      </div>

      {data.longestStreak > 0 && (
        <p className="mt-2 text-xs text-zinc-500">
          Best streak: {data.longestStreak}{" "}
          {data.longestStreak === 1 ? "week" : "weeks"}
        </p>
      )}
    </Card>
  );
}
