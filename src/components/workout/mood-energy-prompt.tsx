"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MoodEnergyPromptProps {
  open: boolean;
  onSubmit: (mood: number, energy: number) => void;
  onSkip: () => void;
}

const MOOD_LABELS: Record<number, string> = {
  1: "Terrible",
  2: "Bad",
  3: "Poor",
  4: "Meh",
  5: "Okay",
  6: "Decent",
  7: "Good",
  8: "Great",
  9: "Amazing",
  10: "Peak",
};

const ENERGY_LABELS: Record<number, string> = {
  1: "Dead",
  2: "Exhausted",
  3: "Drained",
  4: "Low",
  5: "Okay",
  6: "Decent",
  7: "Good",
  8: "Strong",
  9: "Fired Up",
  10: "Unstoppable",
};

function moodColor(level: number): string {
  if (level <= 3) return "bg-red-100 ring-red-400";
  if (level <= 5) return "bg-amber-100 ring-amber-400";
  if (level <= 7) return "bg-blue-100 ring-blue-500";
  return "bg-green-100 ring-green-500";
}

function energyColor(level: number): string {
  if (level <= 3) return "bg-red-100 text-red-700 ring-red-400";
  if (level <= 5) return "bg-amber-100 text-amber-700 ring-amber-400";
  if (level <= 7) return "bg-green-100 text-green-700 ring-green-500";
  return "bg-emerald-100 text-emerald-700 ring-emerald-500";
}

export function MoodEnergyPrompt({
  open,
  onSubmit,
  onSkip,
}: MoodEnergyPromptProps) {
  const [mood, setMood] = useState(5);
  const [energy, setEnergy] = useState(5);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg rounded-t-2xl bg-white dark:bg-zinc-900 p-5 pb-8"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <h2 className="mb-4 text-center text-lg font-bold text-zinc-900 dark:text-zinc-100">
              How are you feeling?
            </h2>

            {/* Mood */}
            <div className="mb-4">
              <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Mood — {MOOD_LABELS[mood]}
              </p>
              <div className="grid grid-cols-10 gap-1">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((level) => (
                  <button
                    key={level}
                    onClick={() => setMood(level)}
                    className={cn(
                      "rounded-lg py-2 text-sm font-bold transition-all",
                      mood === level
                        ? `${moodColor(level)} ring-2 scale-110`
                        : "bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                    )}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Energy */}
            <div className="mb-5">
              <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Energy — {ENERGY_LABELS[energy]}
              </p>
              <div className="grid grid-cols-10 gap-1">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((level) => (
                  <button
                    key={level}
                    onClick={() => setEnergy(level)}
                    className={cn(
                      "rounded-lg py-2 text-sm font-bold transition-all",
                      energy === level
                        ? `${energyColor(level)} ring-2 scale-110`
                        : "bg-zinc-50 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                    )}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="lg"
                className="flex-1"
                onClick={onSkip}
              >
                Skip
              </Button>
              <Button
                size="lg"
                className="flex-1"
                onClick={() => onSubmit(mood, energy)}
              >
                Start Workout
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
