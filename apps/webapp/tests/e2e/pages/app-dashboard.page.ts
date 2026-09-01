import { expect, type Locator, type Page } from '@playwright/test';

import { BasePage } from './base.page';

export class AppDashboardPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get heading(): Locator {
    // The dashboard no longer renders the old "Welcome to the App" heading.
    // The focus menu is shared by every authenticated dashboard view and is
    // rendered only after the app shell has mounted.
    return this.page.locator('#focus-menu-bar');
  }

  get viewProfileButton(): Locator {
    return this.page.getByRole('link', { name: 'View Profile' });
  }

  override async navigate(path = '/app'): Promise<void> {
    await this.page.goto(path);
    await expect(this.heading).toBeVisible();
  }
}
