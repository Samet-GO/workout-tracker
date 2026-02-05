import { test, expect } from "@playwright/test";

// Helper to dismiss mood prompt modal using keyboard (Escape key)
// The component has built-in Escape key handling that calls onSkip
async function dismissMoodPromptIfVisible(page: import("@playwright/test").Page) {
  // Short wait for potential modal to appear
  await page.waitForTimeout(500);

  const dialog = page.locator('[role="dialog"]');
  if (await dialog.isVisible().catch(() => false)) {
    // Press Escape to dismiss - component has keydown handler for this
    await page.keyboard.press("Escape");
    // Wait for modal to disappear
    await expect(dialog).not.toBeVisible({ timeout: 3000 });
  }
}

test.describe("Backup and Restore", () => {
  test.beforeEach(async ({ page }) => {
    // Start fresh
    await page.goto("/");
    await page.evaluate(async () => {
      const databases = await indexedDB.databases();
      for (const db of databases) {
        if (db.name) {
          indexedDB.deleteDatabase(db.name);
        }
      }
      localStorage.clear();
      // Mark onboarding as complete to skip welcome screen
      localStorage.setItem("onboarding-complete", "1");
    });
  });

  test("export creates valid backup file", async ({ page }) => {
    // 1. Navigate to settings
    await page.goto("/settings");
    await page.waitForSelector('h1:has-text("Settings")', { timeout: 10000 });

    // 2. Verify export button exists
    const exportButton = page.locator('button:has-text("Export")');
    await expect(exportButton).toBeVisible();

    // 3. Set up download listener and click export
    const downloadPromise = page.waitForEvent("download");
    await exportButton.click();

    // 4. Wait for download
    const download = await downloadPromise;

    // 5. Verify filename format
    expect(download.suggestedFilename()).toMatch(/workout-backup-\d{4}-\d{2}-\d{2}\.json/);

    // 6. Read and verify content
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const content = Buffer.concat(chunks).toString("utf-8");
    const data = JSON.parse(content);

    // Verify backup structure
    expect(data).toHaveProperty("version", 1);
    expect(data).toHaveProperty("exportedAt");
    expect(data).toHaveProperty("exercises");
    expect(data).toHaveProperty("workoutTemplates");
    expect(data).toHaveProperty("workoutSessions");
    expect(data).toHaveProperty("workoutSets");
    expect(data).toHaveProperty("userPreferences");

    // Should have seeded templates
    expect(data.workoutTemplates.length).toBeGreaterThan(0);

    // Should have seeded exercises
    expect(data.exercises.length).toBeGreaterThan(0);
  });

  test("import restores data correctly", async ({ page }) => {
    // 1. First export current data
    await page.goto("/settings");
    await page.waitForSelector('button:has-text("Export")', { timeout: 10000 });

    const downloadPromise = page.waitForEvent("download");
    await page.click('button:has-text("Export")');
    const download = await downloadPromise;

    // Read backup content
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const originalBackup = Buffer.concat(chunks).toString("utf-8");
    const originalData = JSON.parse(originalBackup);

    // 2. Clear database to simulate data loss
    await page.evaluate(async () => {
      const databases = await indexedDB.databases();
      for (const db of databases) {
        if (db.name) {
          indexedDB.deleteDatabase(db.name);
        }
      }
    });

    // 3. Reload page (should re-seed)
    await page.reload();
    await page.waitForSelector('button:has-text("Import")', { timeout: 10000 });

    // 4. Import the backup
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(originalBackup),
    });

    // 5. Verify import success message
    await expect(page.locator("text=/Import successful/i")).toBeVisible({
      timeout: 5000,
    });
  });

  test("complete workflow: workout → export → clear → import → verify", async ({ page }) => {
    // 1. Navigate and wait for data to load
    await page.goto("/plans");
    await page.waitForSelector('[href^="/plans/"]', { timeout: 10000 });

    // 2. Start and complete a workout
    await page.locator('[href^="/plans/"]').first().click();
    await page.waitForURL(/\/plans\/\d+/);
    await page.click('button:has-text("Start Workout")', { force: true });
    await page.waitForURL("/workout");

    // Wait for workout page to fully load
    await page.waitForLoadState("networkidle");

    // Dismiss mood prompt if it appears
    await dismissMoodPromptIfVisible(page);

    // Log a set - find and expand exercise card
    const exerciseCard = page.locator("button").filter({ hasText: /0\/\d/ }).first();
    await expect(exerciseCard).toBeVisible({ timeout: 5000 });
    await exerciseCard.click({ force: true });

    // Click "Log Set" button to reveal weight/reps inputs
    const logSetButton = page.locator('button:has-text("Log Set")').first();
    await expect(logSetButton).toBeVisible({ timeout: 3000 });
    await logSetButton.click({ force: true });

    // Wait for weight/reps inputs to appear and fill them
    const saveSetButton = page.locator('button:has-text("Save Set")');
    await expect(saveSetButton).toBeVisible({ timeout: 5000 });

    const weightInput = page.locator('input[type="number"]').first();
    const repsInput = page.locator('input[type="number"]').nth(1);

    // Clear and fill weight
    await weightInput.clear();
    await weightInput.fill("100");

    // Clear and fill reps
    await repsInput.clear();
    await repsInput.fill("8");

    // Verify button is enabled and click
    await expect(saveSetButton).toBeEnabled({ timeout: 2000 });
    await saveSetButton.click({ force: true });

    // Wait for set to be logged (check for the logged set data)
    await expect(page.locator("text=/100.*kg.*8|Logged.*1.*set/i").first()).toBeVisible({ timeout: 5000 });

    // Dismiss storage warning banner if present
    const dismissWarning = page.locator('button[aria-label="Dismiss warning"]');
    if (await dismissWarning.isVisible().catch(() => false)) {
      await dismissWarning.click();
      await page.waitForTimeout(200);
    }

    // Skip rest timer if present
    const skipRestTimer = page.locator('button:has-text("Skip")');
    if (await skipRestTimer.isVisible().catch(() => false)) {
      await skipRestTimer.click();
      await page.waitForTimeout(200);
    }

    // Complete workout
    const finishButton = page.locator('button:has-text("Finish")');
    await expect(finishButton).toBeVisible({ timeout: 5000 });
    await finishButton.click();
    await page.waitForURL("/workout/complete", { timeout: 5000 });

    // 3. Export data
    await page.goto("/settings");
    await page.waitForSelector('button:has-text("Export")', { timeout: 10000 });

    const downloadPromise = page.waitForEvent("download");
    await page.click('button:has-text("Export")');
    const download = await downloadPromise;

    // Read backup
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const backupContent = Buffer.concat(chunks).toString("utf-8");
    const backupData = JSON.parse(backupContent);

    // Verify backup contains our workout
    expect(backupData.workoutSessions.length).toBe(1);
    expect(backupData.workoutSets.length).toBe(1);
    expect(backupData.workoutSets[0].weight).toBe(100);
    expect(backupData.workoutSets[0].reps).toBe(8);

    // 4. Clear all data (simulate data loss)
    await page.evaluate(async () => {
      const databases = await indexedDB.databases();
      for (const db of databases) {
        if (db.name) {
          indexedDB.deleteDatabase(db.name);
        }
      }
      localStorage.clear();
    });

    // 5. Reload and verify data is gone
    await page.reload();
    await page.waitForSelector('button:has-text("Import")', { timeout: 10000 });

    // 6. Import backup
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(backupContent),
    });

    // Wait for success
    await expect(page.locator("text=/Import successful/i")).toBeVisible({
      timeout: 5000,
    });

    // 7. Reload and verify data restored
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Export again to verify
    await page.waitForSelector('button:has-text("Export")', { timeout: 10000 });

    const verifyDownloadPromise = page.waitForEvent("download");
    await page.click('button:has-text("Export")');
    const verifyDownload = await verifyDownloadPromise;

    const verifyStream = await verifyDownload.createReadStream();
    const verifyChunks: Buffer[] = [];
    for await (const chunk of verifyStream) {
      verifyChunks.push(chunk);
    }
    const restoredContent = Buffer.concat(verifyChunks).toString("utf-8");
    const restoredData = JSON.parse(restoredContent);

    // Verify data matches
    expect(restoredData.workoutSessions.length).toBe(1);
    expect(restoredData.workoutSets.length).toBe(1);
    expect(restoredData.workoutSets[0].weight).toBe(100);
    expect(restoredData.workoutSets[0].reps).toBe(8);
  });

  test("rejects invalid backup file", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForSelector('button:has-text("Import")', { timeout: 10000 });

    // Try to import invalid JSON
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from("not valid json {{{"),
    });

    // Should show error
    await expect(page.locator("text=/Error/i")).toBeVisible({ timeout: 5000 });
  });

  test("rejects backup with wrong version", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForSelector('button:has-text("Import")', { timeout: 10000 });

    // Create backup with unsupported version
    const invalidBackup = JSON.stringify({
      version: 99,
      exportedAt: new Date().toISOString(),
      exercises: [],
      workoutTemplates: [],
      templateParts: [],
      templateExercises: [],
      workoutSessions: [],
      workoutSets: [],
      userPreferences: [],
    });

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(invalidBackup),
    });

    // Should show version error
    await expect(page.locator("text=/Error.*version/i")).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Settings Page", () => {
  test("displays storage information", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForSelector('h1:has-text("Settings")', { timeout: 10000 });

    // Should show storage section
    await expect(page.locator("text=/Storage/i").first()).toBeVisible();
  });

  test("displays preferences toggles", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForSelector('h1:has-text("Settings")', { timeout: 10000 });

    // Verify preference toggles exist
    await expect(page.locator("text=/Rest Timer/i")).toBeVisible();
    await expect(page.locator("text=/RPE Prompt/i")).toBeVisible();
    await expect(page.locator("text=/Mood Prompt/i")).toBeVisible();
  });

  test("can toggle preferences", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForSelector('h1:has-text("Settings")', { timeout: 10000 });

    // Find the rest timer toggle using a more specific selector
    const toggle = page.locator('button[role="switch"]').first();
    await expect(toggle).toBeVisible();

    // Get initial state
    const initialState = await toggle.getAttribute("data-state");

    // Click to toggle
    await toggle.click();

    // Wait for state to update and verify it changed
    await expect(toggle).toHaveAttribute(
      "data-state",
      initialState === "checked" ? "unchecked" : "checked"
    );
  });

  test("shows auto-backup status", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForSelector('h1:has-text("Settings")', { timeout: 10000 });

    // Should show auto-backup section
    await expect(page.locator("text=/Auto-Backup Status/i")).toBeVisible();
  });
});
