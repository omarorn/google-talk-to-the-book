import { test, expect } from '@playwright/test';

test.describe('Applet Core Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000');
  });

  test('should load the application and display the header', async ({ page }) => {
    await expect(page.getByText('Bók Lífsins')).toBeVisible();
  });

  test('should open settings modal', async ({ page }) => {
    await page.getByRole('button', { name: 'Stillingar' }).click();
    await expect(page.getByText('API Stillingar')).toBeVisible();
    await expect(page.getByLabel('Gemini API Lykill')).toBeVisible();
    await page.getByRole('button', { name: 'Loka' }).click();
  });

  test('should allow typing in the chat input', async ({ page }) => {
    const input = page.getByPlaceholder('Skrifaðu skilaboð...');
    await input.fill('Hæ, hvernig hefurðu það?');
    await expect(input).toHaveValue('Hæ, hvernig hefurðu það?');
  });

  test('should show error if starting conversation without API key', async ({ page }) => {
    // Ensure API key is empty (it should be by default in a fresh context)
    await page.getByRole('button', { name: 'Stillingar' }).click();
    const apiKeyInput = page.getByLabel('Gemini API Lykill');
    await apiKeyInput.fill('');
    await page.getByRole('button', { name: 'Vista' }).click();

    // Try to start conversation
    await page.getByRole('button', { name: 'Hefja samtal' }).click();

    // Expect an error message
    await expect(page.getByText(/Vinsamlegast sláðu inn Gemini API lykil/i)).toBeVisible();
  });
});
