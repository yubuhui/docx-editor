import { describe, test, expect } from 'bun:test';
import { parseParagraph } from '../paragraphParser';
import { serializeParagraph } from '../serializer/paragraphSerializer';
import { parseXmlDocument } from '../xmlParser';
import type { XmlElement } from '../xmlParser';

function parsePara(xml: string) {
  const root = parseXmlDocument(xml) as XmlElement | null;
  if (!root) throw new Error('xml parse failed');
  return parseParagraph(root, null, null, null, null, null);
}

/**
 * Line-spacing fidelity round-trips. Chinese legal documents use a fixed
 * 28-pt line ("固定值28磅", w:line="560" w:lineRule="exact") and min/auto rules;
 * these must survive open→edit→save without degrading to the default single
 * spacing (which moves page breaks and mis-renders the 公文 layout).
 */
describe('line spacing round-trip', () => {
  test('parses fixed 28pt (560 twips, lineRule=exact)', () => {
    const p =
      parsePara(`<w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:pPr><w:spacing w:line="560" w:lineRule="exact"/></w:pPr>
    </w:p>`);
    expect(p.formatting?.lineSpacing).toBe(560);
    expect(p.formatting?.lineSpacingRule).toBe('exact');
  });

  test('parses min 25pt (500 twips, lineRule=atLeast)', () => {
    const p =
      parsePara(`<w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:pPr><w:spacing w:line="500" w:lineRule="atLeast"/></w:pPr>
    </w:p>`);
    expect(p.formatting?.lineSpacing).toBe(500);
    expect(p.formatting?.lineSpacingRule).toBe('atLeast');
  });

  test('parses auto spacing rule with before/after autospacing flags', () => {
    const p =
      parsePara(`<w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:pPr><w:spacing w:beforeAutospacing="1" w:afterAutospacing="1"/></w:pPr>
    </w:p>`);
    expect(p.formatting?.beforeAutospacing).toBe(true);
    expect(p.formatting?.afterAutospacing).toBe(true);
  });

  test('serializer keeps line + lineRule for exact', () => {
    const s = serializeParagraph(
      parsePara(`<w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:pPr><w:spacing w:line="560" w:lineRule="exact"/></w:pPr>
    </w:p>`)
    );
    expect(s).toContain('w:line="560"');
    expect(s).toContain('w:lineRule="exact"');
  });

  test('serializer keeps autospacing flags', () => {
    const s = serializeParagraph(
      parsePara(`<w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:pPr><w:spacing w:beforeAutospacing="1" w:afterAutospacing="1"/></w:pPr>
    </w:p>`)
    );
    expect(s).toContain('w:beforeAutospacing="1"');
    expect(s).toContain('w:afterAutospacing="1"');
  });

  test('full round-trip preserves fixed 28pt exact spacing', () => {
    const p =
      parsePara(`<w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:pPr><w:spacing w:line="560" w:lineRule="exact"/></w:pPr>
    </w:p>`);
    const s = serializeParagraph(p);
    const p2 = parsePara(s);
    expect(p2.formatting?.lineSpacing).toBe(560);
    expect(p2.formatting?.lineSpacingRule).toBe('exact');
  });

  test('round-trip preserves min 25pt atLeast', () => {
    const p =
      parsePara(`<w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:pPr><w:spacing w:line="500" w:lineRule="atLeast"/></w:pPr>
    </w:p>`);
    const s = serializeParagraph(p);
    const p2 = parsePara(s);
    expect(p2.formatting?.lineSpacing).toBe(500);
    expect(p2.formatting?.lineSpacingRule).toBe('atLeast');
  });
});
