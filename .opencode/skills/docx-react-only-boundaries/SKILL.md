---
name: docx-react-only-boundaries
description: 'DOCX 编辑器 fork 的 React-only 边界与工作流：已删 Vue/Nuxt/parity 资产、agents Vue UI 例外、四包构建链（i18n→core→agents→react）、e2e 用 bunx + 浏览器镜像、主仓库 junction+build.js 重建循环、check:parity 链。Triggers: React-only, 架构边界, 四包构建, build:packages, 主仓库重建, junction, build.js, e2e 命令, bunx playwright, 浏览器镜像, SELF-MAINTENANCE, 分支策略'
---

# DOCX 编辑器 fork：React-only 边界与工作流

<role>在本仓库（.lawyer/docx-editor-src）改动、构建或跑测试前，按本技能确认边界，避免踩已删架构与双仓工作流的坑。</role>

## 边界（单一事实源：根 AGENTS.md / SELF-MAINTENANCE.md）

- 已删除：`packages/{vue,nuxt}`、`examples/{vue,nuxt,parity}`、`e2e/tests/{vue,nuxt,parity}`、React/Vue parity 校验脚本、changesets/release 发布链（`.changeset/`、`release.yml`、`vercel.json`、`RELEASING.md`）。
- 保留：`packages/agents/src/vue/**`（agents 包 Vue UI）——root devDeps 的 `vue`/`@vitejs/plugin-vue`/`vue-eslint-parser` 与 eslint `.vue` 解析因此存在，不要删。
- 平台无关逻辑一律下沉 `packages/core/`（即使只有一个适配器）；chrome 样式/颜色 token 只在 `packages/core/src/styles/editor.css`。
- `check:parity` = `check:public-docs-surface && check:adapter-css-thin && check:ui-colors`；不要重新引入 React/Vue 对比门禁。

## 构建链（fork 私有分发，不发布 npm）

```
i18n → core → agents → react
bun run build:packages          # 现在就是上述四包顺序，可直接用
```

主仓库（lawyer_assistant）集成：`.lawyer/editor` 经 `file:` junction 解析四包 dist，`node build.js` 重生成 `editor.bundle.js/css + docx-editor.bundle.css`。改 `packages/*/src` 后：重建对应包 → `node build.js` → 双仓各一个 commit（fork 提交 src；主仓库提交 bundles + gitlink SHA）。`packages/*/dist` 不入库。

## E2E 命令（Windows/本目录特有坑）

- 一律 `bunx playwright`，**不要 `npx playwright`**：本仓库挂在父项目下、bun 隔离安装没有顶层 `playwright` 链接，npx 会逃逸到 `lawyer_assistant/node_modules/playwright`（另一版本）→ 双实例报 `Playwright Test did not expect test.describe() to be called here`。
- 首次装浏览器：`bunx playwright install --only-shell chromium`；慢网络先 `$env:PLAYWRIGHT_DOWNLOAD_HOST='https://cdn.npmmirror.com/binaries/playwright'`。
- Playwright 配置仅 chromium + React dev server（自动拉起 5173）。
- 慢机器：打字类用例（`text-editing.spec.ts` 的 very long text input）需 `--timeout=60000 --workers=1`；混合批次用 `--workers=2` 减少争用抖动。
- 基线复现既有失败：`git stash push -u` → 跑同命令 → `git stash pop`，用于区分存量失败与本次回归。

## 分支与提交

`main` = 回滚基线；改动走短命分支（如 `refactor/react-only-normalization`），完成后合回 main。pre-commit 钩子会跑 typecheck + `check:parity` + `api:check` + lint-staged。

## Notes

- `api:check` 对比的是 **dist**：改公共面后先 `bun run build:packages` 再 `bun run api:extract`，否则钩子可能因 dist 未重建而漏检。
- 文档画布（painter 输出）有意 Word 保真、不做主题化；`--doc-comment-highlight-*` 等画布 token 不得在 `.ep-root.dark` 覆写。
