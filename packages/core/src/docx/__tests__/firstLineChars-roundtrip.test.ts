import { describe, test, expect } from 'bun:test';
import { parseParagraph } from '../paragraphParser';
import { serializeParagraph } from '../serializer/paragraphSerializer';
import { parseXmlDocument } from '../xmlParser';
import type { XmlElement } from '../xmlParser';

function parseParagraphXml(xml: string) {
  const root = parseXmlDocument(xml) as XmlElement | null;
  if (!root) throw new Error('Failed to parse paragraph XML fixture');
  return parseParagraph(root, null, null, null, null, null);
}

/**
 * Round-trip tests for character-based first-line indentation
 * (w:ind/@w:firstLineChars + @w:hangingChars, chars*100).
 *
 * Word/WPS store the Chinese "首行缩进N字符" convention as firstLineChars and
 * PREFER it over w:firstLine when both are present. The parser converts the
 * char semantics to twips (at the default 12pt body size) so the render path
 * is unchanged, and the serializer writes the char attribute back so the
 * semantic survives save instead of degrading to a fixed-twips indent.
 */
describe('firstLineChars round-trip', () => {
  test('parses w:firstLineChars="200" into a 2-char indent at 12pt (480 twips)', () => {
    const xml = `
      <w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:pPr><w:ind w:firstLineChars="200"/></w:pPr>
        <w:r><w:t>原告与被告之间的合同纠纷一案</w:t></w:r>
      </w:p>
    `;
    const p = parseParagraphXml(xml);
    expect(p.formatting?.indentFirstLine).toBe(480);
    expect(p.formatting?.firstLineChars).toBe(200);
    expect(p.formatting?.hangingIndent).toBeFalsy();
  });

  test('firstLineChars takes precedence over w:firstLine when both present', () => {
    const xml = `
      <w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:pPr><w:ind w:firstLine="720" w:firstLineChars="200"/></w:pPr>
        <w:r><w:t>段落</w:t></w:r>
      </w:p>
    `;
    const p = parseParagraphXml(xml);
    // Word ignores w:firstLine when firstLineChars is set; the char semantics win.
    expect(p.formatting?.indentFirstLine).toBe(480);
    expect(p.formatting?.firstLineChars).toBe(200);
  });

  test('falls back to w:firstLine when no char attribute is present', () => {
    const xml = `
      <w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:pPr><w:ind w:firstLine="720"/></w:pPr>
        <w:r><w:t>段落</w:t></w:r>
      </w:p>
    `;
    const p = parseParagraphXml(xml);
    expect(p.formatting?.indentFirstLine).toBe(720);
    expect(p.formatting?.firstLineChars).toBeUndefined();
  });

  test('parses w:hangingChars="200" as a negative 2-char hanging indent', () => {
    const xml = `
      <w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:pPr><w:ind w:hangingChars="200"/></w:pPr>
        <w:r><w:t>编号项目</w:t></w:r>
      </w:p>
    `;
    const p = parseParagraphXml(xml);
    expect(p.formatting?.indentFirstLine).toBe(-480);
    expect(p.formatting?.hangingIndent).toBe(true);
    expect(p.formatting?.hangingChars).toBe(200);
  });

  test('serializer writes w:firstLineChars back alongside w:firstLine', () => {
    const xml = `
      <w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:pPr><w:ind w:firstLineChars="200"/></w:pPr>
        <w:r><w:t>原告与被告之间的合同纠纷一案</w:t></w:r>
      </w:p>
    `;
    const serialized = serializeParagraph(parseParagraphXml(xml));
    expect(serialized).toContain('w:firstLineChars="200"');
    // twips fallback also written so renderers that ignore chars still indent.
    expect(serialized).toContain('w:firstLine="480"');
  });

  test('serializer writes w:hangingChars back alongside w:hanging', () => {
    const xml = `
      <w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:pPr><w:ind w:hangingChars="200"/></w:pPr>
        <w:r><w:t>编号项目</w:t></w:r>
      </w:p>
    `;
    const serialized = serializeParagraph(parseParagraphXml(xml));
    expect(serialized).toContain('w:hangingChars="200"');
    expect(serialized).toContain('w:hanging="480"');
  });

  test('full round-trip preserves the char semantics', () => {
    const xml = `
      <w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:pPr><w:ind w:firstLineChars="200"/></w:pPr>
        <w:r><w:t>正文段落</w:t></w:r>
      </w:p>
    `;
    const p = parseParagraphXml(xml);
    const serialized = serializeParagraph(p);
    const p2 = parseParagraphXml(serialized);
    expect(p2.formatting?.indentFirstLine).toBe(480);
    expect(p2.formatting?.firstLineChars).toBe(200);
  });
});

/**
 * The indent is N characters at the paragraph's OWN font size, so the twips
 * must scale with the run size — a 三号 heading and a 五号 footnote each indent
 * by their own character width, not a fixed 12pt width.
 */
describe('firstLineChars is sized by the paragraph font size', () => {
  function paraWithSize(chars: number, halfPts: number, markSize?: number): string {
    const mark = markSize ? `<w:rPr><w:sz w:val="${markSize}"/></w:rPr>` : '';
    return `
      <w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:pPr><w:ind w:firstLineChars="${chars}"/>${mark}</w:pPr>
        <w:r><w:rPr><w:sz w:val="${halfPts}"/></w:rPr><w:t>文本</w:t></w:r>
      </w:p>
    `;
  }

  test('2 chars at 12pt (小四) = 480 twips', () => {
    expect(parseParagraphXml(paraWithSize(200, 24)).formatting?.indentFirstLine).toBe(480);
  });

  test('2 chars at 16pt (三号) = 640 twips', () => {
    expect(parseParagraphXml(paraWithSize(200, 32)).formatting?.indentFirstLine).toBe(640);
  });

  test('2 chars at 10.5pt (五号) = 420 twips', () => {
    expect(parseParagraphXml(paraWithSize(200, 21)).formatting?.indentFirstLine).toBe(420);
  });

  test('4 chars at 12pt scales linearly to 960 twips', () => {
    expect(parseParagraphXml(paraWithSize(400, 24)).formatting?.indentFirstLine).toBe(960);
  });

  test('paragraph-mark rPr size wins when runs carry no size', () => {
    const xml = `
      <w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:pPr><w:ind w:firstLineChars="200"/><w:rPr><w:sz w:val="32"/></w:rPr></w:pPr>
        <w:r><w:t>文本</w:t></w:r>
      </w:p>
    `;
    expect(parseParagraphXml(xml).formatting?.indentFirstLine).toBe(640);
  });

  test('hangingChars is sized by the run font too', () => {
    const xml = `
      <w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:pPr><w:ind w:hangingChars="200"/></w:pPr>
        <w:r><w:rPr><w:sz w:val="32"/></w:rPr><w:t>列表项</w:t></w:r>
      </w:p>
    `;
    const p = parseParagraphXml(xml);
    expect(p.formatting?.indentFirstLine).toBe(-640);
    expect(p.formatting?.hangingIndent).toBe(true);
  });

  test('falls back to 12pt when no font size is declared anywhere', () => {
    const xml = `
      <w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:pPr><w:ind w:firstLineChars="200"/></w:pPr>
        <w:r><w:t>无字号声明</w:t></w:r>
      </w:p>
    `;
    expect(parseParagraphXml(xml).formatting?.indentFirstLine).toBe(480);
  });
});
