---
name: docx-motion-and-icons
description: 'DOCX 编辑器动效与图标规范：新 keyframes 只定义在 core editor.css 并同步 prefers-reduced-motion 降级块；UI 图标一律 Icons.tsx 的 <MaterialSymbol>，缺图标补官方 SVG path（fonts.google.com/icons），emoji/字符不作图标。Triggers: 动效, keyframes, animation, reduced-motion, prefers-reduced-motion, 图标, icon, MaterialSymbol, Icons.tsx, iconMap, emoji 图标, 关闭按钮图标, ContextMenu 图标'
---

# DOCX 编辑器动效与图标规范

<role>改编辑器 chrome 动效或新增/替换 UI 图标时，按本技能走单一来源与降级规则；缺图标补官方 path，不用 emoji/字符。</role>

## 动效（单一来源 core）

1. 新 keyframes 只定义在 `packages/core/src/styles/editor.css` 的 Chrome keyframes 段（现有 `docx-spin`、`docx-loading-spin`、`docx-loading-pulse`、`docx-loading-dots`、`docx-loading-bar`、`docx-pulse`、`docx-slide-in`、`docx-paragraph-flash-fade`、`hf-caret-blink`）。
2. 组件按名引用：inline `animation: 'docx-x 0.8s …'` 或共享 class（如 `.docx-hf-caret`）。在 adapter 里定义 keyframes、或运行时注入 `<style>` 都拿不到降级覆盖。
3. 同 commit 扩展 `editor.css` 末尾的 `@media (prefers-reduced-motion: reduce)` 块：`.ep-root *` 已覆盖根内元素；新 portal 到 `.ep-root` 外的表面（overlay / preview / notification 容器等）要把选择器加进该块。HF 光标在该块里 `animation: none !important`（保持常亮，不闪烁）。
4. JS 驱动的闪烁（`SelectionOverlay` 光标）先查 `window.matchMedia('(prefers-reduced-motion: reduce)')`，命中则不启动 setInterval。

## 图标（Icons.tsx 单一注册表）

1. UI 图标一律用 `packages/react/src/components/ui/Icons.tsx` 的 `<MaterialSymbol name="…" size={16|20|…} />`；新组件里直接写 `<svg>` 或把字符当图标都不行。
2. 缺图标时：从 fonts.google.com/icons 复制 Material Symbols 24dp outlined 的官方 path（viewBox `0 -960 960 960`），按 Icons.tsx 现有格式加 `export function IconX`，再在 `iconMap` 加 `name: IconX`。
3. 先复用再新增：语义接近时 map 到已有组件（如 `select_all` → `IconBorderAll`、`auto_awesome` → `IconAgentSparkle`）。
4. Fallback 行为：`iconMap` 查不到 name 时 `console.warn` 并把 name 当文本渲染——截图/页面出现原始文本即缺条目，按 2 补上。
5. `Icons.tsx` 有 eslint `max-lines` 1100 覆盖（`eslint.config.js`）；每次加图标前先看能否复用。
6. 属于数据/排版符号、不算图标的例外：`⌘⌥⇧`、标尺 `▲▼`、HF `▾` 等排版符号；`InsertSymbolDialog` 的符号数据字符；emoji 不作为图标。
7. 已知消费点：`ContextMenu.tsx` 的 `ACTION_ICON_NAMES` 把 AI 动作映射到 Material Symbol 名；7 个对话框关闭按钮统一 `<MaterialSymbol name="close" size={16} />`（保留 `aria-label`）。

## Key Commands

```bash
bun run typecheck
bun run lint   # Icons.tsx max-lines 覆盖在此生效
# 图标相关 e2e（改动 ContextMenu/对话框后）
bunx playwright test e2e/tests/find-replace-shortcuts.spec.ts e2e/tests/hyperlinks.spec.ts e2e/tests/help-menu.spec.ts --project=chromium --timeout=30000 --workers=2
bunx playwright test e2e/tests/table-context-menu.spec.ts --project=chromium --timeout=30000 --workers=1
# 动效降级 e2e
bunx playwright test e2e/tests/reduced-motion.spec.ts --project=chromium --timeout=30000 --workers=4
```

## 踩坑

- **少了 iconMap 条目不会被 typecheck 拦住**：`name` 是 string，编译期无校验；验证时打开对应 UI 看是否渲染成原始文本。
- **prettier 不折行 path 字符串**：path 保持单行即可，`bun run format` 不会改动内容。
- **AGENTS.md 的 Motion/Icons 两条 Pitfalls 与本技能同源**；改规则时两处同步。
