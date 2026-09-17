/**
 * Page-number field fidelity. Word footers carry PAGE / NUMPAGES fields
 * (「第 X 页 / 共 Y 页」in 公文 templates) as complex fields or fldSimple.
 * parseFieldType must recognize them and parseFieldInstruction must carry the
 * merge-format switch so the round-trip keeps the numeric glyphs.
 */
import { describe, test, expect } from 'bun:test';
import {
  parseFieldType,
  parseFieldInstruction,
  isKnownFieldType,
  isPageNumberField,
  isTotalPagesField,
} from '../fieldParser';
import type { Field } from '../../types/document';

describe('page-number field parsing', () => {
  test('recognizes PAGE as a known field type', () => {
    expect(parseFieldType(' PAGE ')).toBe('PAGE');
    expect(isKnownFieldType('PAGE')).toBe(true);
  });

  test('recognizes NUMPAGES', () => {
    expect(parseFieldType('NUMPAGES')).toBe('NUMPAGES');
    expect(isKnownFieldType('NUMPAGES')).toBe(true);
  });

  test('recognizes PAGEREF and SECTIONPAGES', () => {
    expect(isKnownFieldType('PAGEREF')).toBe(true);
    expect(isKnownFieldType('SECTIONPAGES')).toBe(true);
  });

  test('parses the MERGEFORMAT switch from a PAGE instruction', () => {
    const inst = parseFieldInstruction(' PAGE \\* MERGEFORMAT ');
    expect(inst.type).toBe('PAGE');
    const merge = inst.switches.find((s) => s.switch === '*');
    expect(merge?.value).toBe('MERGEFORMAT');
  });

  test('unknown instruction stays unrecognized', () => {
    expect(isKnownFieldType('NOTAFIELD')).toBe(false);
  });

  test('isPageNumberField flags PAGE; isTotalPagesField flags NUMPAGES', () => {
    const page: Field = {
      type: 'complexField',
      fieldType: 'PAGE',
      instruction: ' PAGE ',
      fieldCode: [],
      fieldResult: [],
    };
    const num: Field = {
      type: 'simpleField',
      fieldType: 'NUMPAGES',
      instruction: 'NUMPAGES',
      content: [],
    };
    const text: Field = {
      type: 'complexField',
      fieldType: 'DATE',
      instruction: 'DATE',
      fieldCode: [],
      fieldResult: [],
    };
    expect(isPageNumberField(page)).toBe(true);
    expect(isTotalPagesField(num)).toBe(true);
    expect(isPageNumberField(text)).toBe(false);
    expect(isTotalPagesField(text)).toBe(false);
  });
});
