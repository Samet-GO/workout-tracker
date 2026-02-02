"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Upload } from "lucide-react";
import { usePreferences } from "@/hooks/use-preferences";
import { exportAllData, downloadJson, importData } from "@/lib/export";

export default function SettingsPage() {
  const { prefs, updatePreferences } = usePreferences();
  const [importStatus, setImportStatus] = useState<string | null>(null);

  return (
    <div>
      <Header title="Settings" />
      <div className="p-4 space-y-4">
        <Card>
          <h3 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">Preferences</h3>
          <div className="space-y-4">
            {/* Theme */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Theme</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">App color scheme</p>
              </div>
              <div className="flex rounded-lg border border-zinc-300 dark:border-zinc-700">
                {(["light", "system", "dark"] as const).map((value) => (
                  <button
                    key={value}
                    onClick={() => updatePreferences({ theme: value })}
                    className={`px-3 py-1.5 text-sm font-medium capitalize ${
                      prefs.theme === value
                        ? "bg-blue-600 text-white first:rounded-l-lg last:rounded-r-lg"
                        : "text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            {/* Weight Unit */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Weight Unit</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Used for all weight displays</p>
              </div>
              <div className="flex rounded-lg border border-zinc-300 dark:border-zinc-700">
                <button
                  onClick={() => updatePreferences({ weightUnit: "kg" })}
                  className={`px-3 py-1.5 text-sm font-medium ${
                    prefs.weightUnit === "kg"
                      ? "bg-blue-600 text-white rounded-l-lg"
                      : "text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  kg
                </button>
                <button
                  onClick={() => updatePreferences({ weightUnit: "lbs" })}
                  className={`px-3 py-1.5 text-sm font-medium ${
                    prefs.weightUnit === "lbs"
                      ? "bg-blue-600 text-white rounded-r-lg"
                      : "text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  lbs
                </button>
              </div>
            </div>

            {/* Rest Timer */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Rest Timer</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Auto-start after logging a set</p>
              </div>
              <button
                onClick={() =>
                  updatePreferences({
                    restTimerEnabled: !prefs.restTimerEnabled,
                  })
                }
                className={`relative h-7 w-12 rounded-full transition-colors ${
                  prefs.restTimerEnabled ? "bg-blue-600" : "bg-zinc-300 dark:bg-zinc-700"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                    prefs.restTimerEnabled
                      ? "translate-x-5"
                      : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {/* RPE Prompt */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">RPE Prompt</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Ask for RPE after each set</p>
              </div>
              <button
                onClick={() =>
                  updatePreferences({
                    showRpePrompt: !prefs.showRpePrompt,
                  })
                }
                className={`relative h-7 w-12 rounded-full transition-colors ${
                  prefs.showRpePrompt ? "bg-blue-600" : "bg-zinc-300 dark:bg-zinc-700"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                    prefs.showRpePrompt
                      ? "translate-x-5"
                      : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {/* Default Increment */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Default Increment
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Weight step for +/- buttons</p>
              </div>
              <div className="flex rounded-lg border border-zinc-300 dark:border-zinc-700">
                {[1.25, 2.5, 5].map((val) => (
                  <button
                    key={val}
                    onClick={() =>
                      updatePreferences({ defaultIncrement: val })
                    }
                    className={`px-3 py-1.5 text-sm font-medium ${
                      prefs.defaultIncrement === val
                        ? "bg-blue-600 text-white first:rounded-l-lg last:rounded-r-lg"
                        : "text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="mb-2 font-semibold text-zinc-900 dark:text-zinc-100">About</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Workout Tracker v1.0 — Offline-first PWA for strength training.
            All data is stored locally on your device.
          </p>
        </Card>

        <Card>
          <h3 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">Data</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Export Backup</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Download all data as JSON</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  const data = await exportAllData();
                  downloadJson(data);
                }}
              >
                <Download className="mr-1 h-4 w-4" />
                Export
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Import Backup</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Restore from JSON file (replaces all data)</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => document.getElementById("import-file")?.click()}
              >
                <Upload className="mr-1 h-4 w-4" />
                Import
              </Button>
              <input
                id="import-file"
                type="file"
                accept=".json"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setImportStatus("Importing...");
                  const result = await importData(file);
                  setImportStatus(
                    result.success
                      ? "Import successful! Reload to see changes."
                      : `Error: ${result.error}`
                  );
                  e.target.value = "";
                }}
              />
            </div>
            {importStatus && (
              <p
                className={`text-xs ${
                  importStatus.startsWith("Error")
                    ? "text-red-500"
                    : "text-green-600 dark:text-green-400"
                }`}
              >
                {importStatus}
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
