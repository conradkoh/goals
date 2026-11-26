import { expect, test } from '../../fixtures/auth.fixture';
import { TAG_DOWNSTREAM } from '../../support/tags';

const MOD = process.platform === 'darwin' ? 'Meta' : 'Control';

function plainText(text: string | null) {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

test.describe('Scratchpad undo', { tag: [TAG_DOWNSTREAM] }, () => {
  test('undo removes one typed word at a time', async ({ authenticatedPage: page }) => {
    await page.goto('/app/focused');

    const editor = page.locator('.ProseMirror').first();
    await expect(editor).toBeVisible();

    // Anonymous auth gives each test an isolated scratchpad. If a rerun finds
    // content in this session, clear it through the supported scratchpad UI.
    if (plainText(await editor.textContent())) {
      await page.getByRole('button', { name: 'New', exact: true }).click();
      await page.getByRole('button', { name: /Clear Scratchpad/ }).click();
      await expect(editor).toHaveText('');
    }

    await editor.click();
    await page.keyboard.type('alpha bravo charlie', { delay: 60 });
    await page.keyboard.press(`${MOD}+z`);
    await expect.poll(async () => plainText(await editor.textContent())).toBe('alpha bravo');
  });

  test('remote update is not undoable', async ({ authenticatedPage: page }) => {
    await page.goto('/app/focused');

    const editor = page.locator('.ProseMirror').first();
    await expect(editor).toBeVisible();

    if (plainText(await editor.textContent())) {
      await page.getByRole('button', { name: 'New', exact: true }).click();
      await page.getByRole('button', { name: /Clear Scratchpad/ }).click();
      await expect(editor).toHaveText('');
    }

    await editor.click();
    await page.keyboard.type('local draft', { delay: 60 });
    await expect(page.getByText('Saved', { exact: true })).toBeVisible();

    // A second page in the same browser context shares the anonymous session,
    // so its save arrives on page 1 as an external server sync.
    const remotePage = await page.context().newPage();
    try {
      await remotePage.goto('/app/focused');
      const remoteEditor = remotePage.locator('.ProseMirror').first();
      await expect(remoteEditor).toBeVisible();
      await remoteEditor.click();
      await remotePage.keyboard.type(' remote', { delay: 60 });
      await expect(remotePage.getByText('Saved', { exact: true })).toBeVisible();

      const remoteText = plainText(await remoteEditor.textContent());
      expect(remoteText).toBe('local draft remote');
      await expect.poll(async () => plainText(await editor.textContent())).toBe(remoteText);

      await editor.click();
      await page.keyboard.press(`${MOD}+z`);
      // The synced content must stay put; undo must not resurrect pre-sync text.
      await expect.poll(async () => plainText(await editor.textContent())).toBe(remoteText);
    } finally {
      await remotePage.close();
    }
  });
});
