"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export function useRestTimer() {
  const [remaining, setRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
    setRemaining(0);
  }, []);

  const start = useCallback(
    (seconds: number, onComplete?: () => void) => {
      stop();
      onCompleteRef.current = onComplete ?? null;
      setRemaining(seconds);
      setIsRunning(true);

      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            stop();
            onCompleteRef.current?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [stop]
  );

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { remaining, isRunning, start, stop };
}
