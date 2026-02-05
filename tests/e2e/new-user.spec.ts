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

test.describe("New User Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing data for fresh start
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

  test("new user completes first workout", async ({ page }) => {
    // 1. Navigate to plans page
    await page.goto("/plans");
    await page.waitForURL("/plans", { timeout: 10000 });

    // 2. Verify plans page loads with templates
    await expect(page.locator("h1")).toContainText("Workout Plans");

    // Wait for templates to load (database seeding)
    await expect(page.locator('[href^="/plans/"]').first()).toBeVisible({
      timeout: 10000,
    });

    // Count available templates
    const templateCount = await page.locator('[href^="/plans/"]').count();
    expect(templateCount).toBeGreaterThan(0);

    // 3. Select the first template
    await page.locator('[href^="/plans/"]').first().click();

    // Wait for template detail page
    await page.waitForURL(/\/plans\/\d+/);

    // Verify template loaded
    await expect(page.locator("h1")).toBeVisible();

    // 4. Start workout
    const startButton = page.locator('button:has-text("Start Workout")');
    await expect(startButton).toBeVisible();
    await startButton.click({ force: true });

    // Wait for workout page
    await page.waitForURL("/workout");

    // Wait for workout page to fully load
    await page.waitForLoadState("networkidle");

    // 5. Dismiss mood prompt if it appears
    await dismissMoodPromptIfVisible(page);

    // 6. Find and expand first exercise card
    const exerciseCard = page.locator("button").filter({ hasText: /0\/\d/ }).first();
    await expect(exerciseCard).toBeVisible({ timeout: 5000 });
    await exerciseCard.click({ force: true });

    // 7. Click "Log Set" button to reveal weight/reps inputs
    const logSetButton = page.locator('button:has-text("Log Set")').first();
    await expect(logSetButton).toBeVisible({ timeout: 3000 });
    await logSetButton.click({ force: true });

    // 8. Wait for weight/reps inputs to appear and fill them
    // Target inputs near the "Save Set" button for specificity
    const saveSetButton = page.locator('button:has-text("Save Set")');
    await expect(saveSetButton).toBeVisible({ timeout: 5000 });

    // Get the parent container and find inputs within it
    const weightInput = page.locator('input[type="number"]').first();
    const repsInput = page.locator('input[type="number"]').nth(1);

    // Clear and fill weight
    await weightInput.clear();
    await weightInput.fill("50");

    // Clear and fill reps
    await repsInput.clear();
    await repsInput.fill("10");

    // Verify button is enabled (not disabled)
    await expect(saveSetButton).toBeEnabled({ timeout: 2000 });

    // Save the set
    await saveSetButton.click({ force: true });

    // 9. Verify set was logged (check for the logged set data)
    await expect(page.locator("text=/50.*kg.*10|Logged.*1.*set/i").first()).toBeVisible({
      timeout: 5000,
    });

    // 10. Dismiss storage warning banner if present (it blocks the Finish button)
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

    // Complete the workout
    const finishButton = page.locator('button:has-text("Finish")');
    await expect(finishButton).toBeVisible({ timeout: 5000 });
    await finishButton.click();

    // Wait for completion page
    await page.waitForURL("/workout/complete", { timeout: 5000 });

    // 11. Verify completion page
    await expect(page.locator("h1:has-text('Workout Complete')")).toBeVisible();

    // Verify navigation options
    await expect(page.locator('a[href="/plans"]').first()).toBeVisible();
  });

  test("displays workout templates correctly", async ({ page }) => {
    await page.goto("/plans");

    // Wait for data to load
    await expect(page.locator('[href^="/plans/"]').first()).toBeVisible({
      timeout: 10000,
    });

    // Verify template cards show relevant info
    const firstTemplate = page.locator('[href^="/plans/"]').first();
    await expect(firstTemplate).toBeVisible();

    // Click to view details
    await firstTemplate.click();
    await page.waitForURL(/\/plans\/\d+/);

    // Verify template detail shows exercises
    await expect(page.locator('button:has-text("Start Workout")')).toBeVisible();
  });

  test("exercise card expands and shows set logger", async ({ page }) => {
    // Navigate to template and start workout
    await page.goto("/plans");
    await page.waitForSelector('[href^="/plans/"]', { timeout: 10000 });

    await page.locator('[href^="/plans/"]').first().click();
    await page.waitForURL(/\/plans\/\d+/);
    await page.click('button:has-text("Start Workout")', { force: true });
    await page.waitForURL("/workout");

    // Wait for page to settle
    await page.waitForLoadState("networkidle");

    // Dismiss mood prompt if it appears
    await dismissMoodPromptIfVisible(page);

    // Find an exercise card with 0/X counter
    const exerciseCard = page.locator("button").filter({ hasText: /0\/\d/ }).first();
    await expect(exerciseCard).toBeVisible({ timeout: 5000 });

    // Click to expand
    await exerciseCard.click({ force: true });

    // Verify set logger appears (use first() since multiple exercises may have Log Set buttons)
    await expect(
      page.locator('button:has-text("Log Set")').first()
    ).toBeVisible({ timeout: 3000 });
  });

  test("can cancel workout", async ({ page }) => {
    // Navigate to plans
    await page.goto("/plans");
    await page.waitForSelector('[href^="/plans/"]', { timeout: 10000 });

    // Start a workout
    await page.locator('[href^="/plans/"]').first().click();
    await page.waitForURL(/\/plans\/\d+/);
    await page.click('button:has-text("Start Workout")', { force: true });
    await page.waitForURL("/workout");

    // Wait for page to settle
    await page.waitForLoadState("networkidle");

    // Dismiss mood prompt if it appears
    await dismissMoodPromptIfVisible(page);

    // Dismiss storage warning banner if present (it blocks the Cancel button)
    const dismissWarning = page.locator('button[aria-label="Dismiss warning"]');
    if (await dismissWarning.isVisible().catch(() => false)) {
      await dismissWarning.click();
      await page.waitForTimeout(200);
    }

    // Wait for the Cancel button to be ready and click it
    const cancelButton = page.locator('button:has-text("Cancel")');
    await expect(cancelButton).toBeVisible({ timeout: 5000 });
    await cancelButton.click();

    // Should redirect to plans
    await page.waitForURL("/plans", { timeout: 10000 });
  });
});

test.describe("Workout Page - No Active Session", () => {
  test.beforeEach(async ({ page }) => {
    // Setup: clear data and mark onboarding complete
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("onboarding-complete", "1");
    });
  });

  test("shows no active workout message", async ({ page }) => {
    // Navigate directly to workout page without starting one
    await page.goto("/workout");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Should show no active workout message
    await expect(page.locator("text=/No Active Workout/i")).toBeVisible({
      timeout: 5000,
    });

    // Should have link to browse plans (use first() since there may be multiple)
    await expect(page.locator('a[href="/plans"]').first()).toBeVisible();
  });
});
