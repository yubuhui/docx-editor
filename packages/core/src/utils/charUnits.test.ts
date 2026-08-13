import { describe, expect, test } from 'bun:test';
import { charsToTwips, twipsToChars, TWIPS_PER_CM, TWIPS_PER_INCH } from './units';

// 24 half-points = 12pt, the default body size in the templates this fork ships.
const TWELVE_PT = 24;

describe('charsToTwips', () => {
  test('eastAsian treats one char as one em (12pt char = 240 twips)', () => {
    // 12pt = 240 twips (12 * 20). A CJK glyph is full-width, so 1 char = 1 em.
    expect(charsToTwips(1, TWELVE_PT, 'eastAsian')).toBe(240);
  });

  test('eastAsian 2-char indent at 12pt is 480 twips', () => {
    // This is the 首行缩进 2 字符 convention used by the legal templates, and
    // the value the indent/outdent buttons must produce.
    expect(charsToTwips(2, TWELVE_PT, 'eastAsian')).toBe(480);
  });

  test('latin treats one char as half an em', () => {
    expect(charsToTwips(1, TWELVE_PT, 'latin')).toBe(120);
    expect(charsToTwips(2, TWELVE_PT, 'latin')).toBe(240);
  });

  test("'auto' resolves to the latin model", () => {
    expect(charsToTwips(2, TWELVE_PT, 'auto')).toBe(charsToTwips(2, TWELVE_PT, 'latin'));
  });

  test('omitting the script arg keeps the pre-change default (latin)', () => {
    // Back-compat guard: adding the third parameter must not move existing
    // callers that pass only two arguments.
    expect(charsToTwips(2, TWELVE_PT)).toBe(charsToTwips(2, TWELVE_PT, 'latin'));
  });

  test('scales linearly with font size', () => {
    expect(charsToTwips(2, 48, 'eastAsian')).toBe(2 * charsToTwips(2, TWELVE_PT, 'eastAsian'));
  });

  test('returns an integer twip count for fractional inputs', () => {
    const result = charsToTwips(1.5, 21, 'eastAsian');
    expect(Number.isInteger(result)).toBe(true);
  });

  test('zero chars is zero twips', () => {
    expect(charsToTwips(0, TWELVE_PT, 'eastAsian')).toBe(0);
  });
});

describe('twipsToChars', () => {
  test('round-trips charsToTwips for eastAsian', () => {
    const twips = charsToTwips(2, TWELVE_PT, 'eastAsian');
    expect(twipsToChars(twips, TWELVE_PT, 'eastAsian')).toBe(2);
  });

  test('round-trips charsToTwips for latin', () => {
    const twips = charsToTwips(3, TWELVE_PT, 'latin');
    expect(twipsToChars(twips, TWELVE_PT, 'latin')).toBe(3);
  });

  test('omitting the script arg keeps the pre-change default (latin)', () => {
    expect(twipsToChars(240, TWELVE_PT)).toBe(twipsToChars(240, TWELVE_PT, 'latin'));
  });

  test('guards against a zero or negative font size', () => {
    // A malformed document can carry sz="0"; this must not divide by zero.
    expect(twipsToChars(480, 0, 'eastAsian')).toBe(0);
    expect(twipsToChars(480, -12, 'eastAsian')).toBe(0);
  });
});

describe('TWIPS_PER_CM', () => {
  test('derives from TWIPS_PER_INCH via 2.54', () => {
    expect(TWIPS_PER_CM).toBeCloseTo(TWIPS_PER_INCH / 2.54, 6);
  });

  test('A4 width (21cm) is ~11906 twips', () => {
    // Word stores A4 as w:w="11906"; the cm page-setup UI must land there.
    expect(Math.round(21 * TWIPS_PER_CM)).toBe(11906);
  });
});
