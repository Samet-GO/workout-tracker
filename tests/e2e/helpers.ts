import { Page } from "@playwright/test";

/**
 * Wait for the database to be seeded (templates to load)
 */
export async function waitForDataLoad(page: Page) {
  // Wait for plans to load (templates seeded)
  await page.waitForSelector('text="Workout Plans"', { timeout: 10000 });
  // Wait for at least one plan card to appear
  await page.waitForSelector('[href^="/plans/"]', { timeout: 10000 });
}

/**
 * Navigate to plans page and select a specific template
 */
export async function selectTemplate(page: Page, templateIndex: number = 1) {
  await page.goto("/plans");
  await waitForDataLoad(page);

  // Click on the first template (Casual Template I typically)
  const planLinks = page.locator('[href^="/plans/"]');
  await planLinks.nth(templateIndex - 1).click();

  // Wait for template detail page
  await page.waitForURL(/\/plans\/\d+/);
}

/**
 * Start a workout from the template detail page
 */
export async function startWorkout(page: Page, dayIndex: number = 0) {
  // If multiple days, select the day first
  const dayButtons = page.locator('button:has-text("Day")');
  const dayCount = await dayButtons.count();
  if (dayCount > 1 && dayIndex > 0) {
    await dayButtons.nth(dayIndex).click();
  }

  // Click Start Workout button
  await page.click('button:has-text("Start Workout")');

  // Wait for workout page
  await page.waitForURL("/workout");
}

/**
 * Log a set using the manual form
 */
export async function logSetManually(
  page: Page,
  weight: number,
  reps: number
) {
  // Click on "Log Set" or "Edit" button to open manual form
  const logButton = page.locator('button:has-text("Log Set"), button:has-text("Edit")').first();
  await logButton.click();

  // Fill in weight
  const weightInput = page.locator('input[type="number"]').first();
  await weightInput.clear();
  await weightInput.fill(weight.toString());

  // Fill in reps
  const repsInput = page.locator('input[type="number"]').nth(1);
  await repsInput.clear();
  await repsInput.fill(reps.toString());

  // Save the set
  await page.click('button:has-text("Save Set")');
}

/**
 * Click the Match button if available (for returning users)
 */
export async function logSetMatch(page: Page) {
  await page.click('button:has-text("Match")');
}

/**
 * Complete the workout
 */
export async function completeWorkout(page: Page) {
  await page.click('button:has-text("Finish")');

  // Handle mood/energy prompt if it appears
  const moodPrompt = page.locator('text="How are you feeling?"');
  if (await moodPrompt.isVisible({ timeout: 1000 }).catch(() => false)) {
    // Skip mood prompt
    await page.click('button:has-text("Skip")');
  }

  // Wait for completion page
  await page.waitForURL("/workout/complete", { timeout: 5000 });
}

/**
 * Handle the mood/energy prompt at workout start
 */
export async function handleMoodPrompt(page: Page, action: "skip" | "submit" = "skip") {
  const moodPrompt = page.locator('[role="dialog"], [aria-modal="true"]').first();

  if (await moodPrompt.isVisible({ timeout: 2000 }).catch(() => false)) {
    if (action === "skip") {
      await page.click('button:has-text("Skip")');
    } else {
      // Submit with default values
      await page.click('button:has-text("Done")');
    }
  }
}

/**
 * Clear IndexedDB for fresh start
 */
export async function clearDatabase(page: Page) {
  await page.evaluate(async () => {
    const databases = await indexedDB.databases();
    for (const db of databases) {
      if (db.name) {
        indexedDB.deleteDatabase(db.name);
      }
    }
  });
}

/**
 * Get the count of workout sessions from IndexedDB directly
 */
export async function getSessionCount(page: Page): Promise<number> {
  return page.evaluate(async () => {
    return new Promise<number>((resolve, reject) => {
      const request = indexedDB.open("WorkoutTracker");
      request.onerror = () => reject(new Error("Failed to open database"));
      request.onsuccess = () => {
        const db = request.result;
        try {
          const transaction = db.transaction("workoutSessions", "readonly");
          const store = transaction.objectStore("workoutSessions");
          const countRequest = store.count();
          countRequest.onsuccess = () => resolve(countRequest.result);
          countRequest.onerror = () => reject(new Error("Failed to count"));
        } catch {
          // Table might not exist yet
          resolve(0);
        }
      };
    });
  });
}

/**
 * Export data and return as JSON
 */
export async function exportData(page: Page): Promise<string> {
  // Navigate to settings
  await page.goto("/settings");

  // Set up download listener
  const downloadPromise = page.waitForEvent("download");

  // Click export button
  await page.click('button:has-text("Export")');

  const download = await downloadPromise;

  // Read downloaded file content
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

/**
 * Import data from JSON file
 */
export async function importData(page: Page, jsonContent: string) {
  // Navigate to settings
  await page.goto("/settings");

  // Create a temporary file and upload
  const fileInput = page.locator('input[type="file"]');

  // Set the file input value
  await fileInput.setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(jsonContent),
  });

  // Wait for import success message
  await page.waitForSelector('text="Import successful"', { timeout: 5000 });
}
