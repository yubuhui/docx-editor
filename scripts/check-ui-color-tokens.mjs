#!/usr/bin/env node
/**
 * Guards the chrome color-token invariant for the React adapter:
 * every UI color in `packages/react/src` must come from a `--doc-*` token
 * defined in packages/core/src/styles/editor.css (the single source of truth),
 * not from a raw hex/rgb()/hsl() literal.
 *
 * What is scanned
 * - packages/react/src/**\/*.{ts,tsx,css}, excluding *.test.* / *.spec.*
 * - `Icons.tsx` is exempt as a whole file: it is SVG path/icon data (graphical
 *   payload, never themed), the same class as document-domain data.
 *
 * What is allowed
 * - `var(--doc-x, #fallback)` fallbacks (the token itself carries the color).
 * - `rgba(var(--doc-scrim-rgb), α)` wrappers that only compose a token with an
 *   alpha value.
 * - Any line carrying a `color-token-ignore: <reason>` comment on the same or
 *   the previous line; a file carrying `color-token-ignore-file: <reason>`
 *   anywhere (used for document-domain/OOXML data and decorative artwork).
 *
 * If this fails, replace the literal with an existing `--doc-*` token — or, for
 * a document-domain value (OOXML default, preset data) with a justified
 * `color-token-ignore` marker. New tokens belong in core editor.css only.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCAN_ROOT = join(repoRoot, 'packages/react/src');

// Graphical payload files, exempt as a whole (SVG data, not chrome).
const EXEMPT_FILES = new Set(['Icons.tsx']);

// #rgb / #rrggbb / #rrggbbaa, rgb(a)(, hsl(a)( — longest hex first so an
// 8-digit value is reported whole instead of truncating to 6.
const COLOR_RE =
  /#[0-9a-fA-F]{8}(?![0-9a-fA-F])|#[0-9a-fA-F]{6}(?![0-9a-fA-F])|#[0-9a-fA-F]{3}(?![0-9a-fA-F])|\b(?:rgb|rgba|hsl|hsla)\(/g;
// A match is a permitted token usage when the text right before it is
// `var(--x,` (fallback) or when the function name wraps a token reference
// (e.g. `rgba(var(--doc-scrim-rgb), 0.35)`).
const VAR_FALLBACK_RE = /var\(\s*--[\w-]+\s*,\s*$/;
const VAR_WRAP_RE = /^var\(\s*--[\w-]+\s*[,)]/;
const IGNORE_MARKER = 'color-token-ignore:';
const IGNORE_FILE_MARKER = 'color-token-ignore-file:';

/** Recursively collect scannable files under `dir`. */
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx|css)$/.test(entry.name)) out.push(full);
  }
  return out;
}

/**
 * Blank out comments while preserving newlines so line numbers stay intact:
 * block comments (`/* *\/`, `<!-- -->`) first, then line comments (`//`) that
 * are not part of a `scheme://` URL.
 */
function stripComments(src) {
  let out = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  out = out.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));
  out = out.replace(/(^|[^:])\/\/[^\n]*/gm, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
  return out;
}

const failures = [];
let scanned = 0;

for (const file of walk(SCAN_ROOT)) {
  const base = file.slice(file.lastIndexOf(sep) + 1);
  if (EXEMPT_FILES.has(base)) continue;
  if (/\.(test|spec)\./.test(base)) continue;
  scanned++;

  const raw = readFileSync(file, 'utf8');
  const rawLines = raw.split(/\r?\n/);
  if (rawLines.some((l) => l.includes(IGNORE_FILE_MARKER))) continue;

  const codeLines = stripComments(raw).split(/\r?\n/);
  for (let i = 0; i < codeLines.length; i++) {
    const line = codeLines[i];
    COLOR_RE.lastIndex = 0;
    let match;
    while ((match = COLOR_RE.exec(line)) !== null) {
      const prefix = line.slice(0, match.index);
      const rest = line.slice(match.index + match[0].length);
      if (VAR_FALLBACK_RE.test(prefix) || VAR_WRAP_RE.test(rest)) continue;
      const lineIgnored =
        rawLines[i].includes(IGNORE_MARKER) || (i > 0 && rawLines[i - 1].includes(IGNORE_MARKER));
      if (lineIgnored) continue;
      failures.push({
        file: relative(repoRoot, file).split(sep).join('/'),
        line: i + 1,
        value: match[0],
      });
    }
  }
}

if (failures.length) {
  console.error('✘ Hardcoded UI colors found (React adapter must use --doc-* tokens):\n');
  for (const { file, line, value } of failures) console.error(`  ${file}:${line}: ${value}`);
  console.error(
    `\n${failures.length} occurrence(s) across ${scanned} scanned file(s).\n` +
      'Use a --doc-* token from packages/core/src/styles/editor.css; add new tokens there.\n' +
      'Document-domain/OOXML values and decorative artwork need a `color-token-ignore: <reason>`\n' +
      '(same or previous line) or `color-token-ignore-file: <reason>` comment.'
  );
  process.exit(1);
}

console.log(`✓ no hardcoded UI colors in packages/react/src (${scanned} files scanned).`);
