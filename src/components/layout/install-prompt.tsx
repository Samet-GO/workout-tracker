"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, X, Share } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let iOSTimer: ReturnType<typeof setTimeout> | null = null;

    async function checkInstalled(): Promise<boolean> {
      // Method 1: Currently in standalone mode (launched from home screen)
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
      if (isStandalone) return true;

      // Method 2: iOS standalone mode
      const isIOSStandalone = ("standalone" in window.navigator) &&
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
      if (isIOSStandalone) return true;

      // Method 3: Previously installed (we set this flag on appinstalled event)
      const wasInstalled = localStorage.getItem("pwa-installed") === "true";
      if (wasInstalled) return true;

      // Method 4: getInstalledRelatedApps() - most reliable but limited support
      if ("getInstalledRelatedApps" in navigator) {
        try {
          const relatedApps = await (navigator as Navigator & {
            getInstalledRelatedApps(): Promise<Array<{ platform: string }>>
          }).getInstalledRelatedApps();
          if (relatedApps.length > 0) return true;
        } catch {
          // Ignore errors
        }
      }

      return false;
    }

    // Check if dismissed recently (24h cooldown)
    const dismissedAt = localStorage.getItem("install-prompt-dismissed");
    if (dismissedAt) {
      const hoursSinceDismissed = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60);
      if (hoursSinceDismissed < 24) {
        setDismissed(true);
        return;
      }
    }

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
    setIsIOS(iOS);

    // Listen for beforeinstallprompt (Chrome/Edge/Samsung)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    // Listen for successful installation
    const handleInstalled = () => {
      localStorage.setItem("pwa-installed", "true");
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    // Initialize
    checkInstalled().then((installed) => {
      if (installed) {
        setIsInstalled(true);
        return;
      }

      // Not installed, set up listeners
      window.addEventListener("beforeinstallprompt", handleBeforeInstall);
      window.addEventListener("appinstalled", handleInstalled);

      // Show iOS prompt after delay
      if (iOS) {
        iOSTimer = setTimeout(() => setShowPrompt(true), 3000);
      }
    });

    return () => {
      if (iOSTimer) clearTimeout(iOSTimer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      localStorage.setItem("pwa-installed", "true");
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    localStorage.setItem("install-prompt-dismissed", Date.now().toString());
    setDismissed(true);
    setShowPrompt(false);
  }, []);

  // Don't show if installed, dismissed, or no prompt available
  if (isInstalled || dismissed || !showPrompt) {
    return null;
  }

  // iOS-specific instructions
  if (isIOS) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-40 mx-auto max-w-lg animate-in slide-in-from-bottom-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
          <div className="mb-3 flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                <Download className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Install App</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Add to home screen for the best experience</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700"
            >
              <X className="h-4 w-4 text-zinc-400" />
            </button>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-zinc-50 p-3 text-sm text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
            <Share className="h-4 w-4 flex-shrink-0" />
            <span>
              Tap <strong>Share</strong> then <strong>&quot;Add to Home Screen&quot;</strong>
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Chrome/Edge install prompt
  if (deferredPrompt) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-40 mx-auto max-w-lg animate-in slide-in-from-bottom-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                <Download className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Install App</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Works offline, faster access</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleDismiss}>
                Later
              </Button>
              <Button size="sm" onClick={handleInstall}>
                Install
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
