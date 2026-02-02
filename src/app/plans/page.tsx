"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Header } from "@/components/layout/header";
import { PlanCard } from "@/components/plans/plan-card";

export default function PlansPage() {
  const templates = useLiveQuery(() => db.workoutTemplates.toArray(), []);

  return (
    <div>
      <Header title="Workout Plans" />
      <div className="space-y-3 p-4">
        {!templates ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-36 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800"
              />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <p className="py-12 text-center text-zinc-500">
            No workout plans found. Try reloading the app.
          </p>
        ) : (
          templates.map((plan) => <PlanCard key={plan.id} plan={plan} />)
        )}
      </div>
    </div>
  );
}
