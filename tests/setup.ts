import "fake-indexeddb/auto";
import { vi, beforeEach, afterEach } from "vitest";

// Fix File.text() for jsdom (it doesn't work properly)
if (!File.prototype.text) {
  File.prototype.text = function () {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsText(this);
    });
  };
}

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// Mock navigator for storage APIs
Object.defineProperty(globalThis, "navigator", {
  value: {
    ...globalThis.navigator,
    userAgent: "Mozilla/5.0 (Test Browser)",
    storage: {
      estimate: vi.fn().mockResolvedValue({ usage: 1000, quota: 100000000 }),
      persisted: vi.fn().mockResolvedValue(false),
      persist: vi.fn().mockResolvedValue(true),
    },
  },
  writable: true,
});

// Mock URL for blob operations
globalThis.URL.createObjectURL = vi.fn(() => "blob:test-url");
globalThis.URL.revokeObjectURL = vi.fn();

// Reset mocks and clear data between tests
beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear();
});

// Flag to skip database cleanup for performance tests
// Performance tests manage their own database lifecycle
declare global {
  var __skipDbCleanup: boolean;
}
globalThis.__skipDbCleanup = false;

afterEach(async () => {
  // Skip cleanup if test manages its own database (e.g., performance tests)
  if (globalThis.__skipDbCleanup) {
    return;
  }
  // Clear IndexedDB between tests
  const { db } = await import("@/lib/db");
  await db.delete();
  await db.open();
});
