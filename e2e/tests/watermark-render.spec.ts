import { test, expect } from '@playwright/test';
import { EditorPage } from '../helpers/editor-page';

const WATERMARK_FIXTURE = 'fixtures/watermark-confidential.docx';

// Watermarks are parsed, measured and painted by the shared core
// (`renderWatermarkLayer`), so opening a watermark-bearing document must
// surface the behind-content layer.
test.describe('watermark rendering', () => {
  test('renders the behind-content watermark layer', async ({ page }) => {
    const editor = new EditorPage(page);
    await editor.goto();
    await editor.waitForReady();
    await editor.loadDocxFile(WATERMARK_FIXTURE);

    // The watermark layer only exists once a page has painted, so waiting for it
    // doubles as proof the document rendered.
    const layer = page.locator('.layout-watermark-layer').first();
    await expect(layer).toBeVisible({ timeout: 25000 });
    await expect(layer).toContainText('CONFIDENTIAL');
  });
});
