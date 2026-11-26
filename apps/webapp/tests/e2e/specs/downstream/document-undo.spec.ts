import { expect, test } from '../../fixtures/auth.fixture';
import { TAG_DOWNSTREAM } from '../../support/tags';

const MOD = process.platform === 'darwin' ? 'Meta' : 'Control';

function plainText(text: string | null) {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

test.describe('Document undo', { tag: [TAG_DOWNSTREAM] }, () => {
  test('undo after a reload does not blank the loaded document', async ({
    authenticatedPage: page,
  }) => {
    // Create the document through the public UI so the test exercises the same
    // load path a user takes: list page → "New Document" → editor redirect.
    await page.goto('/app/documents');
    await page.getByRole('button', { name: 'New Document' }).click();

    const editor = page.locator('.ProseMirror').first();
    await expect(editor).toBeVisible();
    await expect(page).toHaveURL(/\/app\/documents\/(?!new$)[^/]+$/);

    await editor.click();
    await page.keyboard.type('alpha bravo charlie', { delay: 60 });
    await expect(page.getByText('Saved', { exact: true })).toBeVisible();

    // The reload re-feeds the saved content into the controlled editor value,
    // which must land outside undo history.
    await page.reload();
    await expect(editor).toContainText('alpha bravo charlie');

    await editor.click();
    await page.keyboard.press(`${MOD}+z`);
    await expect
      .poll(async () => plainText(await editor.textContent()))
      .toBe('alpha bravo charlie');
  });
});
