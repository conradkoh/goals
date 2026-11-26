import { expect, test, type Locator, type Page } from '@playwright/test';

import { TAG_UPSTREAM } from '../../support/tags';

// Dev harness at /test/undo-granularity mounts each editor family without auth or Convex.
const MOD = process.platform === 'darwin' ? 'Meta' : 'Control';
const WORDS = ['alpha', 'bravo', 'charlie', 'delta', 'echo'];

const EDITORS = [
  { name: 'RichTextEditor (controlled)', section: 'rte-controlled' },
  { name: 'RichTextEditor (uncontrolled)', section: 'rte-uncontrolled' },
  { name: 'MarkdownEditor', section: 'md-editor' },
] as const;

async function plainText(pm: Locator) {
  return ((await pm.innerText()) ?? '').replace(/\s+/g, ' ').trim();
}

/** Types words separated by spaces. `keyDelay` is ms between keys; `wordPause` is extra ms after each word. */
async function typeWords(page: Page, pm: Locator, keyDelay: number, wordPause: number) {
  await pm.click();
  for (let i = 0; i < WORDS.length; i++) {
    await page.keyboard.type(WORDS[i] + (i < WORDS.length - 1 ? ' ' : ''), { delay: keyDelay });
    if (wordPause) await page.waitForTimeout(wordPause);
  }
}

test.describe('Undo granularity', { tag: [TAG_UPSTREAM] }, () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/undo-granularity');
  });

  for (const ed of EDITORS) {
    test.describe(ed.name, () => {
      const pmOf = (page: Page) => page.getByTestId(ed.section).locator('.ProseMirror');

      test('one undo after continuous typing removes only the last word', async ({ page }) => {
        const pm = pmOf(page);
        await typeWords(page, pm, 60, 0);
        await page.keyboard.press(`${MOD}+z`);
        await expect.poll(() => plainText(pm)).toBe('alpha bravo charlie delta');
      });

      test('repeated undo walks back word by word; redo replays the same group', async ({
        page,
      }) => {
        const pm = pmOf(page);
        await typeWords(page, pm, 60, 0);
        const wordCounts: number[] = [];
        for (let i = 0; i < 3; i++) {
          await page.keyboard.press(`${MOD}+z`);
          wordCounts.push((await plainText(pm)).split(' ').filter(Boolean).length);
        }
        expect(wordCounts).toEqual([4, 3, 2]);
        await page.keyboard.press(`${MOD}+Shift+z`);
        await expect.poll(() => plainText(pm)).toBe('alpha bravo charlie');
      });

      test('control: a pause after each word still undoes one word', async ({ page }) => {
        const pm = pmOf(page);
        await typeWords(page, pm, 30, 800);
        await page.keyboard.press(`${MOD}+z`);
        await expect.poll(() => plainText(pm)).toBe('alpha bravo charlie delta');
      });
    });
  }

  test('controlled: undo right after async document load does not blank the document', async ({
    page,
  }) => {
    const pm = page.getByTestId('rte-async').locator('.ProseMirror');
    await page.getByTestId('rte-async-load').click();
    await expect(pm).toContainText('loaded from server');
    await pm.click();
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press(`${MOD}+z`);
      await expect.poll(() => plainText(pm)).toBe('loaded from server');
    }
  });

  test('Enter inside continuous typing starts a new undo group', async ({ page }) => {
    const pm = page.getByTestId('rte-controlled').locator('.ProseMirror');
    await pm.click();
    await page.keyboard.type('alpha', { delay: 60 });
    await page.keyboard.press('Enter');
    await page.keyboard.type('bravo', { delay: 60 });
    await page.keyboard.press(`${MOD}+z`);
    await expect.poll(() => plainText(pm)).toBe('alpha');
  });

  test('uncontrolled: undo right after external setContent does not restore pre-sync text', async ({
    page,
  }) => {
    const pm = page.getByTestId('rte-uncontrolled').locator('.ProseMirror');
    await pm.click();
    await page.keyboard.type('local draft', { delay: 30 });
    await page.waitForTimeout(800);
    await page.getByTestId('rte-ext-set').click();
    await expect(pm).toContainText('SERVER COPY');
    await page.waitForTimeout(800);
    await pm.click();
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press(`${MOD}+z`);
      await expect.poll(() => plainText(pm)).toBe('SERVER COPY');
    }
  });

  test('bold toggle does not split the word-level undo for typed words', async ({ page }) => {
    const pm = page.getByTestId('rte-controlled').locator('.ProseMirror');
    await pm.click();
    await page.keyboard.type('one two ', { delay: 60 });
    await page.keyboard.press(`${MOD}+b`);
    await page.keyboard.type('three four', { delay: 60 });
    await page.keyboard.press(`${MOD}+z`);
    await expect.poll(() => plainText(pm)).toBe('one two three');
  });
});
