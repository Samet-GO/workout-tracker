import { test, expect } from "@playwright/test";

test.describe("Plan Edit Page Navigation", () => {
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

  test("settings cog wheel navigates to edit page (not 404)", async ({ page }) => {
    // 1. Navigate to plans page
    await page.goto("/plans");
    await page.waitForURL("/plans", { timeout: 10000 });

    // 2. Wait for templates to load
    await expect(page.locator('[href^="/plans/"]').first()).toBeVisible({
      timeout: 10000,
    });

    // 3. Click on first template to view details
    await page.locator('[href^="/plans/"]').first().click();
    await page.waitForURL(/\/plans\/\d+/);

    // 4. Verify we're on the plan detail page
    await expect(page.locator("h1")).toBeVisible();

    // 5. Find and click the settings (cog wheel) icon
    // The settings link is an <a> tag with href to /plans/[id]/edit containing Settings icon
    const settingsLink = page.locator('a[href$="/edit"]');
    await expect(settingsLink).toBeVisible({ timeout: 5000 });
    await settingsLink.click();

    // 6. Verify navigation to edit page (NOT 404)
    await page.waitForURL(/\/plans\/\d+\/edit/);

    // 7. Verify edit page content loads correctly
    await expect(page.locator('h1:has-text("Edit Template")')).toBeVisible({
      timeout: 5000,
    });

    // 8. Verify the page is not a 404
    await expect(page.locator("text=404")).not.toBeVisible();
    await expect(page.locator("text=not found")).not.toBeVisible();
  });

  test("edit page back button returns to plan detail", async ({ page }) => {
    // Navigate to plans
    await page.goto("/plans");
    await expect(page.locator('[href^="/plans/"]').first()).toBeVisible({
      timeout: 10000,
    });

    // Go to plan detail
    await page.locator('[href^="/plans/"]').first().click();
    await page.waitForURL(/\/plans\/\d+/);

    // Get the current plan ID from URL
    const detailUrl = page.url();
    const planIdMatch = detailUrl.match(/\/plans\/(\d+)/);
    expect(planIdMatch).toBeTruthy();
    const planId = planIdMatch![1];

    // Navigate to edit page
    await page.locator('a[href$="/edit"]').click();
    await page.waitForURL(/\/plans\/\d+\/edit/);

    // Click back button (ArrowLeft icon link)
    const backLink = page.locator(`a[href="/plans/${planId}"]`);
    await expect(backLink).toBeVisible();
    await backLink.click();

    // Verify we're back on the plan detail page
    await page.waitForURL(`/plans/${planId}`);
    await expect(page.locator('button:has-text("Start Workout")')).toBeVisible();
  });

  test("edit page shows part management UI", async ({ page }) => {
    // Navigate to edit page
    await page.goto("/plans");
    await expect(page.locator('[href^="/plans/"]').first()).toBeVisible({
      timeout: 10000,
    });
    await page.locator('[href^="/plans/"]').first().click();
    await page.waitForURL(/\/plans\/\d+/);
    await page.locator('a[href$="/edit"]').click();
    await page.waitForURL(/\/plans\/\d+\/edit/);

    // Verify edit page UI elements
    await expect(page.locator('h1:has-text("Edit Template")')).toBeVisible();

    // Verify "Add Part" button exists
    await expect(page.locator('button:has-text("Add Part")')).toBeVisible();

    // Verify at least one part card exists (from seeded data)
    const partCards = page.locator('[class*="Card"]');
    await expect(partCards.first()).toBeVisible({ timeout: 5000 });
  });

  test("direct navigation to edit URL works", async ({ page }) => {
    // Navigate to plans first to get a valid plan ID
    await page.goto("/plans");
    await expect(page.locator('[href^="/plans/"]').first()).toBeVisible({
      timeout: 10000,
    });

    // Get the href of the first plan
    const firstPlanHref = await page.locator('[href^="/plans/"]').first().getAttribute("href");
    expect(firstPlanHref).toBeTruthy();

    // Navigate directly to the edit URL
    await page.goto(`${firstPlanHref}/edit`);

    // Verify edit page loads correctly (not 404)
    await expect(page.locator('h1:has-text("Edit Template")')).toBeVisible({
      timeout: 5000,
    });
  });
});

test.describe("Route Integrity - All Navigation Links", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("onboarding-complete", "1");
    });
  });

  test("all internal links on plans page are valid", async ({ page }) => {
    await page.goto("/plans");
    await expect(page.locator('[href^="/plans/"]').first()).toBeVisible({
      timeout: 10000,
    });

    // Get all internal links
    const links = page.locator('a[href^="/"]');
    const linkCount = await links.count();

    // Test each link doesn't result in 404
    for (let i = 0; i < Math.min(linkCount, 5); i++) {
      const href = await links.nth(i).getAttribute("href");
      if (href && !href.includes("#")) {
        const response = await page.goto(href);
        expect(response?.status()).not.toBe(404);
        // Go back to plans page
        await page.goto("/plans");
        await page.waitForTimeout(500);
      }
    }
  });

  test("all internal links on plan detail page are valid", async ({ page }) => {
    await page.goto("/plans");
    await expect(page.locator('[href^="/plans/"]').first()).toBeVisible({
      timeout: 10000,
    });

    // Navigate to first plan detail
    await page.locator('[href^="/plans/"]').first().click();
    await page.waitForURL(/\/plans\/\d+/);

    // Get all internal links on detail page
    const links = page.locator('a[href^="/"]');
    const linkCount = await links.count();

    const detailUrl = page.url();

    // Test each link
    for (let i = 0; i < linkCount; i++) {
      const href = await links.nth(i).getAttribute("href");
      if (href && !href.includes("#")) {
        const response = await page.goto(href);
        expect(response?.status(), `Link ${href} should not be 404`).not.toBe(404);
        // Return to detail page
        await page.goto(detailUrl);
        await page.waitForTimeout(300);
      }
    }
  });
});
