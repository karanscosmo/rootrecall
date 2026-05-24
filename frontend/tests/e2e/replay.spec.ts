import { test, expect } from '@playwright/test';

test.describe('Incident Replay Player', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@rootrecall.com');
    await page.fill('input[type="password"]', 'securepassword123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should load replay controls, speeds, and topology canvas mapping', async ({ page }) => {
    await page.click('a:has-text("Replay")');
    await expect(page).toHaveURL(/.*replay/);

    // Verify presence of story mode indicator
    await expect(page.locator('text=REPLAY STREAM SYNC')).toBeVisible();

    // Verify presence of dependency map label
    await expect(page.locator('text=Service Topology Map')).toBeVisible();

    // Verify speed controls exist
    await expect(page.locator('button:has-text("1x")')).toBeVisible();
    await expect(page.locator('button:has-text("2x")')).toBeVisible();

    // Narration toggle exists
    await expect(page.locator('button:has-text("Narration")')).toBeVisible();
  });
});
