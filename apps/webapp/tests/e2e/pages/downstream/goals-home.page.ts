import { expect, type Locator, type Page } from '@playwright/test';

import { BasePage } from '../base.page';

/**
 * Page Object Model for the Goals home page ("/").
 */
export class GoalsHomePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /** The main heading text on the home page. */
  get heading(): Locator {
    return this.page.getByRole('heading', { name: /track your goals/i });
  }

  /** The Goals brand in the navigation header. */
  get brandLink(): Locator {
    return this.page.getByRole('link', { name: 'Goals' });
  }

  /** The CTA to the dashboard. */
  get tryDashboardLink(): Locator {
    return this.page.getByRole('link', { name: 'Try Dashboard' });
  }

  /** The documentation link. */
  get documentationLink(): Locator {
    return this.page.getByRole('link', { name: 'Documentation' });
  }

  /** Navigate to the home page and wait for the main content to render. */
  override async navigate(path = '/'): Promise<void> {
    await this.page.goto(path);
    await expect(this.heading).toBeVisible();
  }
}
