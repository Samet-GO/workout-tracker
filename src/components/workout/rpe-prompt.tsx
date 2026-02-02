"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RPE_AUTO_DISMISS_MS } from "@/lib/constants";

interface RpePromptProps {
  open: boolean;
  onSubmit: (rpe: number) => void;
  onDismiss: () => void;
}

const RPE_VALUES = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10] as const;

const RPE_LABELS: Record<number, string> = {
  6: "Easy",
  7: "Moderate",
  8: "Hard",
  9: "Very Hard",
  10: "Max Effort",
};

function getRpeLabel(rpe: number): string {
  return RPE_LABELS[Math.floor(rpe)] ?? "";
}

function getRpeColor(rpe: number): string {
  if (rpe <= 6.5) return "bg-green-500";
  if (rpe <= 7.5) return "bg-lime-500";
  if (rpe <= 8.5) return "bg-amber-500";
  if (rpe <= 9.5) return "bg-orange-500";
  return "bg-red-500";
}

export function RpePrompt({ open, onSubmit, onDismiss }: RpePromptProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setSelected(null);
      timerRef.current = setTimeout(() => {
        onDismiss();
      }, RPE_AUTO_DISMISS_MS);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [open, onDismiss]);

  function handleSelect(rpe: number) {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSelected(rpe);
    onSubmit(rpe);
  }

  function handleSwipeDismiss() {
    if (timerRef.current) clearTimeout(timerRef.current);
    onDismiss();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          drag="y"
          dragConstraints={{ top: 0 }}
          dragElastic={0.3}
          onDragEnd={(_, info) => {
            if (info.offset.y > 60 || info.velocity.y > 300) {
              handleSwipeDismiss();
            }
          }}
          className="fixed inset-x-0 bottom-20 z-40 mx-auto max-w-lg px-4"
        >
          <div className="rounded-2xl bg-white p-4 shadow-xl ring-1 ring-zinc-200">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-900">
                How hard was that?
              </p>
              <button
                onClick={handleSwipeDismiss}
                className="text-xs text-zinc-400 hover:text-zinc-600"
              >
                Skip
              </button>
            </div>
            {selected !== null && (
              <p className="mb-2 text-xs text-zinc-500">
                RPE {selected} — {getRpeLabel(selected)}
              </p>
            )}
            <div className="flex gap-1">
              {RPE_VALUES.map((rpe) => (
                <button
                  key={rpe}
                  onClick={() => handleSelect(rpe)}
                  className={`flex-1 rounded-lg min-h-[44px] py-2 text-xs font-bold transition-all ${
                    selected === rpe
                      ? `${getRpeColor(rpe)} text-white scale-110`
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  {rpe % 1 === 0 ? rpe : ""}
                </button>
              ))}
            </div>
            {/* Auto-dismiss progress bar */}
            <motion.div
              className="mt-2 h-0.5 rounded-full bg-zinc-200"
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: RPE_AUTO_DISMISS_MS / 1000, ease: "linear" }}
              style={{ transformOrigin: "left" }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
