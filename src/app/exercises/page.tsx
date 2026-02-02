"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { MUSCLE_GROUPS } from "@/lib/constants";

export default function ExercisesPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string | null>(null);

  const exercises = useLiveQuery(() => db.exercises.toArray(), []);

  const filtered = (exercises ?? []).filter((e) => {
    const matchesSearch = e.name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesFilter = !filter || e.muscleGroup === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div>
      <Header title="Exercises" />
      <div className="p-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search exercises..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 pl-10 pr-4 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Muscle group filter */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
          <button
            onClick={() => setFilter(null)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              !filter
                ? "bg-blue-600 text-white"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            All
          </button>
          {MUSCLE_GROUPS.map((mg) => (
            <button
              key={mg}
              onClick={() => setFilter(filter === mg ? null : mg)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                filter === mg
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              {mg}
            </button>
          ))}
        </div>

        {/* Exercise list */}
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{filtered.length} exercises</p>
        <div className="space-y-2">
          {filtered.map((exercise) => (
            <Card key={exercise.id} className="py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{exercise.name}</p>
                  <p className="text-xs text-zinc-500 capitalize">
                    {exercise.equipment}
                  </p>
                </div>
                <Badge variant="secondary" className="capitalize">
                  {exercise.muscleGroup}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
