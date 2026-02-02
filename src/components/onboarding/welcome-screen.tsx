"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dumbbell, BarChart3, Wifi, WifiOff, ChevronRight } from "lucide-react";

interface WelcomeScreenProps {
  onComplete: () => void;
}

const STEPS = [
  {
    icon: Dumbbell,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-100 dark:bg-blue-900",
    title: "Track Your Workouts",
    description:
      "Log sets with just a few taps. Match your previous weight or quickly adjust — designed for the gym floor.",
  },
  {
    icon: BarChart3,
    iconColor: "text-green-600",
    iconBg: "bg-green-100 dark:bg-green-900",
    title: "See Your Progress",
    description:
      "Volume trends, strength curves, and plateau detection help you stay on track and break through stalls.",
  },
  {
    icon: WifiOff,
    iconColor: "text-purple-600",
    iconBg: "bg-purple-100 dark:bg-purple-900",
    title: "Works Offline",
    description:
      "All data stays on your device. No account needed, no internet required. Install as an app for the best experience.",
  },
];

export function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  const [step, setStep] = useState(0);

  function next() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  }

  const current = STEPS[step];

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col items-center text-center"
        >
          <div
            className={`mb-6 flex h-20 w-20 items-center justify-center rounded-2xl ${current.iconBg}`}
          >
            <current.icon className={`h-10 w-10 ${current.iconColor}`} />
          </div>
          <h1 className="mb-3 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {current.title}
          </h1>
          <p className="max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
            {current.description}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Dots */}
      <div className="mt-10 flex gap-2">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all ${
              i === step
                ? "w-6 bg-blue-600"
                : "w-2 bg-zinc-300 dark:bg-zinc-600"
            }`}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
        <Button size="lg" className="w-full" onClick={next}>
          {step < STEPS.length - 1 ? (
            <>
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </>
          ) : (
            "Get Started"
          )}
        </Button>
        {step < STEPS.length - 1 && (
          <button
            onClick={onComplete}
            className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
