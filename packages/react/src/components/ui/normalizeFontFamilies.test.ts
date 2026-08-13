import { describe, expect, test, mock, beforeEach, afterEach } from 'bun:test';
import { normalizeFontFamilies } from './normalizeFontFamilies';
import { EXTENDED_FONTS } from '@eigenpal/docx-editor-core/utils/fontOptions';
import type { FontOption } from './FontPicker';

describe('normalizeFontFamilies', () => {
  test('returns undefined when prop is omitted (FontPicker uses defaults)', () => {
    expect(normalizeFontFamilies(undefined)).toBeUndefined();
  });

  test('returns empty array when prop is an empty array (host opt-out)', () => {
    expect(normalizeFontFamilies([])).toEqual([]);
  });

  test('expands string entries to { name, fontFamily, category: "other" }', () => {
    expect(normalizeFontFamilies(['Arial', 'Roboto'])).toEqual([
      { name: 'Arial', fontFamily: 'Arial', category: 'other' },
      { name: 'Roboto', fontFamily: 'Roboto', category: 'other' },
    ]);
  });

  test('passes FontOption objects through unchanged', () => {
    const fonts: FontOption[] = [
      { name: 'Roboto', fontFamily: 'Roboto, sans-serif', category: 'sans-serif' },
      { name: 'Cambria', fontFamily: 'Cambria, serif', category: 'serif' },
    ];
    expect(normalizeFontFamilies(fonts)).toEqual(fonts);
  });

  test('handles a mixed (string | FontOption)[] union', () => {
    const result = normalizeFontFamilies([
      'Arial',
      { name: 'Roboto', fontFamily: 'Roboto, sans-serif', category: 'sans-serif' },
    ]);
    expect(result).toEqual([
      { name: 'Arial', fontFamily: 'Arial', category: 'other' },
      { name: 'Roboto', fontFamily: 'Roboto, sans-serif', category: 'sans-serif' },
    ]);
  });

  describe('duplicate-name dev warning', () => {
    let originalWarn: typeof console.warn;
    let warnSpy: ReturnType<typeof mock>;

    beforeEach(() => {
      originalWarn = console.warn;
      warnSpy = mock(() => {});
      console.warn = warnSpy;
    });

    afterEach(() => {
      console.warn = originalWarn;
    });

    test('warns on duplicate names from string + FontOption mix', () => {
      normalizeFontFamilies([
        'Arial',
        { name: 'Arial', fontFamily: 'Arial, Helvetica, sans-serif' },
      ]);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      const arg = warnSpy.mock.calls[0][0] as string;
      expect(arg).toContain('Duplicate font name');
      expect(arg).toContain('Arial');
      expect(arg).toContain('[DocxEditor]');
    });

    test('warns once per duplicate name even when it appears 3+ times', () => {
      // Triple-duplicate must produce exactly one warning, not two.
      // Otherwise a typo'd large list spams the console.
      normalizeFontFamilies(['Arial', 'Arial', 'Arial']);
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    test('warns once per distinct duplicate name', () => {
      normalizeFontFamilies(['Arial', 'Arial', 'Roboto', 'Roboto']);
      expect(warnSpy).toHaveBeenCalledTimes(2);
    });

    test('does not warn when names are unique', () => {
      normalizeFontFamilies(['Arial', 'Roboto', 'Cambria']);
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('duplicate-name de-duplication', () => {
    let originalWarn: typeof console.warn;

    beforeEach(() => {
      originalWarn = console.warn;
      console.warn = mock(() => {});
    });

    afterEach(() => {
      console.warn = originalWarn;
    });

    test('drops repeated names so the picker has no duplicate entries', () => {
      const result = normalizeFontFamilies(['Arial', 'Roboto', 'Arial']);
      expect(result).toEqual([
        { name: 'Arial', fontFamily: 'Arial', category: 'other' },
        { name: 'Roboto', fontFamily: 'Roboto', category: 'other' },
      ]);
    });

    test('keeps the first occurrence when a name repeats with different details', () => {
      // First-wins: the earlier entry is the one the caller listed first, so
      // its fallback chain / category is the one that survives.
      const result = normalizeFontFamilies([
        { name: 'Arial', fontFamily: 'Arial, Helvetica, sans-serif', category: 'sans-serif' },
        { name: 'Arial', fontFamily: 'SomethingElse', category: 'serif' },
      ]);
      expect(result).toEqual([
        { name: 'Arial', fontFamily: 'Arial, Helvetica, sans-serif', category: 'sans-serif' },
      ]);
    });

    test('collapses a triple duplicate to a single entry', () => {
      expect(normalizeFontFamilies(['Arial', 'Arial', 'Arial'])).toHaveLength(1);
    });

    test('leaves a already-unique list untouched', () => {
      const fonts = ['Arial', 'Roboto', 'Cambria'];
      expect(normalizeFontFamilies(fonts)).toHaveLength(3);
    });

    test('EXTENDED_FONTS has no duplicate names', () => {
      // The fork's bundled Chinese+Latin list is passed straight to the
      // picker; a duplicate there would silently lose an entry.
      const names = EXTENDED_FONTS.map((f) => f.name);
      expect(new Set(names).size).toBe(names.length);
    });
  });
});
