/**
 * prefers-reduced-motion coverage for editor motion.
 *
 * Motion keyframes live once in core `packages/core/src/styles/editor.css`;
 * components reference them by name. Under `prefers-reduced-motion: reduce`
 * the CSS block at the end of that file collapses animation/transition
 * playback to an imperceptible instant and the body caret skips its JS blink
 * (stays solid).
 *
 * The demo app mounts the DefaultLoadingIndicator only transiently, so the
 * loading/toast keyframes are probed with injected elements that use the
 * exact inline `animation` strings the components use. A probe with a name
 * that has no matching @keyframes produces no CSSAnimation — so the default
 * media probe also proves the keyframes resolve from the loaded core
 * stylesheet.
 */

import { test, expect, type Page } from '@playwright/test';
import { EditorPage } from '../helpers/editor-page';

const HEADER_FIXTURE = 'e2e/fixtures/header-with-table.docx';

/** Load a header fixture and engage HF edit mode (initial caret is painted). */
async function enterHeaderEdit(page: Page): Promise<void> {
  const editor = new EditorPage(page);
  await editor.goto();
  await editor.waitForReady();

  await page.locator('input[type="file"][accept=".docx"]').setInputFiles(HEADER_FIXTURE);
  await page.waitForSelector('.layout-page-header span[data-pm-start]', { timeout: 15000 });

  await page.locator('.layout-page-header').first().dblclick();
  await expect(page.locator('.hf-inline-editor')).toHaveCount(1);
}

/** Put a collapsed caret in the body via the e2e hook (same as issue-928). */
async function placeBodyCaret(page: Page): Promise<void> {
  await page.evaluate(() => {
    type V = { state: any; dispatch: (tr: unknown) => void; focus: () => void };
    const view = (
      window as unknown as { __DOCX_EDITOR_E2E__: { getView: () => V | null } }
    ).__DOCX_EDITOR_E2E__.getView();
    if (!view) throw new Error('no view');
    let pos = -1;
    view.state.doc.descendants((node: any, p: number) => {
      if (pos >= 0) return false;
      if (node.isText && (node.text?.length ?? 0) > 4) {
        pos = p + 2;
        return false;
      }
      return true;
    });
    if (pos < 0) throw new Error('no text run');
    const TS = view.state.selection.constructor;
    view.dispatch(view.state.tr.setSelection(TS.create(view.state.doc, pos)));
    view.focus();
  });
}

/** Keyframe name + the exact inline animation string a component uses. */
const KEYFRAME_SPECS: Array<[string, string]> = [
  ['docx-spin', 'docx-spin 0.8s linear infinite'],
  ['docx-loading-spin', 'docx-loading-spin 1s linear infinite'],
  ['docx-loading-pulse', 'docx-loading-pulse 1.5s ease-in-out infinite'],
  ['docx-loading-dots', 'docx-loading-dots 1.4s ease-in-out infinite'],
  ['docx-loading-bar', 'docx-loading-bar 2.1s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite'],
  ['docx-pulse', 'docx-pulse 2s ease-in-out infinite'],
  ['docx-slide-in', 'docx-slide-in 0.3s ease-out'],
];

interface MotionProbe {
  name: string;
  runningNames: string[];
  durationSeconds: number;
}

async function measureKeyframeProbes(page: Page): Promise<MotionProbe[]> {
  return page.evaluate((specs: Array<[string, string]>) => {
    const host = document.createElement('div');
    host.id = 'e2e-motion-probes';
    for (const [, animation] of specs) {
      const el = document.createElement('div');
      el.style.animation = animation;
      host.appendChild(el);
    }
    const root = document.querySelector('.ep-root') ?? document.body;
    root.appendChild(host);

    return new Promise<MotionProbe[]>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const probes = Array.from(host.children).map((child, index) => {
            const el = child as HTMLElement;
            const cs = getComputedStyle(el);
            return {
              name: specs[index][0],
              runningNames: el.getAnimations().map((a) => (a as CSSAnimation).animationName),
              durationSeconds: parseFloat(cs.animationDuration),
            };
          });
          host.remove();
          resolve(probes);
        });
      });
    });
  }, KEYFRAME_SPECS);
}

test.describe('prefers-reduced-motion', () => {
  test('HF caret uses the shared core blink class by default', async ({ page }) => {
    await enterHeaderEdit(page);

    const caret = page.locator('.docx-hf-caret');
    await expect(caret).toHaveCount(1);
    const [animationName, duration] = await caret.evaluate((el) => {
      const cs = getComputedStyle(el);
      return [cs.animationName, cs.animationDuration];
    });
    expect(animationName).toBe('hf-caret-blink');
    expect(duration).toBe('1.06s');
  });

  test('HF caret stops blinking under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await enterHeaderEdit(page);

    const caret = page.locator('.docx-hf-caret');
    await expect(caret).toHaveCount(1);
    await expect(caret).toHaveCSS('animation-name', 'none');
  });

  test('body caret stays solid under reduced motion (JS blink skipped)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const editor = new EditorPage(page);
    await editor.goto();
    await editor.waitForReady();
    await placeBodyCaret(page);

    const caret = page.locator('[data-testid="caret"]');
    await expect(caret).toHaveCount(1);

    // Each sample waits well past the default 530ms blink interval: a running
    // blink would have toggled the caret off by now.
    const opacityAfterBlinkWindow = async (): Promise<string> => {
      await page.waitForTimeout(700);
      return caret.evaluate((el) => getComputedStyle(el).opacity);
    };
    expect(await opacityAfterBlinkWindow()).toBe('1');
    expect(await opacityAfterBlinkWindow()).toBe('1');
  });

  test('motion keyframes resolve from core under the default media', async ({ page }) => {
    const editor = new EditorPage(page);
    await editor.goto();
    await editor.waitForReady();

    const probes = await measureKeyframeProbes(page);
    expect(probes).toHaveLength(KEYFRAME_SPECS.length);
    for (const probe of probes) {
      expect(probe.runningNames, probe.name).toEqual([probe.name]);
      expect(probe.durationSeconds, probe.name).toBeGreaterThan(0.1);
    }
  });

  test('reduced motion collapses animation playback', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const editor = new EditorPage(page);
    await editor.goto();
    await editor.waitForReady();

    const probes = await measureKeyframeProbes(page);
    expect(probes).toHaveLength(KEYFRAME_SPECS.length);
    for (const probe of probes) {
      // 0.01ms — collapsed to an imperceptible instant.
      expect(probe.durationSeconds, probe.name).toBeLessThan(0.001);
    }
  });
});
