"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { WelcomeScreen } from "@/components/onboarding/welcome-screen";

export default function Home() {
  const router = useRouter();
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  const sessionCount = useLiveQuery(
    () => db.workoutSessions.count(),
    []
  );

  useEffect(() => {
    if (sessionCount === undefined) return; // still loading

    // Check if user has seen onboarding
    const seen = localStorage.getItem("onboarding-complete");
    if (seen || sessionCount > 0) {
      router.replace("/plans");
    } else {
      setShowOnboarding(true);
    }
  }, [sessionCount, router]);

  function handleComplete() {
    localStorage.setItem("onboarding-complete", "1");
    router.replace("/plans");
  }

  if (showOnboarding) {
    return <WelcomeScreen onComplete={handleComplete} />;
  }

  // Loading state while checking
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
    </div>
  );
}
