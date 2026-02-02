"use client";

import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import {
  Lightbulb,
  TrendingUp,
  Calendar,
  Flame,
  AlertTriangle,
  Heart,
} from "lucide-react";
import { detectPlateaus } from "@/lib/analytics";

interface Insight {
  icon: typeof Lightbulb;
  iconColor: string;
  title: string;
  body: string;
}

export function InsightCards() {
  const [insights, setInsights] = useState<Insight[]>([]);

  const sessions = useLiveQuery(
    () =>
      db.workoutSessions
        .filter((s) => !!s.completedAt)
        .reverse()
        .toArray(),
    []
  );

  const sets = useLiveQuery(() => db.workoutSets.toArray(), []);

  useEffect(() => {
    if (!sessions || !sets) return;

    async function buildInsights() {
      const results: Insight[] = [];

      // Consistency insight
      if (sessions!.length >= 2) {
        const recent7d = sessions!.filter(
          (s) =>
            Date.now() - new Date(s.startedAt).getTime() <
            7 * 24 * 60 * 60 * 1000
        );
        const prev7d = sessions!.filter((s) => {
          const age = Date.now() - new Date(s.startedAt).getTime();
          return (
            age >= 7 * 24 * 60 * 60 * 1000 && age < 14 * 24 * 60 * 60 * 1000
          );
        });

        if (recent7d.length > prev7d.length) {
          results.push({
            icon: Flame,
            iconColor: "text-orange-500",
            title: "On Fire!",
            body: `${recent7d.length} workouts this week vs ${prev7d.length} last week. Keep it up!`,
          });
        } else if (recent7d.length < prev7d.length && prev7d.length > 0) {
          results.push({
            icon: Calendar,
            iconColor: "text-blue-500",
            title: "Stay Consistent",
            body: `${recent7d.length} workouts this week vs ${prev7d.length} last week. Try to get one more in!`,
          });
        }
      }

      // Volume trend insight
      if (sessions!.length >= 4) {
        const recentSessions = sessions!.slice(0, 4);
        const setsBySession = new Map<number, typeof sets>();
        for (const set of sets!) {
          const list = setsBySession.get(set.sessionId) ?? [];
          list.push(set);
          setsBySession.set(set.sessionId, list);
        }

        const recentVolumes = recentSessions.map((s) => {
          const sSets = setsBySession.get(s.id!) ?? [];
          return sSets.reduce((sum, st) => sum + st!.weight * st!.reps, 0);
        });

        const avgRecent2 = (recentVolumes[0] + recentVolumes[1]) / 2;
        const avgPrev2 = (recentVolumes[2] + recentVolumes[3]) / 2;

        if (avgPrev2 > 0 && avgRecent2 > avgPrev2 * 1.05) {
          results.push({
            icon: TrendingUp,
            iconColor: "text-green-500",
            title: "Volume Trending Up",
            body: `Your recent sessions average ${Math.round(
              ((avgRecent2 - avgPrev2) / avgPrev2) * 100
            )}% more volume. Great progressive overload!`,
          });
        }
      }

      // C4: Plateau narratives
      try {
        const plateaus = await detectPlateaus(3);
        for (const p of plateaus.slice(0, 2)) {
          results.push({
            icon: AlertTriangle,
            iconColor: "text-amber-500",
            title: `${p.exerciseName} Stalled`,
            body: `Your ${p.exerciseName} has been stuck at ${p.lastWeight}kg × ${p.lastReps} for ${p.stalledSessions} sessions. Consider changing rep range or adding intensity techniques.`,
          });
        }
      } catch {
        // ignore plateau detection errors
      }

      // C4: Mood/energy correlation
      if (sessions!.length >= 3) {
        const withMood = sessions!.filter(
          (s) => s.mood !== undefined && s.energy !== undefined
        );
        if (withMood.length >= 3) {
          const setsBySession = new Map<number, typeof sets>();
          for (const set of sets!) {
            const list = setsBySession.get(set.sessionId) ?? [];
            list.push(set);
            setsBySession.set(set.sessionId, list);
          }

          const highEnergy = withMood.filter((s) => s.energy! >= 7);
          const lowEnergy = withMood.filter((s) => s.energy! <= 4);

          if (highEnergy.length >= 2 && lowEnergy.length >= 1) {
            const avgHighVol =
              highEnergy.reduce((sum, s) => {
                const sSets = setsBySession.get(s.id!) ?? [];
                return (
                  sum + sSets.reduce((a, st) => a + st!.weight * st!.reps, 0)
                );
              }, 0) / highEnergy.length;

            const avgLowVol =
              lowEnergy.reduce((sum, s) => {
                const sSets = setsBySession.get(s.id!) ?? [];
                return (
                  sum + sSets.reduce((a, st) => a + st!.weight * st!.reps, 0)
                );
              }, 0) / lowEnergy.length;

            if (avgHighVol > avgLowVol * 1.1) {
              const pct = Math.round(
                ((avgHighVol - avgLowVol) / avgLowVol) * 100
              );
              results.push({
                icon: Heart,
                iconColor: "text-pink-500",
                title: "Energy Matters",
                body: `When your energy is 7+, you lift ${pct}% more volume. Prioritize sleep and nutrition!`,
              });
            }
          }
        }
      }

      // First workout suggestion
      if (sessions!.length === 0) {
        results.push({
          icon: Lightbulb,
          iconColor: "text-amber-500",
          title: "Ready to Start",
          body: "Pick a plan and start your first workout to see insights here.",
        });
      }

      setInsights(results);
    }

    buildInsights();
  }, [sessions, sets]);

  if (insights.length === 0) return null;

  return (
    <div className="space-y-2">
      {insights.map((insight, i) => (
        <div
          key={i}
          className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-800"
        >
          <insight.icon
            className={`mt-0.5 h-5 w-5 flex-shrink-0 ${insight.iconColor}`}
          />
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {insight.title}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {insight.body}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
