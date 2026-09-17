/**
 * Chinese legal-font fidelity through the full PM round-trip.
 *
 * Legal templates set the CJK face via <w:rFonts w:eastAsia="仿宋_GB2312"> (body)
 * and 方正小标宋简体 (headings). eastAsia must survive parse → toProseDoc →
 * fromProseDoc → serialize without degrading to the ascii face or being dropped
 * (which would render 公文 body text in a Latin font). The serialized XML must
 * re-emit <w:eastAsia="仿宋_GB2312"/> verbatim.
 */
import { describe, test, expect } from 'bun:test';
import { toProseDoc, fromProseDoc } from '../../prosemirror/conversion';
import { serializeDocument } from '../serializer/documentSerializer';
import type { Document, Run, Paragraph } from '../../types/document';

function run(text: string, extra?: Run['formatting']): Run {
  return {
    type: 'run',
    formatting: extra || {},
    content: [{ type: 'text', text }],
  };
}

function docOf(para: Paragraph): Document {
  return { package: { document: { content: [para] } } };
}

function findRun(doc: Document, needle: string): Run | undefined {
  for (const block of doc.package.document.content ?? []) {
    if (block.type !== 'paragraph') continue;
    for (const child of block.content) {
      if (child.type !== 'run') continue;
      const t = child.content
        .filter((c): c is Extract<typeof c, { type: 'text' }> => c.type === 'text')
        .map((c) => c.text)
        .join('');
      if (t === needle) return child;
    }
  }
  return undefined;
}

describe('eastAsia Chinese font survives the PM round-trip', () => {
  test('仿宋_GB2312 body font is preserved on the rebuilt run', () => {
    const para: Paragraph = {
      type: 'paragraph',
      content: [
        run('正文内容', { fontFamily: { ascii: 'Times New Roman', eastAsia: '仿宋_GB2312' } }),
      ],
    };
    const rebuilt = fromProseDoc(toProseDoc(docOf(para)), docOf(para));
    const r = findRun(rebuilt, '正文内容');
    expect(r?.formatting?.fontFamily?.eastAsia).toBe('仿宋_GB2312');
    expect(r?.formatting?.fontFamily?.ascii).toBe('Times New Roman');
  });

  test('方正小标宋简体 heading font survives', () => {
    const para: Paragraph = {
      type: 'paragraph',
      content: [run('标题', { fontFamily: { ascii: 'Arial', eastAsia: '方正小标宋简体' } })],
    };
    const rebuilt = fromProseDoc(toProseDoc(docOf(para)), docOf(para));
    const r = findRun(rebuilt, '标题');
    expect(r?.formatting?.fontFamily?.eastAsia).toBe('方正小标宋简体');
  });

  test('serialized XML re-emits <w:eastAsia> verbatim', () => {
    const para: Paragraph = {
      type: 'paragraph',
      content: [
        run('正文', {
          fontFamily: {
            ascii: 'Times New Roman',
            eastAsia: '仿宋_GB2312',
            hAnsi: 'Times New Roman',
          },
        }),
      ],
    };
    const xml = serializeDocument(fromProseDoc(toProseDoc(docOf(para)), docOf(para)));
    expect(xml).toContain('w:eastAsia="仿宋_GB2312"');
    expect(xml).toContain('w:ascii="Times New Roman"');
  });

  test('eastAsia without ascii stays intact (CJK-only face)', () => {
    const para: Paragraph = {
      type: 'paragraph',
      content: [run('仿宋正文', { fontFamily: { eastAsia: '仿宋_GB2312' } })],
    };
    const rebuilt = fromProseDoc(toProseDoc(docOf(para)), docOf(para));
    const r = findRun(rebuilt, '仿宋正文');
    expect(r?.formatting?.fontFamily?.eastAsia).toBe('仿宋_GB2312');
    // PM normalizes a missing ascii to null (semantically "not set"); the
    // serializer must skip nulls so no w:ascii="null" leaks into the XML.
    expect(r?.formatting?.fontFamily?.ascii ?? undefined).toBeUndefined();
  });

  test('serializer never leaks w:ascii="null" for a CJK-only face', () => {
    const para: Paragraph = {
      type: 'paragraph',
      content: [run('仿宋正文', { fontFamily: { eastAsia: '仿宋_GB2312' } })],
    };
    const xml = serializeDocument(fromProseDoc(toProseDoc(docOf(para)), docOf(para)));
    expect(xml).toContain('w:eastAsia="仿宋_GB2312"');
    expect(xml).not.toContain('w:ascii="null"');
  });
});
