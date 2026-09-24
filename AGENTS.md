# Eigenpal DOCX Editor（React-only fork）

Bun + React WYSIWYG editor for DOCX. Client-side only, no backend.
Per-package entries: `packages/react/src/index.ts`, `packages/core/src/headless.ts`, `packages/agents/src/index.ts`, `packages/i18n/src/index.ts`.
Output must look identical to MS Word. Preserve fonts, theme colors, styles, tables, headers/footers, section layout.

本仓库是律师助手主仓库内嵌编辑器的 fork 自维护线（基于上游 1.9.0）：构建链、双仓提交与自维护红线见 `SELF-MAINTENANCE.md`。**Vue/Nuxt 架构已移除**；唯一保留的 Vue 代码是 `packages/agents/src/vue/**`（agents 包 Vue UI，仍参与构建/类型检查/lint）。

---

## Verify

```bash
bun run typecheck && bunx playwright test --grep "<pattern>" --timeout=30000 --workers=4
```

- Never run full suite (~460 tests) unless final validation.
- Per-test timeout 30s; if cmd >60s, narrow scope. 慢机器上打字类用例（如 `text-editing.spec.ts` 的 “very long text input”）需要更大超时：`--timeout=60000 --workers=1`。
- `bun run format` before pushing.
- **一律用 `bunx playwright`，不要 `npx playwright`**：npx 会向上逃逸到父项目 `lawyer_assistant/node_modules/playwright`（另一版本），造成双实例报错 `Playwright Test did not expect test.describe() to be called here`。
- 首次安装浏览器：`bunx playwright install --only-shell chromium`；慢网络可先设 `PLAYWRIGHT_DOWNLOAD_HOST=https://cdn.npmmirror.com/binaries/playwright` 再执行。

### Test file map

| Area                  | File                                                    |
| --------------------- | ------------------------------------------------------- |
| Bold/Italic/Underline | `formatting.spec.ts`                                    |
| Alignment             | `alignment.spec.ts`                                     |
| Lists                 | `lists.spec.ts`                                         |
| Colors                | `colors.spec.ts`                                        |
| Fonts                 | `fonts.spec.ts`                                         |
| Enter/Paragraphs      | `text-editing.spec.ts`                                  |
| Undo/Redo             | `scenario-driven.spec.ts`                               |
| Line spacing          | `line-spacing.spec.ts`                                  |
| Paragraph styles      | `paragraph-styles.spec.ts`                              |
| Toolbar state         | `toolbar-state.spec.ts`                                 |
| Cursor-only ops       | `cursor-paragraph-ops.spec.ts`                          |
| Comments sidebar      | `comments-sidebar.spec.ts`                              |
| Footnotes             | `footnote-bottom-overflow.spec.ts`                      |
| Watermarks            | `watermark-render.spec.ts`, `watermark-presets.spec.ts` |

Run `comments-sidebar.spec.ts` when touching any of these (all under `packages/react/src/`): `components/UnifiedSidebar.tsx`, `components/sidebar/**`, `hooks/useCommentSidebarItems.tsx`, `components/DocxEditor/hooks/useSelectionOverlay.ts` (`updateSelectionOverlay`/`onSelectionChange`), `components/DocxEditor.tsx` (`onSelectionChange` handler, `expandedSidebarItem` state).

Empty-doc specs (`formatting`, `text-editing`) use `editor.gotoEmpty()`. Demo-asserting specs use `editor.goto()`. Don't mix in one spec.

---

## React-only boundary

- 已删除：`packages/{vue,nuxt}`、`examples/{vue,nuxt,parity}`、`e2e/tests/{vue,nuxt,parity}`、React/Vue parity 工具链（`check-export-parity` / `check-editor-contract` / `check-feature-parity` / `check-parity-contract` / `check-consumer-install`、`scripts/parity/`、双端 perf 脚本、`scripts/extract-icons.mjs`）、changesets/release 发布链。
- 保留：`packages/agents/src/vue/**` 及其构建（root devDeps 的 `vue` / `@vitejs/plugin-vue` / `vue-eslint-parser` 因此保留）。
- 平台无关逻辑一律下沉 `packages/core/`（即使只有一个适配器，也让行为可单测、可复用）；不要把共享逻辑复制进 adapter。eslint 的 framework-isolation 规则继续强制 core/react/agents-vue 互不越界导入。
- editor chrome 样式与颜色 token 只在 `packages/core/src/styles/editor.css` 单一来源；adapter 的 `src/styles/editor.css` 保持 import-only，受 `bun run check:adapter-css-thin` 强制。
- `check:parity` = `check:public-docs-surface && check:adapter-css-thin`；不要重新引入 React/Vue 对比门禁。

---

## Architecture — Dual Rendering

**Two renderers. Know which one owns your bug.**

- **HIDDEN ProseMirror** (`left: -9999px`) — editing state, undo/redo, keyboard. `components/DocxEditor/HiddenProseMirror.tsx` (body) + `HiddenHeaderFooterPMs.tsx` (one EditorView per HF `rId`).
- **VISIBLE pages** — what user sees. Static DOM rebuilt from PM state. **NOT `toDOM`** — `src/layout-painter/renderPage.ts`. Fixing `toDOM` for a visual bug → user sees nothing.

Data flow: DOCX → `unzip` → `parser` → `Document` → `toProseDoc` → PM → painter → pages. Save: PM → `fromProseDoc` → `Document` → `serializer` → `rezip`.

Click flow: `usePagesPointer.handlePagesMouseDown` → `getPositionFromMouse` (body) or `clickToPositionDom` scoped to `.layout-page-header`/`.layout-page-footer` (HF) → PM setSelection → `PagedEditor.handleTransaction` → painter re-render.

Header/footer editing follows the same model as the body: the persistent hidden HF PM is the sole editor; the painter is the sole visible renderer in both edit and non-edit modes. The `InlineHeaderFooterEditor` overlay is UI chrome only (separator bar, options menu, save-on-close) — it does NOT mount its own EditorView. There is no `.hf-editor-pm` CSS — those workarounds existed to make PM's `toDOM` tables match the painter's flex layout and are gone now that the painter is the sole renderer. See `openspec/changes/unify-hf-editing/` for the design.

**UI styling / colors are single-source-of-truth.** All editor chrome CSS + color tokens live in `packages/core/src/styles/editor.css`; the React adapter only `@import` it (the adapter `src/styles/editor.css` must stay thin — enforced by `bun run check:adapter-css-thin`). Never hardcode hex/rgba in components — use the `--doc-*` tokens (or shadcn token utilities like `bg-primary`). The shared Tailwind theme lives in `packages/core/tailwind-preset.cjs`. Dark mode is a token override under `.ep-root.dark` (scaffold in the core stylesheet). The document canvas (painter output) is intentionally NOT themed — it stays Word-faithful.

### FlowBlock invariant — 2 switches

Adding a `FlowBlock` variant in `packages/core/src/layout-engine/types.ts` requires updating both; each ends with `assertExhaustiveFlowBlock` so `bun run typecheck` names the missing site:

1. `runLayoutPipeline` in `packages/core/src/layout-engine/index.ts`
2. `measureBlock` in `packages/react/src/components/DocxEditor/internals/measureBlock.ts`

### Painter DOM contract

Stable dataset attrs on painted DOM (CSS, queries, selection map depend on these):

- `data-block-id` — block index
- `data-from-line`/`data-to-line` — measured line range
- `data-pm-start`/`data-pm-end` — PM positions for selection mapping (body AND HF — different PM docs, scope queries with `.layout-page-content` for body / `.layout-page-header|footer` for HF; see `findBodyPmSpans.ts` for the pattern)
- `data-comment-id` — comment-range spans
- `data-change-author`/`data-change-date`/`data-revision-id` — tracked changes
- `data-continues-from-prev`/`data-continues-on-next` — split paragraphs
- `data-flex-line` — flex-promoted lines (image-aligned, right-tab); `renderParagraphFragment` suppresses `text-indent` on these (would apply per-flex-item)
- `data-vmerge-continuation` — synthetic slice of a vertically-merged cell re-painted on a continuation page (not selectable); `.layout-table-cut-border` — the horizontal rule that closes a table fragment at a page break. Tables split across pages via `TableFragment.fromRow/toRow` + `topClip`/`bottomClip` (mid-content row break).

### Key file map

| Debugging                    | File                                                            |
| ---------------------------- | --------------------------------------------------------------- |
| Text/paragraph rendering     | `layout-painter/renderParagraph.ts`                             |
| Image rendering              | `layout-painter/renderImage.ts`                                 |
| Table rendering              | `layout-painter/renderTable.ts`                                 |
| Table borders / cut edges    | `layout-painter/renderTableBorders.ts`                          |
| Table grid geometry (SoT)    | `layout-bridge/tableWidthUtils.ts` (`resolveCellGrid`)          |
| Table page-break geometry    | `layout-engine/tableRowBreak.ts`                                |
| Page composition             | `layout-painter/renderPage.ts`                                  |
| Formatting commands          | `prosemirror/extensions/marks/`, `nodes/`                       |
| Keyboard shortcuts           | `prosemirror/extensions/features/BaseKeymapExtension.ts`        |
| Toolbar ↔ selection          | `prosemirror/plugins/selectionTracker.ts`                       |
| DOCX XML parsers             | `docx/paragraphParser.ts`, `docx/tableParser.ts`                |
| Document → PM                | `prosemirror/conversion/toProseDoc.ts`                          |
| Click → PM position          | `components/DocxEditor/hooks/usePagesPointer.ts`                |
| Selection rects / caret      | `components/DocxEditor/hooks/useSelectionOverlay.ts`            |
| HF persistent PMs            | `components/DocxEditor/HiddenHeaderFooterPMs.tsx`               |
| HF caret in painter          | `components/DocxEditor/DocxEditorPagedArea.tsx` (`hfCaretRect`) |
| HF inline chrome             | `components/InlineHeaderFooterEditor.tsx`                       |
| Layout pipeline              | `components/DocxEditor/hooks/useLayoutPipeline.ts`              |
| Scroll API                   | `components/DocxEditor/hooks/usePagedScrollApi.ts`              |
| Image resize/drag            | `components/DocxEditor/hooks/useImageInteractions.ts`           |
| Font/HF reflow triggers      | `components/DocxEditor/hooks/useLayoutTriggers.ts`              |
| Table resize                 | `components/DocxEditor/hooks/useTableResizeState.ts`            |
| Measure-block cache          | `components/DocxEditor/internals/measureBlock.ts`               |
| Sidebar comment Y positions  | `components/DocxEditor/internals/sidebarAnchorPositions.ts`     |
| PM position → DOM            | `components/DocxEditor/internals/pmAnchors.ts`                  |
| Main toolbar                 | `components/Toolbar.tsx`                                        |
| Document/PM CSS              | `prosemirror/editor.css`                                        |
| UI chrome CSS + color tokens | `packages/core/src/styles/editor.css` (SINGLE SOURCE OF TRUTH)  |

Shared orchestration lives in core — the React adapter delegates through thin wrappers, so grepping an adapter often lands in core:

| Shared op                           | Core module (in `@eigenpal/docx-editor-core`) |
| ----------------------------------- | --------------------------------------------- |
| paraId/text helpers                 | `prosemirror/paraText.ts`                     |
| ref-API queries (find/selInfo/page) | `prosemirror/queries.ts`                      |
| agent applyFormatting/setParaStyle  | `prosemirror/applyFormatting.ts`              |
| comment/proposeChange + ID alloc    | `prosemirror/commentOps.ts`                   |
| table-resize read/commit + twips    | `prosemirror/tableResize.ts`                  |
| image resize/drag PM commits        | `prosemirror/imageCommit.ts`                  |
| cell-selection highlight            | `layout-bridge/cellSelectionHighlight.ts`     |
| drag auto-scroll delta math         | `utils/autoScroll.ts`                         |

### Extensions

`src/prosemirror/extensions/` — `nodes/`, `marks/`, `features/`. `StarterKit.ts` bundles all. `ExtensionManager.buildSchema()` (sync) → `initializeRuntime()` (post EditorState). Singleton in `schema/index.ts`.

### Pitfalls

- **Icons** — inline SVG in `components/ui/Icons.tsx`, NOT a font. `<MaterialSymbol name="x">` looks up `iconMap`; missing → renders raw text. Add SVG paths from fonts.google.com/icons.
- **Tailwind scope** — library scoped to `.ep-root`. Painter output isn't always protected → use inline styles on painted elements.
- **Focus stealing** — any mousedown that bubbles to PM moves caret. Dropdown/dialog mousedown needs `stopPropagation()`.
- **No `require()`** — ESM only.

OOXML reference: `reference/quick-ref/wordprocessingml.md`, `themes-colors.md`; schemas in `reference/ecma-376/part1/schemas/`. PDFs in `reference/ecma-376/` are gitignored — run `bun run reference:fetch` once when you need them.

Website docs (`docs/site/content/`，MDX) are kept for reference (the upstream site is offline). Feature-support claims live in `docs/site/data/word-features.ts` (typed matrix), never hand-written in prose.

**Nav gotcha — two meta.json files must agree.** The sidebar/overview is driven by the `"root": true` `docs/site/content/meta.json`, which lists pages with their full path (e.g. `guides/dark-mode`). Each subfolder also has its own `meta.json` (e.g. `guides/meta.json`). Adding a new page means registering it in BOTH — a page present only in the nested meta is reachable by URL but missing from the sidebar/overview.

---

## Security — untrusted DOCX/HTML input

**Treat every value from a DOCX, pasted HTML, or embedded part as attacker-controlled.** A `.docx` is a zip of XML an attacker fully controls — font names, hyperlink targets, shape attrs, image rels, run text. Sanitize at the **parse/trust boundary** (in `packages/core/src/docx/*Parser.ts` / PM `parseDOM`), not at render time, so every downstream consumer gets the clean value.

When you add/touch anything that **parses or renders unknown files** (parsers, `layout-painter/*`, PM `toDOM`/`parseDOM`, clipboard, print), audit these sink classes before merging:

- **No HTML-from-strings.** Never build DOM from file-derived values via `innerHTML` / `outerHTML` / `insertAdjacentHTML` / `document.write`. Build with `document.createElement(NS)` + `setAttribute` / `textContent`.
- **URLs go through `sanitizeHref`** (`packages/core/src/utils/sanitizeHref.ts`) — allowlists `http(s)/mailto/tel/ftp`, drops `javascript:`/`data:`/`vbscript:`/`file:`, strips embedded tab/LF/CR like WHATWG. Apply to every `href`, image `hlinkHref`, and `window.open(...)` arg.
- **Escape strings interpolated into CSS** — `@font-face` family names and any inline `style` built from file data. See `cssStringEscape` in `fontLoader.ts` (escapes `" \ < >` and CSS newlines `\n \r \f`). Build print/popup `<style>` via `textContent`, never `document.write`.
- **Residual CSS injection** — colors/transform/font-family still flow into inline `style` strings (set via `setAttribute`, so not XSS, but enables overlay/clickjacking and `url()` beacons). Validate/clamp where practical.

Malicious-file parsing also has non-injection classes — guard these when opening/saving unknown files:

- **XML safety** — the XML parser must not resolve DTDs/external entities (XXE → file/SSRF read) or expand nested entities (billion-laughs DoS).
- **Zip safety** — enforce a decompression-ratio/size cap (zip bomb) and reject part/rel/media paths containing `..` or a leading `/` before resolving them (path traversal).
- **No zero-click external fetch** — never auto-load a remote target from a file: external-mode image/font/link relationships (`TargetMode="External"`), remote `src`, CSS `url()`/`@import`. A network request on open is SSRF / IP-leak / tracking-beacon. Fetch only same-origin/embedded parts; gate remote loads behind explicit user action.
- **Resource limits** — cap recursion depth (nested tables/shapes/SDT/groups/textboxes) and element counts (rows/cells/runs/pages); never feed a file-supplied number straight into allocation, `.repeat()`, or a loop bound. Avoid catastrophic-backtracking (ReDoS) regex on file-derived strings.
- **XML injection on save** — escape every attacker-derived string written back into XML on serialize/round-trip (`escapeXml`); never template a raw value into output markup.
- **Prototype pollution** — guard `JSON.parse`-of-file-data merges and any XML-attribute-name → object-key assignment against `__proto__`/`constructor`/`prototype`.
- **Field codes / OLE / embedded objects** — never execute or auto-resolve Word field instructions (DDE, `INCLUDE*`, etc.) or embedded OLE/macro content; render inert.

Quick audit grep when reviewing file-handling diffs:

```bash
grep -rnE "innerHTML|outerHTML|insertAdjacentHTML|document\.write|window\.open\(|\.href\s*=|font-family:.*\$\{" packages --include="*.ts" --include="*.tsx" | grep -viE "test|\.spec\."
```

Run that grep on any PR that parses or renders file data before merging. When you touch one sink, **check sibling sinks** so the same class isn't left open elsewhere — e.g. the exported `openPrintWindow` util (`core/utils/print.ts`, `PrintPreview.tsx`) still builds its popup via `document.write` with an unescaped `title`/`content`. Treat it as a **known sink to harden**, not a safe reference.

---

## i18n

`packages/i18n/en.json` is source of truth. Other locales mirror its shape with `null` = falls back to English. Missing key = CI fails.

```ts
import { useTranslation } from '../i18n';
const { t } = useTranslation();
t('toolbar.bold');
t('dialogs.findReplace.matchCount', { current: 3, total: 15 });
```

Workflow:

- New string → add to `en.json`, use `t('key')`, run `bun run i18n:fix`.
- New language → `bun run i18n:new <code>`, fill nulls, `bun run i18n:status`.
- Validate: `bun run i18n:validate`.

Never hardcode user-facing English in components.

---

## Public API surface

API Extractor snapshots live in `docs/api/<pkg-slug>/<entry>.api.md`. CI runs `bun run api:check`.

CI fails on drift → `bun run api:extract` → commit.
Changing a `@public` symbol → tag in TSDoc, rebuild package, `bun run api:extract`, commit snapshot.

`bun run docs:json` generates downstream-consumer JSON. Output is gitignored; CI runs it as a smoke test.

---

## 构建与私有分发（本 fork）

不发布 npm。`bun run build:packages` 按 **i18n → core → agents → react** 顺序构建四个包；主仓库 `.lawyer/editor` 经 `file:` junction + `node build.js` 打包（详见 `SELF-MAINTENANCE.md`「重建循环」）。

- 改 `packages/*/src` 后：先重建对应包（或 `bun run build:packages`），再到主仓库 `node build.js` 重生成 bundle。
- `packages/*/dist` 不入库；每次合并记录 gitlink SHA。
- 无 changesets / release workflow；不要手工改 `CHANGELOG.md` 或 `package.json#version`。

---

## PR style

Short factual title (conventional-commit prefix). Body is the minimum the diff doesn't show — often one sentence.

Don't: `@`-mention contributors, reference unrelated PR/issue numbers, list changed files, add tooling footers, use emojis.

---

## Bugs

上游 issue tracker 可作参考：`gh issue view <N> --repo eigenpal/docx-editor`。Dev server: `bun run dev` → `http://localhost:5173/`。Commit format: `fix: ... (fixes #N)`。

Toolbar icons: Material Symbol SVGs, saved locally. Screenshots → `screenshots/`。
