/**
 * 公文/法律文书格式校验（纯函数）。
 *
 * 输入：已解析的 Document（或段落数组），输出违反项清单。零副作用，双端可测。
 * 校验规则（对应《党政机关公文格式》GB/T 9704-2012 常见要求 + 律所文书惯例）：
 *  - 正文首行缩进 2 字符（w:firstLineChars=200 或等效 twips≈480@12pt）
 *  - 正文行距固定 28 磅（line=560, lineRule=exact）
 *  - 正文小四（12pt=24 half-points）/ 标题三号（16pt=32 half-points）
 * 纯逻辑不联网、不改文档，只读分析；供编辑器「格式校验」入口与单测共用。
 */

import type { ParagraphFormatting, TextFormatting } from '../types/formatting';

/** 校验规则代码（宿主据此本地化标签/文案/期望值）。 */
export type LegalFormatRule = 'firstLineIndent' | 'lineSpacing' | 'fontSize';

/** 实际值的结构：chars=字符数，pt=磅，multiple=行距倍数，missing=未设置。 */
export interface LegalFormatActual {
  kind: 'chars' | 'pt' | 'multiple' | 'missing';
  /** 数值（missing 时省略）；chars=字符数，pt=磅，multiple=倍数。 */
  value?: number;
}

/** 单条违反项（不含展示文案，宿主负责格式化）。 */
export interface LegalFormatIssue {
  /** 段落序号（1-based，用于定位）。 */
  paragraphIndex: number;
  /** 规则代码。 */
  rule: LegalFormatRule;
  /** 校验出的实际值（结构化）。 */
  actual: LegalFormatActual;
}

/** 段落 + 其第一个 run 的格式化快照，供校验读取。 */
export interface ParagraphSnapshot {
  index: number;
  ppr?: ParagraphFormatting;
  rpr?: TextFormatting;
}

/**
 * 判断某段是否为正文（非标题/空段/列表）。简化：没有 pStyle 或 pStyle 不含
 * Title/Heading/TOC 的段视为正文；空文本段跳过。
 */
function isBodyParagraph(p: ParagraphSnapshot): boolean {
  const styleId = p.ppr?.styleId;
  if (styleId && /(title|heading|toc|abstract)/i.test(styleId)) return false;
  // 无文本的段（如分节符/空行）不算正文
  const hasText = p.rpr !== undefined;
  return hasText;
}

/** 首行缩进是否达标：2 字符（firstLineChars=200）或等效 twips（480±20 @12pt）。 */
function firstLineIndentOk(ppr?: ParagraphFormatting): boolean {
  if (!ppr) return false;
  if (ppr.hangingIndent) return false;
  if (ppr.firstLineChars !== undefined) return Math.abs(ppr.firstLineChars - 200) <= 4;
  if (ppr.indentFirstLine !== undefined) return Math.abs(ppr.indentFirstLine - 480) <= 24;
  return false;
}

/** 行距是否达标：固定 28 磅（line=560, lineRule=exact）。 */
function lineSpacingOk(ppr?: ParagraphFormatting): boolean {
  if (!ppr) return false;
  if (ppr.lineSpacingRule !== 'exact') return false;
  return ppr.lineSpacing !== undefined && Math.abs(ppr.lineSpacing - 560) <= 10;
}

/** 字号是否达标：正文小四（24 half-points），标题三号（32 half-points）。 */
function fontSizeOk(halfPoints: number | undefined, expected: number): boolean {
  return halfPoints !== undefined && halfPoints === expected;
}

/**
 * 校验一段正文的格式，返回违反项。
 * 不校验列表/表格内段落（它们的缩进由编号决定）。
 */
function checkBodyParagraph(p: ParagraphSnapshot): LegalFormatIssue[] {
  const issues: LegalFormatIssue[] = [];
  const base = { paragraphIndex: p.index };

  if (!firstLineIndentOk(p.ppr)) {
    issues.push({
      ...base,
      rule: 'firstLineIndent',
      actual:
        p.ppr?.firstLineChars !== undefined
          ? { kind: 'chars', value: p.ppr.firstLineChars / 100 }
          : p.ppr?.indentFirstLine !== undefined
            ? { kind: 'pt', value: Math.round((p.ppr.indentFirstLine / 20) * 10) / 10 }
            : { kind: 'missing' },
    });
  }

  if (!lineSpacingOk(p.ppr)) {
    issues.push({
      ...base,
      rule: 'lineSpacing',
      actual:
        p.ppr?.lineSpacingRule === 'exact' && p.ppr?.lineSpacing !== undefined
          ? { kind: 'pt', value: Math.round(p.ppr.lineSpacing / 20) }
          : p.ppr?.lineSpacing !== undefined
            ? { kind: 'multiple', value: Math.round((p.ppr.lineSpacing / 240) * 10) / 10 }
            : { kind: 'missing' },
    });
  }

  if (p.rpr && !fontSizeOk(p.rpr.fontSize, 24)) {
    issues.push({
      ...base,
      rule: 'fontSize',
      actual:
        p.rpr.fontSize !== undefined
          ? { kind: 'pt', value: p.rpr.fontSize / 2 }
          : { kind: 'missing' },
    });
  }

  return issues;
}

/**
 * 校验整个文档的正文格式。
 * @param paragraphs 已解析的段落列表（来自 Document.package.document.content）。
 * @returns 违反项列表；合规返回 []。
 */
export function validateLegalFormatting(paragraphs: ParagraphSnapshot[]): LegalFormatIssue[] {
  const issues: LegalFormatIssue[] = [];
  for (const p of paragraphs) {
    if (!isBodyParagraph(p)) continue;
    issues.push(...checkBodyParagraph(p));
  }
  return issues;
}

/**
 * 便捷入口：从 Document 提取段落快照。
 * 遍历 body 顶层段落（不深入表格，表格缩进由编号决定）。
 */
export function snapshotsFromDocument(doc: {
  package: {
    document: {
      content?: Array<{
        type: string;
        formatting?: ParagraphFormatting;
        content?: Array<{ type: string; formatting?: TextFormatting }>;
      }>;
    };
  };
}): ParagraphSnapshot[] {
  const out: ParagraphSnapshot[] = [];
  const blocks = doc.package.document.content ?? [];
  for (const block of blocks) {
    if (block.type !== 'paragraph') continue;
    let rpr: TextFormatting | undefined;
    for (const child of block.content ?? []) {
      if (child.type === 'run' && child.formatting) {
        rpr = child.formatting;
        break;
      }
    }
    out.push({ index: out.length + 1, ppr: block.formatting, rpr });
  }
  return out;
}
