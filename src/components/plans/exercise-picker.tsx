"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Search } from "lucide-react";
import { db, type Exercise } from "@/lib/db";
import { Sheet } from "@/components/ui/sheet";
import type { MuscleGroup } from "@/lib/constants";

interface ExercisePickerProps {
  open: boolean;
  onClose: () => void;
  muscleGroup: MuscleGroup;
  onSelect: (exercise: Exercise) => void;
}

export function ExercisePicker({
  open,
  onClose,
  muscleGroup,
  onSelect,
}: ExercisePickerProps) {
  const [search, setSearch] = useState("");

  const exercises = useLiveQuery(
    () =>
      db.exercises
        .where("muscleGroup")
        .equals(muscleGroup)
        .toArray(),
    [muscleGroup]
  );

  const filtered = (exercises ?? []).filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  function handleSelect(exercise: Exercise) {
    onSelect(exercise);
    onClose();
    setSearch("");
  }

  return (
    <Sheet
      open={open}
      onClose={() => {
        onClose();
        setSearch("");
      }}
      title={`Pick ${muscleGroup} exercise`}
    >
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-zinc-300 bg-white pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-400"
            autoFocus
          />
        </div>
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {filtered.map((exercise) => (
            <button
              key={exercise.id}
              onClick={() => handleSelect(exercise)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-zinc-100 active:bg-zinc-200 dark:hover:bg-zinc-700 dark:active:bg-zinc-600"
            >
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {exercise.name}
                </p>
                <p className="text-xs text-zinc-500 capitalize dark:text-zinc-400">
                  {exercise.equipment}
                </p>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="py-4 text-center text-sm text-zinc-400 dark:text-zinc-500">
              No {muscleGroup} exercises found
            </p>
          )}
        </div>
      </div>
    </Sheet>
  );
}
