"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeightInputProps {
  value: number;
  onChange: (value: number) => void;
  increment?: number;
  className?: string;
  id?: string;
  "aria-label"?: string;
}

export function WeightInput({
  value,
  onChange,
  increment = 2.5,
  className,
  id,
  "aria-label": ariaLabel,
}: WeightInputProps) {
  return (
    <div className={cn("flex items-center gap-2", className)} role="group" aria-label={ariaLabel || "Weight input"}>
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - increment))}
        className="flex h-11 w-11 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-700 active:bg-zinc-200 dark:active:bg-zinc-600 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label={`Decrease weight by ${increment}`}
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        aria-label={ariaLabel || "Weight value"}
        className="h-11 w-20 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-center text-lg font-semibold text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      />
      <button
        type="button"
        onClick={() => onChange(value + increment)}
        className="flex h-11 w-11 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-700 active:bg-zinc-200 dark:active:bg-zinc-600 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label={`Increase weight by ${increment}`}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
