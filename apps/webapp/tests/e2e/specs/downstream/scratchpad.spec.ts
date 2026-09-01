import { expect, test } from '../../fixtures/auth.fixture';
import { TAG_DOWNSTREAM } from '../../support/tags';

const TASK_TEXT = 'BCM - Template App';
const TASK_CHECKBOX_LABEL = `Task item checkbox for ${TASK_TEXT}`;

test.describe('Scratchpad', { tag: [TAG_DOWNSTREAM] }, () => {
  test('persists a checked task item after refresh', async ({ authenticatedPage: page }) => {
    await page.goto('/app/focused');

    const editor = page.locator('.ProseMirror').first();
    await expect(editor).toBeVisible();

    // Anonymous auth gives each test an isolated scratchpad. If a rerun finds
    // content in this session, clear it through the supported scratchpad UI.
    if ((await editor.textContent())?.trim()) {
      await page.getByRole('button', { name: 'New', exact: true }).click();
      await page.getByRole('button', { name: /Clear Scratchpad/ }).click();
      await expect(editor).toHaveText('');
    }

    await editor.click();
    await editor.evaluate((element) => {
      const clipboardData = new DataTransfer();
      clipboardData.setData('text/plain', '- [ ] BCM - Template App');
      element.dispatchEvent(
        new ClipboardEvent('paste', {
          bubbles: true,
          cancelable: true,
          clipboardData,
        })
      );
    });

    const checkbox = page.getByRole('checkbox', { name: TASK_CHECKBOX_LABEL });
    await expect(checkbox).toBeVisible();
    const taskItem = checkbox.locator('xpath=ancestor::li[1]');

    // Establish the unchecked item as a persisted baseline and reset the
    // in-memory save status before testing the checkbox transaction.
    await expect(checkbox).not.toBeChecked();
    await expect(taskItem).toHaveAttribute('data-checked', 'false');
    await expect(page.getByText('Saved', { exact: true })).toBeVisible();

    await page.reload();
    await expect(editor).toBeVisible();
    const baselineCheckbox = page.getByRole('checkbox', { name: TASK_CHECKBOX_LABEL });
    await expect(baselineCheckbox).not.toBeChecked();
    await expect(baselineCheckbox.locator('xpath=ancestor::li[1]')).toHaveAttribute(
      'data-checked',
      'false'
    );

    const checkboxAfterReload = baselineCheckbox;
    const taskItemAfterReload = checkboxAfterReload.locator('xpath=ancestor::li[1]');
    const taskContentAfterReload = taskItemAfterReload.locator(':scope > div');

    await checkboxAfterReload.check();
    await expect(checkboxAfterReload).toBeChecked();
    await expect(taskItemAfterReload).toHaveAttribute('data-checked', 'true');
    await expect(taskContentAfterReload).toHaveCSS('text-decoration-line', 'line-through');

    await checkboxAfterReload.uncheck();
    await expect(checkboxAfterReload).not.toBeChecked();
    await expect(taskItemAfterReload).toHaveAttribute('data-checked', 'false');
    await expect(taskContentAfterReload).not.toHaveCSS('text-decoration-line', 'line-through');

    await checkboxAfterReload.check();
    await expect(checkboxAfterReload).toBeChecked();
    await expect(taskItemAfterReload).toHaveAttribute('data-checked', 'true');
    await expect(taskContentAfterReload).toHaveCSS('text-decoration-line', 'line-through');

    // The baseline reload reset saveStatus, so this Saved indicator belongs to
    // the final checked state rather than the initial paste.
    await expect(page.getByText('Saved', { exact: true })).toBeVisible();

    await page.reload();
    await expect(editor).toBeVisible();
    const rehydratedCheckbox = page.getByRole('checkbox', { name: TASK_CHECKBOX_LABEL });
    const rehydratedTaskItem = rehydratedCheckbox.locator('xpath=ancestor::li[1]');
    await expect(rehydratedCheckbox).toBeChecked();
    await expect(rehydratedTaskItem).toHaveAttribute('data-checked', 'true');
    await expect(rehydratedTaskItem.locator(':scope > div')).toHaveCSS(
      'text-decoration-line',
      'line-through'
    );
  });
});
