"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { SpecialSetType } from "@/lib/constants";

interface SpecialSetData {
  partialsCount?: number;
  dropSetWeight?: number;
  dropSetReps?: number;
  forcedRepsCount?: number;
  isPausedReps?: boolean;
}

interface SpecialSetInputProps {
  onChange: (data: SpecialSetData) => void;
}

const SET_TYPES: { value: SpecialSetType; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "drop-set", label: "Drop Set" },
  { value: "forced-reps", label: "Forced Reps" },
  { value: "partials", label: "Partials" },
  { value: "paused-reps", label: "Paused Reps" },
  { value: "rest-pause", label: "Rest-Pause" },
];

export function SpecialSetInput({ onChange }: SpecialSetInputProps) {
  const [expanded, setExpanded] = useState(false);
  const [setType, setSetType] = useState<SpecialSetType>("normal");
  const [partialsCount, setPartialsCount] = useState(0);
  const [dropSetWeight, setDropSetWeight] = useState(0);
  const [dropSetReps, setDropSetReps] = useState(0);
  const [forcedRepsCount, setForcedRepsCount] = useState(0);
  const [isPausedReps, setIsPausedReps] = useState(false);

  function handleTypeChange(type: SpecialSetType) {
    setSetType(type);
    // Reset all
    const data: SpecialSetData = {};
    if (type === "paused-reps") {
      setIsPausedReps(true);
      data.isPausedReps = true;
    } else {
      setIsPausedReps(false);
    }
    onChange(data);
  }

  function emitChange(updates: Partial<SpecialSetData>) {
    const data: SpecialSetData = {
      partialsCount: setType === "partials" ? partialsCount : undefined,
      dropSetWeight: setType === "drop-set" ? dropSetWeight : undefined,
      dropSetReps: setType === "drop-set" ? dropSetReps : undefined,
      forcedRepsCount: setType === "forced-reps" ? forcedRepsCount : undefined,
      isPausedReps: setType === "paused-reps" ? isPausedReps : undefined,
      ...updates,
    };
    onChange(data);
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600"
      >
        Advanced
        <ChevronDown className="h-3 w-3" />
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-zinc-600">Set Type</p>
        <button
          onClick={() => {
            setExpanded(false);
            setSetType("normal");
            onChange({});
          }}
          className="flex items-center gap-0.5 text-xs text-zinc-400 hover:text-zinc-600"
        >
          Close
          <ChevronUp className="h-3 w-3" />
        </button>
      </div>

      <div className="flex flex-wrap gap-1">
        {SET_TYPES.map((st) => (
          <button
            key={st.value}
            onClick={() => handleTypeChange(st.value)}
            className={`rounded-md px-3 py-2.5 min-h-[44px] text-xs font-medium transition-colors ${
              setType === st.value
                ? "bg-blue-600 text-white"
                : "bg-white text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            {st.label}
          </button>
        ))}
      </div>

      {setType === "drop-set" && (
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="mb-0.5 block text-xs text-zinc-500">
              Drop Weight
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={dropSetWeight || ""}
              onChange={(e) => {
                const v = Number(e.target.value) || 0;
                setDropSetWeight(v);
                emitChange({ dropSetWeight: v });
              }}
              className="h-9 w-full rounded border border-zinc-300 px-2 text-center text-sm"
              placeholder="kg"
            />
          </div>
          <div className="flex-1">
            <label className="mb-0.5 block text-xs text-zinc-500">
              Drop Reps
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={dropSetReps || ""}
              onChange={(e) => {
                const v = Number(e.target.value) || 0;
                setDropSetReps(v);
                emitChange({ dropSetReps: v });
              }}
              className="h-9 w-full rounded border border-zinc-300 px-2 text-center text-sm"
              placeholder="reps"
            />
          </div>
        </div>
      )}

      {setType === "partials" && (
        <div>
          <label className="mb-0.5 block text-xs text-zinc-500">
            Partials Count
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={partialsCount || ""}
            onChange={(e) => {
              const v = Number(e.target.value) || 0;
              setPartialsCount(v);
              emitChange({ partialsCount: v });
            }}
            className="h-9 w-20 rounded border border-zinc-300 px-2 text-center text-sm"
            placeholder="0"
          />
        </div>
      )}

      {setType === "forced-reps" && (
        <div>
          <label className="mb-0.5 block text-xs text-zinc-500">
            Forced Reps Count
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={forcedRepsCount || ""}
            onChange={(e) => {
              const v = Number(e.target.value) || 0;
              setForcedRepsCount(v);
              emitChange({ forcedRepsCount: v });
            }}
            className="h-9 w-20 rounded border border-zinc-300 px-2 text-center text-sm"
            placeholder="0"
          />
        </div>
      )}

      {setType === "paused-reps" && (
        <p className="text-xs text-zinc-500">
          Paused reps will be flagged on this set.
        </p>
      )}
    </div>
  );
}
