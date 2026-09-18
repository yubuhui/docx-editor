/**
 * Line-break opportunities for text runs.
 *
 * Latin runs only break after space / hyphen / tab (words stay whole), while CJK
 * text breaks between adjacent characters (with basic 中文禁则 handling),
 * matching Word / SuperDoc. Without the CJK opportunities the whole Chinese run
 * was treated as one unbreakable "word": if it did not fit the remaining space
 * it was pushed to the next line wholesale, stranding a preceding number at the
 * end of the line ("...利息 70,951.37" / "元（...").
 */

/**
 * 宽字符（CJK 汉字/假名/谚文/全角及 CJK 标点）——可在其边界断行。
 */
export function isWideChar(codePoint: number): boolean {
  return (
    (codePoint >= 0x1100 && codePoint <= 0x115f) || // Hangul Jamo
    (codePoint >= 0x2e80 && codePoint <= 0x303f) || // CJK 部首/符号/标点
    (codePoint >= 0x3040 && codePoint <= 0x30ff) || // 平/片假名
    (codePoint >= 0x3100 && codePoint <= 0x312f) ||
    (codePoint >= 0x3130 && codePoint <= 0x318f) ||
    (codePoint >= 0x31c0 && codePoint <= 0x31ef) ||
    (codePoint >= 0x3400 && codePoint <= 0x4dbf) || // CJK 扩展 A
    (codePoint >= 0x4e00 && codePoint <= 0x9fff) || // CJK 基本区
    (codePoint >= 0xa960 && codePoint <= 0xa97f) ||
    (codePoint >= 0xac00 && codePoint <= 0xd7af) || // 谚文音节
    (codePoint >= 0xf900 && codePoint <= 0xfaff) || // 兼容汉字
    (codePoint >= 0xfe10 && codePoint <= 0xfe4f) || // 竖排/小型变体标点
    (codePoint >= 0xff00 && codePoint <= 0xff60) || // 全角字符
    (codePoint >= 0xffe0 && codePoint <= 0xffe6) ||
    (codePoint >= 0x20000 && codePoint <= 0x2fa1f) || // 扩展 B 及以后
    (codePoint >= 0x1f200 && codePoint <= 0x1f2ff)
  );
}

/** 行首禁则（避头点）：这些标点不能出现在行首，其前不可断行（中文收尾类标点）。 */
const NO_LINE_START = new Set(
  Array.from('、。，．；：！？）］｝】》」』〉”’％‰℃·ー〜!%),.:;?]}»›')
);

/** 行尾禁则（避尾点）：这些标点不能出现在行尾，其后不可断行（中文起首类标点）。 */
const NO_LINE_END = new Set(Array.from('（［｛【《「『〈“‘([{«‹'));

/**
 * Find word break points in text.
 * Returns array of indices where a break is allowed (word ends at that index,
 * i.e. the next character starts a new line).
 */
export function findWordBreaks(text: string): number[] {
  const breaks: number[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    // 行尾禁则：起首类标点之后不可断行（否则标点会落在行尾）
    if (NO_LINE_END.has(char)) continue;

    // Break after space or certain punctuation
    if (char === ' ' || char === '-' || char === '\t') {
      breaks.push(i + 1);
      continue;
    }

    const next = text[i + 1];
    if (next === undefined) continue;

    // 行首禁则：收尾类标点之前不可断行（否则标点会落在行首）
    if (NO_LINE_START.has(next)) continue;

    // CJK：宽字符与相邻字符之间均可断行
    if (isWideChar(char.codePointAt(0)!) || isWideChar(next.codePointAt(0)!)) {
      breaks.push(i + 1);
    }
  }

  return breaks;
}
