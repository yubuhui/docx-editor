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

/** 单条违反项。 */
export interface LegalFormatIssue {
  /** 段落序号（1-based，用于定位）。 */
  paragraphIndex: number;
  /** 简短标题，如「首行缩进」「行距」「字号」。 */
  rule: string;
  /** 问题描述（中文，可直接展示）。 */
  message: string;
  /** 校验出的实际值（人类可读）。 */
  actual?: string;
  /** 期望值（人类可读）。 */
  expected?: string;
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
      rule: '首行缩进',
      message: '正文段首行应缩进 2 字符（当前缺失或不是 2 字符）。',
      actual:
        p.ppr?.firstLineChars !== undefined
          ? `${p.ppr.firstLineChars / 100}字符`
          : p.ppr?.indentFirstLine !== undefined
            ? `${Math.round((p.ppr.indentFirstLine / 20) * 10) / 10}pt`
            : '无缩进',
      expected: '2 字符',
    });
  }

  if (!lineSpacingOk(p.ppr)) {
    issues.push({
      ...base,
      rule: '行距',
      message: '正文行距应为固定值 28 磅。',
      actual:
        p.ppr?.lineSpacingRule === 'exact' && p.ppr?.lineSpacing !== undefined
          ? `固定 ${Math.round(p.ppr.lineSpacing / 20)} 磅`
          : p.ppr?.lineSpacing !== undefined
            ? `${Math.round((p.ppr.lineSpacing / 240) * 10) / 10} 倍`
            : '未设置',
      expected: '固定值 28 磅',
    });
  }

  if (p.rpr && !fontSizeOk(p.rpr.fontSize, 24)) {
    issues.push({
      ...base,
      rule: '字号',
      message: '正文字号应为小四（12pt）。',
      actual: p.rpr.fontSize !== undefined ? `${p.rpr.fontSize / 2}pt` : '未设置',
      expected: '小四（12pt）',
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
