import { describe, test, expect } from 'bun:test';
import {
  validateLegalFormatting,
  snapshotsFromDocument,
  type ParagraphSnapshot,
} from '../legalDocValidation';
import type { ParagraphFormatting, TextFormatting } from '../../types/formatting';

function para(
  index: number,
  ppr?: Partial<ParagraphFormatting>,
  rpr?: Partial<TextFormatting>
): ParagraphSnapshot {
  return { index, ppr: ppr as ParagraphFormatting, rpr: rpr as TextFormatting };
}

describe('validateLegalFormatting', () => {
  test('compliant 公文正文段落 passes (2字符缩进 + 固定28磅 + 小四)', () => {
    const issues = validateLegalFormatting([
      para(
        1,
        { firstLineChars: 200, lineSpacing: 560, lineSpacingRule: 'exact' },
        { fontSize: 24 }
      ),
    ]);
    expect(issues).toEqual([]);
  });

  test('missing first-line indent is flagged with structured actual', () => {
    const issues = validateLegalFormatting([
      para(1, { lineSpacing: 560, lineSpacingRule: 'exact' }, { fontSize: 24 }),
    ]);
    const issue = issues.find((i) => i.rule === 'firstLineIndent');
    expect(issue).toBeDefined();
    expect(issue?.actual).toEqual({ kind: 'missing' });
  });

  test('wrong line spacing (non-exact) is flagged with multiple actual', () => {
    const issues = validateLegalFormatting([
      para(1, { firstLineChars: 200, lineSpacing: 360, lineSpacingRule: 'auto' }, { fontSize: 24 }),
    ]);
    const issue = issues.find((i) => i.rule === 'lineSpacing');
    expect(issue).toBeDefined();
    expect(issue?.actual).toEqual({ kind: 'multiple', value: 1.5 });
  });

  test('wrong font size (not 小四) is flagged with pt actual', () => {
    const issues = validateLegalFormatting([
      para(
        1,
        { firstLineChars: 200, lineSpacing: 560, lineSpacingRule: 'exact' },
        { fontSize: 32 }
      ),
    ]);
    const issue = issues.find((i) => i.rule === 'fontSize');
    expect(issue).toBeDefined();
    expect(issue?.actual).toEqual({ kind: 'pt', value: 16 });
  });

  test('headings and empty paragraphs are skipped', () => {
    const issues = validateLegalFormatting([
      para(1, { styleId: 'Title', indentFirstLine: 0, lineSpacing: 360 }, { fontSize: 32 }),
      para(2, {}),
    ]);
    expect(issues).toEqual([]);
  });

  test('hanging-indent paragraph is not treated as compliant first-line', () => {
    const issues = validateLegalFormatting([
      para(
        1,
        { hangingIndent: true, indentFirstLine: -360, lineSpacing: 560, lineSpacingRule: 'exact' },
        { fontSize: 24 }
      ),
    ]);
    expect(issues.some((i) => i.rule === 'firstLineIndent')).toBe(true);
  });
});

describe('snapshotsFromDocument', () => {
  test('extracts paragraph + first run formatting', () => {
    const doc = {
      package: {
        document: {
          content: [
            {
              type: 'paragraph',
              formatting: { firstLineChars: 200 },
              content: [{ type: 'run', formatting: { fontSize: 24 } }],
            },
            { type: 'table' },
            {
              type: 'paragraph',
              formatting: {},
              content: [{ type: 'run', formatting: { fontSize: 24 } }],
            },
          ],
        },
      },
    };
    const snaps = snapshotsFromDocument(doc as never);
    expect(snaps).toHaveLength(2);
    expect(snaps[0].index).toBe(1);
    expect(snaps[0].ppr?.firstLineChars).toBe(200);
    expect(snaps[0].rpr?.fontSize).toBe(24);
    expect(snaps[1].index).toBe(2);
  });
});
