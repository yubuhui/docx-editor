---
name: docx-ui-color-tokens
description: 'DOCX 编辑器 chrome 颜色必须走 --doc-* token：新增 token 只加 core editor.css、文档域值用 color-token-ignore、check:ui-colors 门禁与豁免写法、画布 token 禁暗色覆写。Triggers: 颜色, 颜色 token, --doc, check:ui-colors, check:ui-color-tokens, 硬编码颜色, color-token-ignore, 调色, 深色模式, dark mode, 画布高亮, 图片选框颜色'
---

# DOCX 编辑器 UI 颜色 token

<role>改任何 React 侧 UI 颜色（chrome）时，按本技能走 token 单一来源与门禁；文档域/OOXML 数据按豁免规则标注。</role>

## 单一来源

- 所有 chrome 颜色 token `--doc-*` 定义在 `packages/core/src/styles/editor.css` 的 `.ep-root` 亮色块；组件只 `var(--doc-x)` 引用。
- adapter 的 `src/styles/editor.css` 保持 import-only（`bun run check:adapter-css-thin` 强制）。
- 暗色覆写写在 `.ep-root.dark, .ep-root.dark .ep-root` 块；只有「表面本身随主题反转」的 token 才覆写。画布高亮 token（`--doc-comment-highlight-*` / `--doc-insertion-*` / `--doc-deletion-*`）**永不**覆写——画布是亮色绘制 + `filter` 反相，覆写会反相成错误颜色。

## 新增 token 流程

1. 在 core `editor.css` 亮色 token 区块加 `--doc-xxx`（带用途注释）；需要随主题反转时在 dark 块补值。
2. 组件用 `var(--doc-xxx)` 引用。
3. 跑 `node scripts/check-ui-color-tokens.mjs` + `bun run typecheck`。

## check:ui-colors 门禁

- 脚本 `scripts/check-ui-color-tokens.mjs`，命令 `bun run check:ui-colors`，已挂在 `check:parity` 链尾（`check:public-docs-surface && check:adapter-css-thin && check:ui-colors`）。
- 扫描 `packages/react/src/**/*.{ts,tsx,css}`（排除 `*.test.*`/`*.spec.*`；`Icons.tsx` 整文件豁免为图形数据）。
- 先剥注释（`/* */`、`//`、`{/* */}`、`<!-- -->`）再匹配 `#rgb/#rrggbb/#rrggbbaa`、`rgb(`/`rgba(`/`hsl(`/`hsla(`。
- 允许：`var(--x, #hex)` 兜底；`rgba(var(--doc-scrim-rgb), α)` 这类纯 token 包裹。
- 豁免写法（注释理由必填）：
  - 行级：`// color-token-ignore: <理由>` 放**同行或上一行**；
  - 文件级：任意位置 `// color-token-ignore-file: <理由>`（用于 OOXML 默认值/预设数据/装饰图形整文件）。
- 输出 `file:line: value` 并非零退出；全绿打印 `✓ ... (N files scanned)`。

## 关键 token / 模式

- `--doc-on-accent`：固定白（`#ffffff`，dark 不覆写）——永远深色/固定彩色表面上的前景，如 `--doc-overlay` 蒙层、PageIndicator、头像、拖拽 ghost。
- `--doc-on-primary`：会随 dark 反转（dark 变深色）——只用于 `--doc-primary` 填充按钮、进度条等主题联动表面。
- `--doc-scrim-rgb: 0, 0, 0`：动态蒙层 `rgba(var(--doc-scrim-rgb), α)`。
- 图片选框/手柄：`--doc-image-accent` / `--doc-swatch-bg`。
- HF 光标/选区：`--doc-hf-caret` / `--doc-hf-selection`；正文选区：`--doc-selection-overlay`。
- 插件面板：`--doc-bg` / `--doc-bg-hover` / `--doc-border-light` / `--doc-text-muted` / `--doc-shadow-sm`。

## 踩坑

- **`.ep-root` 外拿不到 token**：token 只定义在 `.ep-root`（不是 `:root`）。追加到 `document.body` 的元素（如 ImageSelectionOverlay 的拖拽 ghost `document.body.appendChild`）必须写 `var(--doc-x, #fallback)` 兜底，否则 var 解析失败、整条声明失效。
- **门禁只查 hex/rgb/hsl**：`'white'`/`'black'` 等命名色与 Tailwind class 不在此门禁范围；替换时也要一并看（已知残留 `ContextMenu`/`EditableImage`/`PasteSpecialDialog`/`LoadingIndicator` 的 `'white'`，属遗留，改到即顺手 token 化）。
- **文档域值不是 chrome**：OOXML 默认边框黑、水印银、表样式预设色、模板标签色、装饰 logo——保留字面值 + `color-token-ignore`/`-file` 注释，不要 token 化。
- **语义近似替换非像素相等**：`#6c757d→--doc-text-muted(#5f6368)`、`#e9ecef→--doc-border-light(#dadce0)`；视觉要求像素级时在 core 增专用 token。
