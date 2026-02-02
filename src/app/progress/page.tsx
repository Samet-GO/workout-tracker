"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import {
  TrendingUp,
  Dumbbell,
  Calendar,
  Clock,
  ChevronRight,
  X,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import {
  getSessionSummaries,
  computeAverageVolume,
  filterByTimeRange,
  type SessionSummary,
} from "@/lib/analytics";

const VolumeChart = dynamic(
  () =>
    import("@/components/progress/volume-chart").then((m) => m.VolumeChart),
  { ssr: false }
);

const StrengthChart = dynamic(
  () =>
    import("@/components/progress/strength-chart").then(
      (m) => m.StrengthChart
    ),
  { ssr: false }
);

const PlateauAlerts = dynamic(
  () =>
    import("@/components/progress/plateau-alerts").then(
      (m) => m.PlateauAlerts
    ),
  { ssr: false }
);

const MoodEnergyChart = dynamic(
  () =>
    import("@/components/progress/mood-energy-chart").then(
      (m) => m.MoodEnergyChart
    ),
  { ssr: false }
);

const InsightCards = dynamic(
  () =>
    import("@/components/progress/insight-cards").then(
      (m) => m.InsightCards
    ),
  { ssr: false }
);

const StreakCalendar = dynamic(
  () =>
    import("@/components/progress/streak-calendar").then(
      (m) => m.StreakCalendar
    ),
  { ssr: false }
);

export default function ProgressPage() {
  const [summaries, setSummaries] = useState<SessionSummary[]>([]);
  const [showChart, setShowChart] = useState(false);

  const templates = useLiveQuery(() => db.workoutTemplates.toArray(), []);
  const templateMap = new Map(templates?.map((t) => [t.id, t]) ?? []);

  // Re-query when sessions or sets change
  const sessionCount = useLiveQuery(
    () => db.workoutSessions.count(),
    []
  );
  const setCount = useLiveQuery(() => db.workoutSets.count(), []);

  useEffect(() => {
    getSessionSummaries().then(setSummaries);
  }, [sessionCount, setCount]);

  const totalWorkouts = summaries.length;
  const last30 = filterByTimeRange(summaries, "30d");
  const avgVolume30d = computeAverageVolume(last30);

  return (
    <div>
      <Header title="Progress" />
      <div className="p-4 space-y-4">
        {/* Workout streak calendar */}
        <StreakCalendar />

        {/* Smart insights */}
        <InsightCards />

        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="text-center">
            <Calendar className="mx-auto mb-1 h-5 w-5 text-blue-600" />
            <p className="text-2xl font-bold">{totalWorkouts}</p>
            <p className="text-xs text-zinc-500">Total Workouts</p>
          </Card>
          <button onClick={() => setShowChart(true)} className="text-left">
            <Card className="text-center relative">
              <Dumbbell className="mx-auto mb-1 h-5 w-5 text-green-600" />
              <p className="text-2xl font-bold">
                {avgVolume30d > 1000
                  ? `${(avgVolume30d / 1000).toFixed(1)}k`
                  : avgVolume30d}
              </p>
              <p className="text-xs text-zinc-500">Avg Volume (30d)</p>
              <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-300" />
            </Card>
          </button>
        </div>

        {/* Volume trend chart (expandable) */}
        {showChart && (
          <Card>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold text-zinc-900">Volume Trend</h2>
              <button
                onClick={() => setShowChart(false)}
                className="rounded-full p-1 hover:bg-zinc-100"
              >
                <X className="h-4 w-4 text-zinc-400" />
              </button>
            </div>
            <VolumeChart summaries={summaries} />
          </Card>
        )}

        {/* Plateau alerts */}
        <PlateauAlerts />

        {/* Strength curves */}
        <Card>
          <h2 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">
            Strength Curves
          </h2>
          <StrengthChart />
        </Card>

        {/* Mood & Energy Insights */}
        <Card>
          <h2 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">
            Mood &amp; Energy Insights
          </h2>
          <MoodEnergyChart />
        </Card>

        {/* Recent workouts */}
        <div>
          <h2 className="mb-2 font-semibold text-zinc-900">
            Recent Workouts
          </h2>
          {totalWorkouts === 0 ? (
            <Card className="py-8 text-center">
              <TrendingUp className="mx-auto mb-2 h-8 w-8 text-zinc-300" />
              <p className="text-sm text-zinc-500">
                Complete your first workout to see progress here.
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {summaries.slice(0, 20).map((s) => {
                const template = templateMap.get(s.session.templateId);
                return (
                  <Card key={s.session.id} className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-zinc-900 truncate">
                          {template?.name ?? "Workout"}
                        </p>
                        <div className="mt-0.5 flex items-center gap-3 text-xs text-zinc-500">
                          <span>
                            {formatDate(new Date(s.session.startedAt))}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Dumbbell className="h-3 w-3" />
                            {s.totalSets} sets
                          </span>
                          {s.durationMinutes > 0 && (
                            <span className="flex items-center gap-0.5">
                              <Clock className="h-3 w-3" />
                              {s.durationMinutes}m
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-zinc-700">
                          {s.totalVolume > 1000
                            ? `${(s.totalVolume / 1000).toFixed(1)}k`
                            : Math.round(s.totalVolume)}{" "}
                          kg
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
