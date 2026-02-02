"use client";

import { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { detectPlateaus, type PlateauAlert } from "@/lib/analytics";

export function PlateauAlerts() {
  const [alerts, setAlerts] = useState<PlateauAlert[]>([]);

  useEffect(() => {
    detectPlateaus(3).then(setAlerts);
  }, []);

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
        <AlertTriangle className="h-4 w-4" />
        Plateau Detected
      </h3>
      {alerts.map((a) => (
        <div
          key={a.exerciseId}
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-950"
        >
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
            {a.exerciseName}
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Stalled at {a.lastWeight}kg x {a.lastReps} for{" "}
            {a.stalledSessions} sessions
          </p>
        </div>
      ))}
    </div>
  );
}
