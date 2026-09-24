/**
 * Dialog focus guards.
 *
 * Every dialog panel stops its own mousedown from bubbling. Without the guard,
 * a mousedown inside the panel reaches document-level listeners — the path by
 * which global handlers steal the caret / focus from the hidden ProseMirror —
 * and the editor's selection state is the user-visible casualty.
 *
 * UI-reachable dialogs (Find/Replace, Hyperlink, Watermark, Page Setup) cover
 * the four guard variants; the rest of the dialogs (Insert Table/Symbol/Image,
 * Paste Special, Keyboard Shortcuts, Table/Image/Footnote properties) share the
 * same panel guard pattern but have no stable UI entry point from the demo.
 */

import { test, expect, type Locator, type Page } from '@playwright/test';
import { EditorPage } from '../helpers/editor-page';

const SELECTION_TEXT = 'dialog focus anchor';

interface PmSelectionInfo {
  paraId: string | null;
  selectedText: string;
  before: string;
  after: string;
}

async function readPmSelection(page: Page): Promise<PmSelectionInfo | null> {
  return page.evaluate(() => window.__DOCX_EDITOR_E2E__?.agentSelection() ?? null);
}

/** Boot an empty doc, type a known word and leave it selected in the body PM. */
async function prepareSelection(editor: EditorPage, page: Page): Promise<void> {
  await editor.gotoEmpty();
  await editor.waitForReady();
  await editor.focus();
  await editor.typeText(SELECTION_TEXT);
  // `selectAll` applies a DOM range; PM syncs it into editor state.
  await editor.selectAll();
  await expect
    .poll(async () => (await readPmSelection(page))?.selectedText ?? null)
    .toBe(SELECTION_TEXT);
}

async function expectSelectionIntact(page: Page): Promise<void> {
  await expect
    .poll(async () => (await readPmSelection(page))?.selectedText ?? null)
    .toBe(SELECTION_TEXT);
}

async function isPmFocused(page: Page): Promise<boolean> {
  return page.evaluate(() => !!document.activeElement?.closest('.ProseMirror'));
}

/** Count mousedown events that reach the document (i.e. escape the dialog). */
async function installDocumentMousedownCounter(page: Page): Promise<void> {
  await page.evaluate(() => {
    const host = window as unknown as { __docMousedownCount?: number };
    host.__docMousedownCount = 0;
    document.addEventListener('mousedown', () => {
      host.__docMousedownCount = (host.__docMousedownCount ?? 0) + 1;
    });
  });
}

async function readDocumentMousedownCount(page: Page): Promise<number> {
  return page.evaluate(
    () => (window as unknown as { __docMousedownCount?: number }).__docMousedownCount ?? 0
  );
}

/** Real mousedown/up on a non-interactive spot at the panel's top-left. */
async function mousedownInsidePanel(page: Page, panel: Locator): Promise<void> {
  const box = await panel.boundingBox();
  expect(box, 'dialog panel must be laid out').not.toBeNull();
  await page.mouse.move(box!.x + 16, box!.y + 12);
  await page.mouse.down();
  await page.mouse.up();
}

test.describe('dialog focus guards', () => {
  test('find/replace: panel mousedown keeps the PM selection and stays in the panel', async ({
    page,
  }) => {
    const editor = new EditorPage(page);
    await prepareSelection(editor, page);

    await page.keyboard.press('Control+h');
    const panel = page.locator('[data-testid="find-replace-dialog"]');
    await panel.waitFor();
    // The dialog moves focus into its search input shortly after opening.
    await expect(page.locator('#find-text')).toBeFocused();

    const selectionBefore = await readPmSelection(page);
    await installDocumentMousedownCounter(page);
    await mousedownInsidePanel(page, panel);

    expect(
      await readDocumentMousedownCount(page),
      'mousedown in the find/replace panel must not reach document-level listeners'
    ).toBe(0);
    await expect(panel).toBeVisible();
    expect(await readPmSelection(page)).toEqual(selectionBefore);
    await expectSelectionIntact(page);
  });

  test('hyperlink: panel mousedown keeps the PM selection and stays in the panel', async ({
    page,
  }) => {
    const editor = new EditorPage(page);
    await prepareSelection(editor, page);

    await page.keyboard.press('Control+k');
    const panel = page.locator('.docx-hyperlink-dialog');
    await panel.waitFor();
    await expect(page.locator('#hyperlink-url')).toBeFocused();

    const selectionBefore = await readPmSelection(page);
    await installDocumentMousedownCounter(page);
    await mousedownInsidePanel(page, panel);

    expect(
      await readDocumentMousedownCount(page),
      'mousedown in the hyperlink panel must not reach document-level listeners'
    ).toBe(0);
    await expect(panel).toBeVisible();
    expect(await readPmSelection(page)).toEqual(selectionBefore);
    await expectSelectionIntact(page);
  });

  test('watermark: opening and panel mousedown keep PM focus and selection', async ({ page }) => {
    const editor = new EditorPage(page);
    await prepareSelection(editor, page);

    await page
      .getByTestId('title-bar')
      .getByRole('button', { name: /^Insert$/ })
      .click();
    await page
      .getByTestId('title-bar')
      .getByRole('button', { name: /^Watermark$/ })
      .click();
    const panel = page.getByRole('dialog', { name: 'Watermark' });
    await panel.waitFor();
    expect(await isPmFocused(page), 'watermark dialog must not steal PM focus on open').toBe(true);

    const selectionBefore = await readPmSelection(page);
    await installDocumentMousedownCounter(page);
    await mousedownInsidePanel(page, panel);

    expect(
      await readDocumentMousedownCount(page),
      'mousedown in the watermark panel must not reach document-level listeners'
    ).toBe(0);
    await expect(panel).toBeVisible();
    expect(await readPmSelection(page)).toEqual(selectionBefore);
    await expectSelectionIntact(page);
  });

  test('page setup: opening and panel mousedown keep PM focus and selection', async ({ page }) => {
    const editor = new EditorPage(page);
    await prepareSelection(editor, page);

    await page
      .getByTestId('title-bar')
      .getByRole('button', { name: /^File$/ })
      .click();
    await page
      .getByTestId('title-bar')
      .getByRole('button', { name: /^Page setup$/ })
      .click();
    const panel = page.getByRole('dialog', { name: 'Page Setup' });
    await panel.waitFor();
    expect(await isPmFocused(page), 'page setup dialog must not steal PM focus on open').toBe(true);

    const selectionBefore = await readPmSelection(page);
    await installDocumentMousedownCounter(page);
    await mousedownInsidePanel(page, panel);

    expect(
      await readDocumentMousedownCount(page),
      'mousedown in the page setup panel must not reach document-level listeners'
    ).toBe(0);
    await expect(panel).toBeVisible();
    expect(await readPmSelection(page)).toEqual(selectionBefore);
    await expectSelectionIntact(page);
  });

  test('page setup: clicking the overlay still closes the dialog', async ({ page }) => {
    const editor = new EditorPage(page);
    await prepareSelection(editor, page);

    await page
      .getByTestId('title-bar')
      .getByRole('button', { name: /^File$/ })
      .click();
    await page
      .getByTestId('title-bar')
      .getByRole('button', { name: /^Page setup$/ })
      .click();
    const panel = page.getByRole('dialog', { name: 'Page Setup' });
    await panel.waitFor();

    await page.mouse.click(10, 10);
    await expect(panel).toHaveCount(0);
  });
});
