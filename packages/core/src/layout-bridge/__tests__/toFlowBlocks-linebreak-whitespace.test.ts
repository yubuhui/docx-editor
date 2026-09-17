import { describe, expect, test } from 'bun:test';
import { Schema } from 'prosemirror-model';
import { toFlowBlocks } from '../toFlowBlocks';
import type { ParagraphBlock, TextRun } from '../../layout-engine/types';

const schema = new Schema({
  nodes: {
    doc: { content: 'paragraph+' },
    paragraph: { content: 'inline*', group: 'block' },
    text: { group: 'inline' },
    hardBreak: { inline: true, group: 'inline' },
  },
});

function firstParagraph(blocks: unknown[]): ParagraphBlock {
  return blocks.find((b) => (b as ParagraphBlock).kind === 'paragraph') as ParagraphBlock;
}

function textRuns(para: ParagraphBlock): TextRun[] {
  return para.runs.filter((r): r is TextRun => r.kind === 'text');
}

describe('toFlowBlocks — bare newlines in run text', () => {
  test('collapses CR/LF to spaces (matches Word, no hard break)', () => {
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('甲方违约。\n乙方违约。')]),
    ]);
    const runs = textRuns(firstParagraph(toFlowBlocks(doc, {})));
    expect(runs).toHaveLength(1);
    expect(runs[0].text).toBe('甲方违约。 乙方违约。');
    expect(/[\r\n]/.test(runs[0].text)).toBe(false);
  });

  test('keeps run length (pmStart/pmEnd offset math unchanged)', () => {
    const doc = schema.node('doc', null, [schema.node('paragraph', null, [schema.text('a\nb')])]);
    const runs = textRuns(firstParagraph(toFlowBlocks(doc, {})));
    expect(runs[0].text.length).toBe(3);
    expect(runs[0].pmEnd! - runs[0].pmStart!).toBe(runs[0].text.length); // span == run length, offsets unaffected
  });

  test('a real <w:br/> (hardBreak) still produces a lineBreak run', () => {
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [
        schema.text('a'),
        schema.node('hardBreak'),
        schema.text('b'),
      ]),
    ]);
    const para = firstParagraph(toFlowBlocks(doc, {}));
    expect(para.runs.some((r) => r.kind === 'lineBreak')).toBe(true);
  });
});
