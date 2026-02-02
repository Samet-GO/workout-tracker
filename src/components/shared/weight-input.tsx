"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeightInputProps {
  value: number;
  onChange: (value: number) => void;
  increment?: number;
  className?: string;
}

export function WeightInput({
  value,
  onChange,
  increment = 2.5,
  className,
}: WeightInputProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - increment))}
        className="flex h-11 w-11 items-center justify-center rounded-lg bg-zinc-100 active:bg-zinc-200"
      >
        <Minus className="h-4 w-4" />
      </button>
      <input
        type="number"
        inputMode="decimal"
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="h-11 w-20 rounded-lg border border-zinc-300 text-center text-lg font-semibold focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      />
      <button
        type="button"
        onClick={() => onChange(value + increment)}
        className="flex h-11 w-11 items-center justify-center rounded-lg bg-zinc-100 active:bg-zinc-200"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
