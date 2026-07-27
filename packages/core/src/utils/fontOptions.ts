/**
 * Shared FontOption shape + normaliser used by FontPicker components
 * in both adapters. Lifted from packages/react/src/components/ui/
 * normalizeFontFamilies.ts so the type definition has a single home.
 * @packageDocumentation
 * @public
 */

export interface FontOption {
  name: string;
  fontFamily: string;
  category?: 'sans-serif' | 'serif' | 'monospace' | 'other';
}

export const EXTENDED_FONTS: FontOption[] = [
  { name: 'Arial', fontFamily: 'Arial, Helvetica, sans-serif', category: 'sans-serif' },
  { name: 'Calibri', fontFamily: '"Calibri", Arial, sans-serif', category: 'sans-serif' },
  { name: 'Helvetica', fontFamily: 'Helvetica, Arial, sans-serif', category: 'sans-serif' },
  { name: 'Verdana', fontFamily: 'Verdana, Geneva, sans-serif', category: 'sans-serif' },
  { name: 'Tahoma', fontFamily: 'Tahoma, Arial, sans-serif', category: 'sans-serif' },
  { name: 'Open Sans', fontFamily: '"Open Sans", sans-serif', category: 'sans-serif' },
  { name: 'Roboto', fontFamily: 'Roboto, sans-serif', category: 'sans-serif' },
  { name: 'Segoe UI', fontFamily: '"Segoe UI", Arial, sans-serif', category: 'sans-serif' },
  { name: 'Trebuchet MS', fontFamily: '"Trebuchet MS", Arial, sans-serif', category: 'sans-serif' },
  { name: 'Candara', fontFamily: 'Candara, Arial, sans-serif', category: 'sans-serif' },
  { name: 'Corbel', fontFamily: 'Corbel, Arial, sans-serif', category: 'sans-serif' },
  { name: 'Times New Roman', fontFamily: '"Times New Roman", Times, serif', category: 'serif' },
  { name: 'Georgia', fontFamily: 'Georgia, serif', category: 'serif' },
  { name: 'Cambria', fontFamily: 'Cambria, Georgia, serif', category: 'serif' },
  { name: 'Palatino Linotype', fontFamily: '"Palatino Linotype", Palatino, serif', category: 'serif' },
  { name: 'Constantia', fontFamily: 'Constantia, Georgia, serif', category: 'serif' },
  { name: 'Garamond', fontFamily: 'Garamond, serif', category: 'serif' },
  { name: 'Courier New', fontFamily: '"Courier New", Courier, monospace', category: 'monospace' },
  { name: 'Consolas', fontFamily: 'Consolas, monospace', category: 'monospace' },
  { name: '宋体', fontFamily: 'SimSun, 宋体, serif', category: 'serif' },
  { name: '黑体', fontFamily: 'SimHei, 黑体, sans-serif', category: 'sans-serif' },
  { name: '微软雅黑', fontFamily: '"Microsoft YaHei", 微软雅黑, sans-serif', category: 'sans-serif' },
  { name: '仿宋', fontFamily: 'FangSong, 仿宋, serif', category: 'serif' },
  { name: '楷体', fontFamily: 'KaiTi, 楷体, serif', category: 'serif' },
  { name: '等线', fontFamily: 'DengXian, 等线, sans-serif', category: 'sans-serif' },
  { name: '新宋体', fontFamily: 'NSimSun, 新宋体, serif', category: 'serif' },
  { name: '华文中宋', fontFamily: 'STSong, 华文中宋, serif', category: 'serif' },
  { name: '华文楷体', fontFamily: 'STKaiti, 华文楷体, serif', category: 'serif' },
  { name: '华文行楷', fontFamily: 'STXingkai, 华文行楷, serif', category: 'serif' },
  { name: '华文隶书', fontFamily: 'STLiti, 华文隶书, serif', category: 'serif' },
];

/**
 * Normalize a `fontFamilies` prop (mix of strings and FontOption
 * objects) into a uniform `FontOption[]`. Returns `undefined` for
 * `undefined` input so callers fall back to their built-in defaults.
 * Strings expand into the `'other'` group with no CSS fallback chain.
 */
export function normalizeFontFamilies(
  fontFamilies: ReadonlyArray<string | FontOption> | undefined
): FontOption[] | undefined {
  if (fontFamilies === undefined) return undefined;
  const normalized = fontFamilies.map(
    (f): FontOption => (typeof f === 'string' ? { name: f, fontFamily: f, category: 'other' } : f)
  );
  // De-duplicate by name in every environment: a duplicate name renders as a
  // repeated entry in the font picker and makes selection ambiguous. The dev
  // warning stays so the caller can fix the source list.
  const seen = new Set<string>();
  const deduped: FontOption[] = [];
  const duplicates = new Set<string>();
  for (const f of normalized) {
    if (seen.has(f.name)) {
      duplicates.add(f.name);
      continue;
    }
    seen.add(f.name);
    deduped.push(f);
  }
  if (duplicates.size > 0 && isDev()) {
    for (const name of duplicates) {
      console.warn(`[DocxEditor] Duplicate font name in fontFamilies: "${name}"`);
    }
  }
  return deduped;
}

function isDev(): boolean {
  return typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';
}
