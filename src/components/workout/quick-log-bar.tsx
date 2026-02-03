"use client";

import { Button } from "@/components/ui/button";
import { haptic } from "@/lib/utils";

interface QuickLogBarProps {
  previousWeight: number;
  previousReps: number;
  previousRpe?: number;
  energy?: number;
  onMatch: () => void;
  onIncrement: (amount: number) => void;
  onManual: () => void;
  unit: string;
}

function getSuggestion(
  previousWeight: number,
  previousRpe: number | undefined,
  energy: number | undefined
): string | null {
  if (!previousWeight) return null;

  // If we have RPE from last session
  if (previousRpe !== undefined && previousRpe > 0) {
    if (previousRpe <= 6) {
      return "Last set felt easy — try +2.5 or +5";
    }
    if (previousRpe >= 9) {
      if (energy !== undefined && energy <= 4) {
        return "Tough last time + low energy — consider dropping weight";
      }
      return "Last set was near max — match or reduce";
    }
  }

  // Energy-only suggestion
  if (energy !== undefined) {
    if (energy >= 8) return "High energy — push for +2.5 or +5";
    if (energy <= 3) return "Low energy — match weight, focus on form";
  }

  return null;
}

export function QuickLogBar({
  previousWeight,
  previousReps,
  previousRpe,
  energy,
  onMatch,
  onIncrement,
  onManual,
  unit,
}: QuickLogBarProps) {
  const hasHistory = previousWeight > 0;
  const suggestion = getSuggestion(previousWeight, previousRpe, energy);

  return (
    <div className="space-y-1.5">
      {hasHistory && suggestion && (
        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">{suggestion}</p>
      )}
      <div className="flex gap-2">
        {hasHistory ? (
          <>
            <Button
              variant="success"
              size="lg"
              className="flex-1 min-h-[44px]"
              onClick={() => {
                haptic("medium");
                onMatch();
              }}
            >
              Match ({previousWeight}{unit} x{previousReps})
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="min-h-[44px] px-3"
              onClick={() => {
                haptic("light");
                onIncrement(2.5);
              }}
            >
              +2.5
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="min-h-[44px] px-3"
              onClick={() => {
                haptic("light");
                onIncrement(5);
              }}
            >
              +5
            </Button>
          </>
        ) : null}
        <Button
          variant="outline"
          size="lg"
          className={`min-h-[44px] ${hasHistory ? "px-3" : "flex-1"}`}
          onClick={onManual}
        >
          {hasHistory ? "Edit" : "Log Set"}
        </Button>
      </div>
    </div>
  );
}
