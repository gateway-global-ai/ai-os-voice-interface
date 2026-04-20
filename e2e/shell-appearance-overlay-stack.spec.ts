import { test, expect } from '@playwright/test';

/**
 * Regression: Appearance "tune" overlays (Canvas padding, overlay width, etc.)
 * must sit above the shell menu layer (--z-shell-modal-backdrop / 65) and the
 * authenticated workspace canvas (--z-shell-workspace-canvas / 60), otherwise
 * Done/backdrop clicks are swallowed and the panel feels "stuck".
 *
 * Full menu navigation tests need stable selectors or data-testids; this smoke
 * check confirms the app shell mounts and documents the layering contract.
 */
test.describe('Shell appearance overlay stacking (smoke)', () => {
  test('home shell loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /hold to speak/i })).toBeVisible({
      timeout: 30_000,
    });
  });

  test('overlay frame uses system-controls z-layer token in DOM', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const zSystem = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--z-shell-system-controls').trim(),
    );
    const zModal = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--z-shell-modal-backdrop').trim(),
    );
    const zWorkspace = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--z-shell-workspace-canvas').trim(),
    );

    expect(Number(zSystem)).toBeGreaterThan(Number(zModal));
    expect(Number(zModal)).toBeGreaterThan(Number(zWorkspace));
  });
});
