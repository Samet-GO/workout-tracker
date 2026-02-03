"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { WeightInput } from "@/components/shared/weight-input";
import { QuickLogBar } from "./quick-log-bar";
import { SpecialSetInput } from "./special-set-input";
import { Check, X } from "lucide-react";
import { haptic } from "@/lib/utils";

interface SpecialSetData {
  partialsCount?: number;
  dropSetWeight?: number;
  dropSetReps?: number;
  forcedRepsCount?: number;
  isPausedReps?: boolean;
}

interface SetLoggerProps {
  exerciseId: number;
  templateExerciseId?: number;
  setNumber: number;
  previousWeight: number;
  previousReps: number;
  previousRpe?: number;
  energy?: number;
  targetReps: string;
  onLog: (weight: number, reps: number, special?: SpecialSetData) => void;
  unit: string;
}

export function SetLogger({
  exerciseId,
  previousWeight,
  previousReps,
  previousRpe,
  energy,
  targetReps,
  onLog,
  unit,
}: SetLoggerProps) {
  const [showManual, setShowManual] = useState(false);

  // C3: Restore draft from localStorage
  const draftKey = `set-draft-${exerciseId}`;
  const savedDraft = typeof window !== "undefined" ? localStorage.getItem(draftKey) : null;
  const draft = savedDraft ? JSON.parse(savedDraft) as { weight: number; reps: number } : null;

  const [weight, setWeight] = useState(draft?.weight ?? previousWeight);
  const [reps, setReps] = useState(draft?.reps ?? (previousReps || parseTargetReps(targetReps)));
  const [specialData, setSpecialData] = useState<SpecialSetData>({});

  // Persist draft to localStorage when manual form is open
  const saveDraft = useCallback(
    (w: number, r: number) => {
      if (typeof window !== "undefined") {
        localStorage.setItem(draftKey, JSON.stringify({ weight: w, reps: r }));
      }
    },
    [draftKey]
  );

  const clearDraft = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(draftKey);
    }
  }, [draftKey]);

  useEffect(() => {
    if (showManual) {
      saveDraft(weight, reps);
    }
  }, [weight, reps, showManual, saveDraft]);

  function parseTargetReps(target: string): number {
    const match = target.match(/^(\d+)/);
    return match ? Number(match[1]) : 10;
  }

  function handleMatch() {
    onLog(previousWeight, previousReps);
  }

  function handleIncrement(amount: number) {
    onLog(previousWeight + amount, previousReps);
  }

  function handleManualSubmit() {
    haptic("medium");
    onLog(weight, reps, specialData);
    setShowManual(false);
    setSpecialData({});
    clearDraft();
  }

  if (showManual) {
    return (
      <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/30 p-3">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Weight ({unit})
            </label>
            <WeightInput value={weight} onChange={setWeight} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Reps
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={reps || ""}
              onChange={(e) => setReps(Number(e.target.value) || 0)}
              className="h-11 w-16 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-center text-lg font-semibold text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        <SpecialSetInput onChange={setSpecialData} />

        <div className="flex gap-2">
          <Button
            variant="success"
            size="md"
            className="flex-1"
            onClick={handleManualSubmit}
            disabled={weight <= 0 || reps <= 0}
          >
            <Check className="mr-1 h-4 w-4" />
            Save Set
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={() => {
              setShowManual(false);
              setSpecialData({});
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <QuickLogBar
      previousWeight={previousWeight}
      previousReps={previousReps}
      previousRpe={previousRpe}
      energy={energy}
      onMatch={handleMatch}
      onIncrement={handleIncrement}
      onManual={() => setShowManual(true)}
      unit={unit}
    />
  );
}
