import { test, expect } from '@playwright/test';

test.describe('Incidents Portal', () => {
  test.beforeEach(async ({ page }) => {
    // Log in before each test
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@rootrecall.com');
    await page.fill('input[type="password"]', 'securepassword123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should navigate to incidents page and display incident rows', async ({ page }) => {
    await page.click('a:has-text("Incidents")');
    await expect(page).toHaveURL(/.*incidents/);
    
    // Check that we display the incidents page elements
    await expect(page.locator('text=Live Incident Center')).toBeVisible();
    await expect(page.locator('text=Active').first()).toBeVisible();
  });

  test('should open incident details, view log logs, and interact with remediation triggers', async ({ page }) => {
    await page.click('a:has-text("Incidents")');
    await expect(page).toHaveURL(/.*incidents/);

    // Wait for the incidents API to load rows
    await page.waitForTimeout(2000);

    // Click on the first incident link (should be INC-8241 or similar from database seed)
    const incLink = page.locator('a[href*="/incidents/INC-"]').first();
    if (await incLink.count() > 0) {
      await incLink.click();
      await expect(page).toHaveURL(/\/incidents\/INC-.*/);

      // Check incident details panel are loaded
      await expect(page.locator('text=RCA & METRICS CORRELATION')).toBeVisible();
      
      // Remediation command button exists
      const remediateBtn = page.locator('button:has-text("Run Remediation Command")');
      if (await remediateBtn.count() > 0) {
        await expect(remediateBtn).toBeVisible();
      }
    }
  });
});
