"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  type SessionSummary,
  type TimeRange,
  filterByTimeRange,
  buildTrendData,
  computeAverageVolume,
} from "@/lib/analytics";

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "180d", label: "180D" },
  { value: "1y", label: "1Y" },
  { value: "all", label: "All" },
];

interface VolumeChartProps {
  summaries: SessionSummary[];
}

export function VolumeChart({ summaries }: VolumeChartProps) {
  const [range, setRange] = useState<TimeRange>("30d");

  const filtered = filterByTimeRange(summaries, range);
  const trendData = buildTrendData(filtered);
  const avg = computeAverageVolume(filtered);

  return (
    <div className="space-y-3">
      {/* Time range selector */}
      <div className="flex gap-1 rounded-lg bg-zinc-100 p-1">
        {TIME_RANGES.map((tr) => (
          <button
            key={tr.value}
            onClick={() => setRange(tr.value)}
            className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
              range === tr.value
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {tr.label}
          </button>
        ))}
      </div>

      {/* Average stat */}
      <div className="text-center">
        <p className="text-2xl font-bold text-zinc-900">
          {avg > 1000 ? `${(avg / 1000).toFixed(1)}k` : avg} kg
        </p>
        <p className="text-xs text-zinc-500">
          Avg volume per workout ({filtered.length} workouts)
        </p>
      </div>

      {/* Chart */}
      {trendData.length >= 2 ? (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
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
                tickFormatter={(v: number) =>
                  v > 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
                }
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid #e4e4e7",
                }}
                formatter={(value) => [`${value} kg`, "Volume"]}
              />
              <Line
                type="monotone"
                dataKey="volume"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ r: 3, fill: "#2563eb" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : trendData.length === 1 ? (
        <p className="py-8 text-center text-sm text-zinc-400">
          Need at least 2 workouts to show trend
        </p>
      ) : (
        <p className="py-8 text-center text-sm text-zinc-400">
          No workouts in this period
        </p>
      )}
    </div>
  );
}
