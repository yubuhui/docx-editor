import { describe, test, expect } from 'bun:test';
import { findWordBreaks } from '../lineBreak';

/**
 * 回归：中文长句被整体当成一个 word，放不下就整段挪到下一行，
 * 导致「数字与其后的汉字之间莫名换行」（如 “...利息 70,951.37” / “元（...”）。
 * CJK 必须在字符之间提供断行机会。
 */
describe('CJK line break opportunities', () => {
  test('number and following CJK unit can stay together (break after 元 exists)', () => {
    const text = '利息 70,951.37 元（蒋鑫实际支付）';
    const breaks = findWordBreaks(text);
    const afterYuan = text.indexOf('元') + 1;
    expect(breaks).toContain(afterYuan);
  });

  test('prohibits break before closing punctuation (行首禁则)', () => {
    const text = '返还 7,000 元）；';
    const breaks = findWordBreaks(text);
    // “）” 与 “；” 不能落到行首
    expect(breaks).not.toContain(text.indexOf('）'));
    expect(breaks).not.toContain(text.indexOf('；'));
  });

  test('prohibits break after opening punctuation (行尾禁则)', () => {
    const text = '一年期（年利率 3%）';
    const breaks = findWordBreaks(text);
    // “（” 不能落到行尾
    expect(breaks).not.toContain(text.indexOf('（') + 1);
  });

  test('latin words stay whole between spaces', () => {
    const text = 'hello world foo';
    // breaks only after spaces
    expect(findWordBreaks(text)).toEqual([6, 12]);
  });

  test('breaks between every pair of adjacent CJK chars', () => {
    const text = '判令被告';
    expect(findWordBreaks(text)).toEqual([1, 2, 3]);
  });
});
