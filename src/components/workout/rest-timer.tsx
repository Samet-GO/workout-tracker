"use client";

import { motion, AnimatePresence } from "framer-motion";
import { formatDuration } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface RestTimerProps {
  remaining: number;
  isRunning: boolean;
  onSkip: () => void;
}

export function RestTimer({ remaining, isRunning, onSkip }: RestTimerProps) {
  return (
    <AnimatePresence>
      {isRunning && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed inset-x-0 bottom-20 z-30 mx-auto max-w-lg px-4"
        >
          <div className="flex items-center justify-between rounded-2xl bg-zinc-900 p-4 shadow-lg">
            <div>
              <p className="text-xs font-medium text-zinc-400">Rest Timer</p>
              <p className="text-2xl font-bold text-white tabular-nums">
                {formatDuration(remaining)}
              </p>
            </div>
            <Button
              variant="ghost"
              onClick={onSkip}
              className="text-white hover:bg-zinc-800"
            >
              Skip
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
