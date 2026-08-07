import { expect, test } from '@playwright/test';

import { GoalsHomePage } from '../../pages/downstream/goals-home.page';
import { TAG_DOWNSTREAM } from '../../support/tags';

test.describe('Goals Home Page', { tag: [TAG_DOWNSTREAM] }, () => {
  test('renders Goals branding and primary navigation', async ({ page }) => {
    const homePage = new GoalsHomePage(page);
    await homePage.navigate();

    const title = await homePage.getTitle();
    expect(title).toBe('Goals');

    await expect(homePage.brandLink).toBeVisible();
    await expect(homePage.brandLink).toHaveText('Goals');

    await expect(homePage.heading).toBeVisible();
    await expect(homePage.tryDashboardLink).toBeVisible();
    await expect(homePage.documentationLink).toBeVisible();
  });
});
