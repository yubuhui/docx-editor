/**
 * Visual-line navigation (ArrowUp/ArrowDown with sticky X) driven through the
 * real keyboard path in the paginated editor.
 *
 * The algorithm lives in core
 * (`prosemirror/utils/visualLineNavigation`); the body-scope guarantee has a
 * dedicated unit test. These tests cover the integration: a wrapped paragraph
 * keeps the caret column across its visual lines, ArrowUp retraces it, and
 * ArrowDown carries the column across a paragraph boundary.
 *
 * The column is read back from the ProseMirror selection mapped onto the
 * painted line spans (`data-pm-start`/`data-pm-end`) — not from the painted
 * caret overlay, whose x snaps to the previous line at line-boundary
 * positions.
 */

import { test, expect, type Page } from '@playwright/test';
import { EditorPage } from '../helpers/editor-page';

/** Allowed drift: the target column snaps to the nearest character boundary. */
const COLUMN_TOLERANCE_CHARS = 2;

interface SelectionState {
  pos: number;
  /** Index of the painted visual line holding the caret. */
  lineIndex: number;
  /** Character offset of the caret within its visual line. */
  column: number;
  /** Index of the painted paragraph fragment holding the caret. */
  paragraphIndex: number;
  paragraphTextHead: string;
}

function buildLongParagraph(tag: string, words: number): string {
  return Array.from({ length: words }, (_, i) => `${tag}${i}`).join(' ');
}

async function waitForE2EHooks(page: Page): Promise<void> {
  await page.waitForFunction(() => Boolean(window.__DOCX_EDITOR_E2E__?.getView?.()), undefined, {
    timeout: 10000,
  });
}

async function insertParagraphs(page: Page, texts: string[]): Promise<void> {
  await page.evaluate((paragraphTexts: string[]) => {
    type V = { state: any; dispatch: (tr: unknown) => void };
    const view = (
      window as unknown as { __DOCX_EDITOR_E2E__: { getView: () => V | null } }
    ).__DOCX_EDITOR_E2E__.getView();
    if (!view) throw new Error('editor view unavailable');
    const { schema } = view.state;
    const nodes = paragraphTexts.map((text: string) =>
      schema.nodes.paragraph.create(null, schema.text(text))
    );
    // Replace the boot paragraph so the first painted paragraph is the
    // fixture's first paragraph (no leading empty line).
    view.dispatch(view.state.tr.replaceWith(0, view.state.doc.content.size, nodes));
  }, texts);
  await expect
    .poll(() => page.locator('.layout-page-content .layout-line').count())
    .toBeGreaterThanOrEqual(2);
}

/** Put a collapsed caret at `offsetChars` into the paragraph's first line. */
async function placeCaretAtFirstLine(page: Page, paragraphIndex: number, offsetChars: number) {
  await page.evaluate(
    ({ pIndex, offset }) => {
      type V = { state: any; dispatch: (tr: unknown) => void; focus: () => void };
      const view = (
        window as unknown as { __DOCX_EDITOR_E2E__: { getView: () => V | null } }
      ).__DOCX_EDITOR_E2E__.getView();
      if (!view) throw new Error('editor view unavailable');
      const paragraph = document.querySelectorAll('.layout-page-content .layout-paragraph')[
        pIndex
      ] as HTMLElement | undefined;
      const span = paragraph?.querySelector('span[data-pm-start][data-pm-end]');
      if (!span) throw new Error('painted span unavailable');
      const pos = Number((span as HTMLElement).dataset.pmStart) + offset;
      const TS = view.state.selection.constructor;
      view.dispatch(view.state.tr.setSelection(TS.create(view.state.doc, pos)));
      view.focus();
    },
    { pIndex: paragraphIndex, offset: offsetChars }
  );
  await expect(page.locator('[data-testid="caret"]')).toHaveCount(1);
}

/** Map the body PM selection onto the painted line spans. */
async function selectionState(page: Page): Promise<SelectionState | null> {
  return page.evaluate(() => {
    type V = { state: { selection: { from: number } } };
    const view = (
      window as unknown as { __DOCX_EDITOR_E2E__: { getView: () => V | null } }
    ).__DOCX_EDITOR_E2E__.getView();
    if (!view) return null;
    const pos = view.state.selection.from;
    const container = document.querySelector('.paged-editor__pages');
    if (!container) return null;
    const spans = Array.from(
      container.querySelectorAll<HTMLElement>(
        '.layout-page-content span[data-pm-start][data-pm-end]'
      )
    );
    const contains = (s: HTMLElement, strict: boolean) => {
      const start = Number(s.dataset.pmStart);
      const end = Number(s.dataset.pmEnd);
      return strict ? pos >= start && pos < end : pos === end;
    };
    const span = spans.find((s) => contains(s, true)) ?? spans.find((s) => contains(s, false));
    if (!span) return null;
    const line = span.closest('.layout-line');
    const paragraph = span.closest('.layout-paragraph') as HTMLElement | null;
    const lines = Array.from(container.querySelectorAll('.layout-page-content .layout-line'));
    const paragraphs = Array.from(
      container.querySelectorAll('.layout-page-content .layout-paragraph')
    );
    return {
      pos,
      lineIndex: line ? lines.indexOf(line) : -1,
      column: pos - Number(span.dataset.pmStart),
      paragraphIndex: paragraph ? paragraphs.indexOf(paragraph) : -1,
      paragraphTextHead: (paragraph?.textContent ?? '').slice(0, 8),
    };
  });
}

/** Press ArrowUp/ArrowDown and wait for the selection to settle on another position. */
async function arrowAndSettle(
  page: Page,
  key: 'ArrowDown' | 'ArrowUp',
  previousPos: number
): Promise<SelectionState> {
  await page.keyboard.press(key);
  await expect
    .poll(async () => (await selectionState(page))?.pos ?? previousPos)
    .not.toBe(previousPos);
  const state = await selectionState(page);
  if (!state) throw new Error(`selection unavailable after ${key}`);
  return state;
}

function expectColumnHeld(state: SelectionState, column: number): void {
  expect(Math.abs(state.column - column)).toBeLessThanOrEqual(COLUMN_TOLERANCE_CHARS);
}

test.describe('Visual line navigation', () => {
  test.beforeEach(async ({ page }) => {
    const editor = new EditorPage(page);
    await editor.gotoEmpty();
    await editor.waitForReady();
    await waitForE2EHooks(page);
  });

  test('keeps the caret column across wrapped lines and back on ArrowUp', async ({ page }) => {
    await insertParagraphs(page, [buildLongParagraph('alpha', 60)]);
    await expect
      .poll(() => page.locator('.layout-page-content .layout-line').count())
      .toBeGreaterThanOrEqual(4);

    await placeCaretAtFirstLine(page, 0, 30);
    const start = await selectionState(page);
    expect(start).not.toBeNull();
    expect(start!.lineIndex).toBe(0);

    let current = start!;
    for (let i = 1; i <= 3; i++) {
      current = await arrowAndSettle(page, 'ArrowDown', current.pos);
      expect(current.lineIndex).toBe(i);
      expectColumnHeld(current, start!.column);
    }

    for (let i = 2; i >= 0; i--) {
      current = await arrowAndSettle(page, 'ArrowUp', current.pos);
      expect(current.lineIndex).toBe(i);
      expectColumnHeld(current, start!.column);
    }
  });

  test('carries the caret column across a paragraph boundary', async ({ page }) => {
    await insertParagraphs(page, [
      buildLongParagraph('alpha', 60),
      buildLongParagraph('bravo', 60),
    ]);
    await expect
      .poll(() => page.locator('.layout-page-content .layout-line').count())
      .toBeGreaterThanOrEqual(8);

    await placeCaretAtFirstLine(page, 0, 30);
    const start = await selectionState(page);
    expect(start).not.toBeNull();
    expect(start!.paragraphTextHead).toContain('alpha0');

    let current = start!;
    let crossed = false;
    for (let i = 0; i < 12 && !crossed; i++) {
      current = await arrowAndSettle(page, 'ArrowDown', current.pos);
      expectColumnHeld(current, start!.column);
      crossed = current.paragraphIndex === 1;
    }

    expect(crossed, 'ArrowDown reached the second paragraph').toBe(true);
    expect(current.paragraphTextHead).toContain('bravo0');
    expectColumnHeld(current, start!.column);
  });
});
