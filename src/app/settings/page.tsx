"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Download, Upload, FolderOpen, Check, X, HelpCircle } from "lucide-react";
import Link from "next/link";
import { usePreferences } from "@/hooks/use-preferences";
import {
  exportAllData,
  downloadJson,
  importData,
  isFileSystemAccessSupported,
  saveToFolder,
  pickBackupFolder,
  hasStoredFolder,
  clearStoredFolder,
  getBackupMeta,
} from "@/lib/export";
import { checkDatabaseHealth, requestPersistentStorage, getStorageEstimate, isSafari } from "@/lib/db";

export default function SettingsPage() {
  const { prefs, updatePreferences } = usePreferences();
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [folderStatus, setFolderStatus] = useState<string | null>(null);
  const [hasFolder, setHasFolder] = useState(false);
  const [backupMeta, setBackupMeta] = useState<{ savedAt: string; sessionCount: number } | null>(null);
  const [storagePersisted, setStoragePersisted] = useState<boolean | null>(null);
  const [persistRequestStatus, setPersistRequestStatus] = useState<string | null>(null);
  const [storageUsed, setStorageUsed] = useState<{ used: number; quota: number; percentUsed: number } | null>(null);
  const [showSafariWarning, setShowSafariWarning] = useState(false);
  const supportsFileSystem = typeof window !== "undefined" && isFileSystemAccessSupported();

  useEffect(() => {
    hasStoredFolder().then(setHasFolder);
    setBackupMeta(getBackupMeta());
    checkDatabaseHealth().then((health) => {
      setStoragePersisted(health.persisted ?? null);
    });
    getStorageEstimate().then(setStorageUsed);
    setShowSafariWarning(isSafari());
  }, []);

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
              <Switch
                checked={prefs.restTimerEnabled}
                onCheckedChange={(checked) =>
                  updatePreferences({ restTimerEnabled: checked })
                }
              />
            </div>

            {/* Mood/Energy Prompt */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Mood Prompt</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Ask mood/energy at workout start</p>
              </div>
              <Switch
                checked={prefs.showMoodPrompt}
                onCheckedChange={(checked) =>
                  updatePreferences({ showMoodPrompt: checked })
                }
              />
            </div>

            {/* RPE Prompt */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">RPE Prompt</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Ask for RPE after each set</p>
              </div>
              <Switch
                checked={prefs.showRpePrompt}
                onCheckedChange={(checked) =>
                  updatePreferences({ showRpePrompt: checked })
                }
              />
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

          {showSafariWarning && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2 dark:border-amber-800 dark:bg-amber-900/20">
              <p className="text-xs text-amber-700 dark:text-amber-300">
                ⚠️ Safari may delete data after 7 days of inactivity. Enable cloud backup below to protect your workouts.
              </p>
            </div>
          )}

          <div className="mt-3 space-y-2">
            {/* Persistence status */}
            <div className="flex items-center gap-2">
              <div
                className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                  storagePersisted === null
                    ? "bg-zinc-400 dark:bg-zinc-500"
                    : storagePersisted
                      ? "bg-green-500"
                      : "bg-amber-500"
                }`}
              />
              <p className="flex-1 text-xs text-zinc-500 dark:text-zinc-400">
                {storagePersisted === null
                  ? "Checking storage..."
                  : storagePersisted
                    ? "Storage persistent — data protected"
                    : "Storage not persistent — browser may delete data"}
              </p>
              {storagePersisted === false && (
                <button
                  onClick={async () => {
                    setPersistRequestStatus("Requesting...");
                    try {
                      const granted = await requestPersistentStorage();
                      setStoragePersisted(granted);
                      setPersistRequestStatus(
                        granted
                          ? "Granted!"
                          : "Denied by browser. Try installing as app."
                      );
                      setTimeout(() => setPersistRequestStatus(null), 3000);
                    } catch {
                      setPersistRequestStatus("Error requesting storage");
                      setTimeout(() => setPersistRequestStatus(null), 3000);
                    }
                  }}
                  className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400 whitespace-nowrap"
                >
                  Request
                </button>
              )}
            </div>
            {persistRequestStatus && (
              <p className={`text-xs ${
                persistRequestStatus.includes("Granted")
                  ? "text-green-600 dark:text-green-400"
                  : persistRequestStatus.includes("Denied") || persistRequestStatus.includes("Error")
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-zinc-500"
              }`}>
                {persistRequestStatus}
              </p>
            )}

            {/* Storage usage */}
            {storageUsed && storageUsed.quota > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
                  <span>Storage used</span>
                  <span>
                    {(storageUsed.used / 1024 / 1024).toFixed(1)} MB / {(storageUsed.quota / 1024 / 1024).toFixed(0)} MB
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700">
                  <div
                    className={`h-full rounded-full ${
                      storageUsed.percentUsed > 80
                        ? "bg-red-500"
                        : storageUsed.percentUsed > 50
                          ? "bg-amber-500"
                          : "bg-green-500"
                    }`}
                    style={{ width: `${Math.min(storageUsed.percentUsed, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Data</h3>
            <Link
              href="/recovery-guide.html"
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              Recovery Guide
            </Link>
          </div>
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

        {supportsFileSystem && (
          <Card>
            <h3 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-100">Cloud Folder Backup</h3>
            <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
              Save backups to a folder on your device. Pick a synced folder (Google Drive, OneDrive, Dropbox) to auto-backup to the cloud.
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Backup Folder</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {hasFolder ? "Folder selected" : "No folder selected"}
                  </p>
                </div>
                <div className="flex gap-2">
                  {hasFolder && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await clearStoredFolder();
                        setHasFolder(false);
                        setFolderStatus("Folder cleared");
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const handle = await pickBackupFolder();
                      if (handle) {
                        setHasFolder(true);
                        setFolderStatus("Folder selected");
                      }
                    }}
                  >
                    <FolderOpen className="mr-1 h-4 w-4" />
                    {hasFolder ? "Change" : "Select"}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Save Backup Now</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Export to selected folder
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!hasFolder}
                  onClick={async () => {
                    setFolderStatus("Saving...");
                    const result = await saveToFolder();
                    setFolderStatus(
                      result.success
                        ? "Backup saved!"
                        : `Error: ${result.error}`
                    );
                  }}
                >
                  <Download className="mr-1 h-4 w-4" />
                  Save
                </Button>
              </div>

              {folderStatus && (
                <p
                  className={`text-xs ${
                    folderStatus.startsWith("Error")
                      ? "text-red-500"
                      : "text-green-600 dark:text-green-400"
                  }`}
                >
                  {folderStatus}
                </p>
              )}
            </div>
          </Card>
        )}

        <Card>
          <h3 className="mb-2 font-semibold text-zinc-900 dark:text-zinc-100">Auto-Backup Status</h3>
          {backupMeta ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <p className="text-xs text-zinc-600 dark:text-zinc-300">
                  Last backup: {new Date(backupMeta.savedAt).toLocaleString()}
                </p>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {backupMeta.sessionCount} workout{backupMeta.sessionCount !== 1 ? "s" : ""} saved locally
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-2 w-2 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  No backup yet
                </p>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                A backup is automatically created after each completed workout.
              </p>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
