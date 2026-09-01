import { expect, type Locator, type Page } from '@playwright/test';

import { BasePage } from './base.page';

const DASHBOARD_VIEW_URL = /\/app\/(?:focused|quarterly|weekly|daily)(?:[/?#]|$)/;

export class AppDashboardPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /** Stable shell signal shared by every authenticated dashboard view. */
  get dashboardShell(): Locator {
    return this.page.locator('#focus-menu-bar');
  }

  /** Compatibility alias for existing dashboard smoke tests. */
  get heading(): Locator {
    return this.dashboardShell;
  }

  get viewProfileButton(): Locator {
    return this.page.getByRole('link', { name: 'View Profile' });
  }

  async waitForReady(): Promise<void> {
    await this.page.waitForURL(DASHBOARD_VIEW_URL);
    await expect(this.dashboardShell).toBeVisible();
  }

  override async navigate(path = '/app'): Promise<void> {
    await this.page.goto(path);
    await this.waitForReady();
  }
}
