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
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
              <svg
                className="h-8 w-8 text-zinc-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <p className="mb-2 font-medium text-zinc-700 dark:text-zinc-300">
              No workout plans available
            </p>
            <p className="mb-4 text-sm text-zinc-500">
              Plans should load automatically. If this persists, try clearing
              your browser data and reloading.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Reload App
            </button>
          </div>
        ) : (
          templates.map((plan) => <PlanCard key={plan.id} plan={plan} />)
        )}
      </div>
    </div>
  );
}
