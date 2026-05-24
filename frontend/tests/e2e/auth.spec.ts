import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*login/);
  });

  test('should fail login with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'operator@rootrecall.ai');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Check error text displayed
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });

  test('should successfully log in and log out with admin credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@rootrecall.com');
    await page.fill('input[type="password"]', 'securepassword123');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/);

    // Verify presence of SRE dashboard element
    await expect(page.locator('text=SRE Lead')).toBeVisible();

    // Log out
    await page.click('button:has-text("Log Out")');
    await expect(page).toHaveURL(/.*login/);
  });
});
