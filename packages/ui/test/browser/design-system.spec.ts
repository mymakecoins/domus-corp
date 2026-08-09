import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

for (const theme of ['light', 'dark']) for (const density of ['default', 'compact']) {
  test(`${theme}/${density}: teclado, axe e zoom`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/iframe.html?id=domus-design-system--foundation&globals=theme:${theme};density:${density}`);
    await expect(page.getByRole('heading', { name: 'Design System Domus' })).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
    await expect(page.getByRole('button', { name: 'default' })).toBeVisible();
    await expect(page.locator('.domus-skeleton').first()).toHaveCSS('animation-iteration-count', '1');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
    expect(results.violations).toEqual([]);
    await expect(page.locator('main')).toHaveScreenshot(`${theme}-${density}-zoom-200.png`);
  });
}
