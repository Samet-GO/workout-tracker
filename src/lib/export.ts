import {
  db,
  type Exercise,
  type WorkoutTemplate,
  type TemplatePart,
  type TemplateExercise,
  type WorkoutSession,
  type WorkoutSet,
  type UserPreferences,
} from "./db";

// File System Access API types
declare global {
  interface Window {
    showDirectoryPicker?: (options?: {
      mode?: "read" | "readwrite";
      startIn?: "desktop" | "documents" | "downloads" | "music" | "pictures" | "videos";
    }) => Promise<FileSystemDirectoryHandle>;
  }

  interface FileSystemDirectoryHandle {
    requestPermission(options: { mode: "read" | "readwrite" }): Promise<PermissionState>;
    getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
  }

  interface FileSystemFileHandle {
    createWritable(): Promise<FileSystemWritableFileStream>;
  }

  interface FileSystemWritableFileStream extends WritableStream {
    write(data: string | BufferSource | Blob): Promise<void>;
    close(): Promise<void>;
  }
}

export interface ExportData {
  version: 1;
  exportedAt: string;
  exercises: Exercise[];
  workoutTemplates: WorkoutTemplate[];
  templateParts: TemplatePart[];
  templateExercises: TemplateExercise[];
  workoutSessions: WorkoutSession[];
  workoutSets: WorkoutSet[];
  userPreferences: UserPreferences[];
}

export async function exportAllData(): Promise<ExportData> {
  const [
    exercises,
    workoutTemplates,
    templateParts,
    templateExercises,
    workoutSessions,
    workoutSets,
    userPreferences,
  ] = await Promise.all([
    db.exercises.toArray(),
    db.workoutTemplates.toArray(),
    db.templateParts.toArray(),
    db.templateExercises.toArray(),
    db.workoutSessions.toArray(),
    db.workoutSets.toArray(),
    db.userPreferences.toArray(),
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    exercises,
    workoutTemplates,
    templateParts,
    templateExercises,
    workoutSessions,
    workoutSets,
    userPreferences,
  };
}

export function downloadJson(data: ExportData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `workout-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const BACKUP_KEY = "workout-tracker-auto-backup";
const BACKUP_META_KEY = "workout-tracker-backup-meta";
const FOLDER_HANDLE_KEY = "workout-tracker-folder-handle";

// Store folder handle in IndexedDB (localStorage can't store FileSystemHandle)
async function storeFolderHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const dbRequest = indexedDB.open("workout-tracker-handles", 1);

  return new Promise((resolve, reject) => {
    dbRequest.onerror = () => reject(dbRequest.error);
    dbRequest.onupgradeneeded = () => {
      dbRequest.result.createObjectStore("handles");
    };
    dbRequest.onsuccess = () => {
      const db = dbRequest.result;
      const tx = db.transaction("handles", "readwrite");
      tx.objectStore("handles").put(handle, FOLDER_HANDLE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
  });
}

async function getStoredFolderHandle(): Promise<FileSystemDirectoryHandle | null> {
  const dbRequest = indexedDB.open("workout-tracker-handles", 1);

  return new Promise((resolve, reject) => {
    dbRequest.onerror = () => reject(dbRequest.error);
    dbRequest.onupgradeneeded = () => {
      dbRequest.result.createObjectStore("handles");
    };
    dbRequest.onsuccess = () => {
      const db = dbRequest.result;
      const tx = db.transaction("handles", "readonly");
      const request = tx.objectStore("handles").get(FOLDER_HANDLE_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    };
  });
}

export function isFileSystemAccessSupported(): boolean {
  return "showDirectoryPicker" in window;
}

export async function pickBackupFolder(): Promise<FileSystemDirectoryHandle | null> {
  if (!isFileSystemAccessSupported() || !window.showDirectoryPicker) return null;

  try {
    const handle = await window.showDirectoryPicker({
      mode: "readwrite",
      startIn: "documents",
    });
    await storeFolderHandle(handle);
    return handle;
  } catch {
    // User cancelled or error
    return null;
  }
}

export async function saveToFolder(handle?: FileSystemDirectoryHandle | null): Promise<{ success: boolean; error?: string }> {
  try {
    let folderHandle = handle;

    // Try to get stored handle if none provided
    if (!folderHandle) {
      folderHandle = await getStoredFolderHandle();
    }

    // Need to pick a folder
    if (!folderHandle) {
      folderHandle = await pickBackupFolder();
    }

    if (!folderHandle) {
      return { success: false, error: "No folder selected" };
    }

    // Verify we still have permission
    const permission = await folderHandle.requestPermission({ mode: "readwrite" });
    if (permission !== "granted") {
      return { success: false, error: "Permission denied" };
    }

    // Export data
    const data = await exportAllData();
    const json = JSON.stringify(data, null, 2);
    const fileName = `workout-backup-${new Date().toISOString().slice(0, 10)}.json`;

    // Write file
    const fileHandle = await folderHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(json);
    await writable.close();

    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Save failed"
    };
  }
}

export async function hasStoredFolder(): Promise<boolean> {
  const handle = await getStoredFolderHandle();
  return handle !== null;
}

export async function clearStoredFolder(): Promise<void> {
  const dbRequest = indexedDB.open("workout-tracker-handles", 1);

  return new Promise((resolve, reject) => {
    dbRequest.onerror = () => reject(dbRequest.error);
    dbRequest.onsuccess = () => {
      const db = dbRequest.result;
      const tx = db.transaction("handles", "readwrite");
      tx.objectStore("handles").delete(FOLDER_HANDLE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
  });
}

export async function saveBackupLocally(): Promise<void> {
  const data = await exportAllData();
  const json = JSON.stringify(data);

  try {
    localStorage.setItem(BACKUP_KEY, json);
    localStorage.setItem(BACKUP_META_KEY, JSON.stringify({
      savedAt: new Date().toISOString(),
      sessionCount: data.workoutSessions.length,
      setCount: data.workoutSets.length,
    }));
  } catch (e) {
    // localStorage full - try to save anyway by removing old backup first
    console.warn("Auto-backup storage full, attempting cleanup", e);
  }
}

export function getBackupMeta(): { savedAt: string; sessionCount: number; setCount: number } | null {
  const meta = localStorage.getItem(BACKUP_META_KEY);
  return meta ? JSON.parse(meta) : null;
}

export function getLocalBackup(): ExportData | null {
  const data = localStorage.getItem(BACKUP_KEY);
  return data ? JSON.parse(data) : null;
}

export async function restoreFromLocalBackup(): Promise<{ success: boolean; error?: string }> {
  const data = getLocalBackup();
  if (!data) {
    return { success: false, error: "No local backup found" };
  }

  // Use the same import logic
  try {
    await db.transaction(
      "rw",
      [
        db.exercises,
        db.workoutTemplates,
        db.templateParts,
        db.templateExercises,
        db.workoutSessions,
        db.workoutSets,
        db.userPreferences,
      ],
      async () => {
        await Promise.all([
          db.exercises.clear(),
          db.workoutTemplates.clear(),
          db.templateParts.clear(),
          db.templateExercises.clear(),
          db.workoutSessions.clear(),
          db.workoutSets.clear(),
          db.userPreferences.clear(),
        ]);

        await Promise.all([
          db.exercises.bulkAdd(data.exercises),
          db.workoutTemplates.bulkAdd(data.workoutTemplates),
          db.templateParts.bulkAdd(data.templateParts),
          db.templateExercises.bulkAdd(data.templateExercises),
          db.workoutSessions.bulkAdd(data.workoutSessions),
          db.workoutSets.bulkAdd(data.workoutSets),
          db.userPreferences.bulkAdd(data.userPreferences),
        ]);
      }
    );
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Restore failed",
    };
  }
}

export async function importData(
  file: File
): Promise<{ success: boolean; error?: string }> {
  try {
    const text = await file.text();
    const data = JSON.parse(text) as ExportData;

    if (data.version !== 1) {
      return { success: false, error: "Unsupported backup version" };
    }

    // Clear existing data and import
    await db.transaction(
      "rw",
      [
        db.exercises,
        db.workoutTemplates,
        db.templateParts,
        db.templateExercises,
        db.workoutSessions,
        db.workoutSets,
        db.userPreferences,
      ],
      async () => {
        await Promise.all([
          db.exercises.clear(),
          db.workoutTemplates.clear(),
          db.templateParts.clear(),
          db.templateExercises.clear(),
          db.workoutSessions.clear(),
          db.workoutSets.clear(),
          db.userPreferences.clear(),
        ]);

        await Promise.all([
          db.exercises.bulkAdd(data.exercises),
          db.workoutTemplates.bulkAdd(data.workoutTemplates),
          db.templateParts.bulkAdd(data.templateParts),
          db.templateExercises.bulkAdd(data.templateExercises),
          db.workoutSessions.bulkAdd(data.workoutSessions),
          db.workoutSets.bulkAdd(data.workoutSets),
          db.userPreferences.bulkAdd(data.userPreferences),
        ]);
      }
    );

    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Import failed",
    };
  }
}
