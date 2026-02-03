"use client";

import { useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      // Hide "Back online" message after 3s
      setTimeout(() => setShowReconnected(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Show nothing if online and no recent reconnection
  if (isOnline && !showReconnected) {
    return null;
  }

  // Show "Back online" briefly after reconnection
  if (isOnline && showReconnected) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-green-500 py-1.5 text-xs font-medium text-white">
        <Wifi className="h-3.5 w-3.5" />
        Back online
      </div>
    );
  }

  // Show offline indicator
  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-amber-500 py-1.5 text-xs font-medium text-white">
      <WifiOff className="h-3.5 w-3.5" />
      You&apos;re offline — data saves locally
    </div>
  );
}
