"use client";

import { useState, useEffect } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  getMoodEnergyInsights,
  type MoodEnergyInsight,
} from "@/lib/analytics";
import { Heart } from "lucide-react";

const MOOD_LABELS = ["", "\u{1F62B}", "\u{1F615}", "\u{1F610}", "\u{1F642}", "\u{1F604}"];

export function MoodEnergyChart() {
  const [data, setData] = useState<MoodEnergyInsight[]>([]);

  useEffect(() => {
    getMoodEnergyInsights().then(setData);
  }, []);

  if (data.length === 0) {
    return (
      <div className="py-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
          <Heart className="h-6 w-6 text-zinc-400" />
        </div>
        <p className="mb-1 text-sm text-zinc-600 dark:text-zinc-400">
          No mood/energy data yet
        </p>
        <p className="text-xs text-zinc-400">
          Enable &quot;Mood prompt&quot; in Settings to track how you feel
          before workouts and discover performance patterns.
        </p>
      </div>
    );
  }

  // Find best performing mood/energy combo
  const best = data.reduce((a, b) => (a.avgVolume > b.avgVolume ? a : b));

  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-green-50 px-3 py-2 dark:bg-green-950">
        <p className="text-xs font-medium text-green-800 dark:text-green-200">
          Best performance at Mood {MOOD_LABELS[best.mood]} / Energy{" "}
          {best.energy}
        </p>
        <p className="text-xs text-green-600 dark:text-green-400">
          Avg volume:{" "}
          {best.avgVolume > 1000
            ? `${(best.avgVolume / 1000).toFixed(1)}k`
            : best.avgVolume}{" "}
          kg ({best.sessionCount} sessions)
        </p>
      </div>

      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
            <XAxis
              type="number"
              dataKey="energy"
              name="Energy"
              domain={[0.5, 5.5]}
              ticks={[1, 2, 3, 4, 5]}
              tick={{ fontSize: 11, fill: "#71717a" }}
              tickLine={false}
              label={{
                value: "Energy",
                position: "insideBottom",
                offset: -5,
                fontSize: 11,
                fill: "#71717a",
              }}
            />
            <YAxis
              type="number"
              dataKey="mood"
              name="Mood"
              domain={[0.5, 5.5]}
              ticks={[1, 2, 3, 4, 5]}
              tick={{ fontSize: 11, fill: "#71717a" }}
              tickLine={false}
              width={35}
              label={{
                value: "Mood",
                angle: -90,
                position: "insideLeft",
                fontSize: 11,
                fill: "#71717a",
              }}
            />
            <ZAxis
              type="number"
              dataKey="avgVolume"
              range={[50, 400]}
              name="Avg Volume"
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid #e4e4e7",
              }}
              formatter={(
                value: number | undefined,
                name?: string,
              ) => {
                if (name === "Avg Volume") return [`${value} kg`, name];
                return [value, name ?? ""];
              }}
            />
            <Scatter data={data} fill="#2563eb" fillOpacity={0.7} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <p className="text-center text-xs text-zinc-400">
        Bubble size = average volume. {data.length} mood/energy combinations
        tracked.
      </p>
    </div>
  );
}
