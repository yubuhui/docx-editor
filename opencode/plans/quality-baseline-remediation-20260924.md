# React-only 架构裁剪 + 质量底线规范化改造 开发计划

> 仓库：`D:\Ai_Project\lawyer_assistant\.lawyer\docx-editor-src`（fork 自维护线，见 SELF-MAINTENANCE.md）
> 本版替代 2026-09-24 早期《质量底线规范化改造》版本（Vue 范围作废，保留其 React 部分按裁剪后重排）。
> 红线（不得破坏）：`.ep-root` 类名前缀不迁移；修订/评论留在 free core；`packages/*/dist` 不提交；`i18n → core → agents → react` 四包构建链保持可用。
> 状态：**主进程复核通过（含小瑕疵修正，见第五节）；4 项已裁决：①发布链删除 ②docs/site 全量清扫 ③手写 X SVG 一并换 ④smoke 覆盖现在移植（正文已按裁决更新）。**

---

## 一、目标与范围（做什么/不做什么）

### 1.1 目标

| #   | 目标                                                                                                          | 落地阶段 |
| --- | ------------------------------------------------------------------------------------------------------------- | -------- |
| G1  | 删除 Vue/Nuxt/parity 全部架构（包、示例、e2e 项目、脚本、CI、快照、文档），仓库收敛为 React-only 自维护线     | 阶段 0   |
| G2  | 项目指令文件 `CLAUDE.md` → opencode 的 `AGENTS.md`（React-only）；`SELF-MAINTENANCE.md`、README、站点文档同步 | 阶段 1   |
| G3  | 动效统一：keyframes 单一来源 core + `prefers-reduced-motion` 降级 + JS 闪烁降级                               | 阶段 2   |
| G4  | chrome 硬编码颜色 token 化 + 新增颜色门禁脚本 `check:ui-colors`（React-only 扫描）                            | 阶段 3   |
| G5  | React `useVisualLineNavigation` 委托 core（先修复 core 的 body-scope 缺陷）                                   | 阶段 4   |
| G6  | React 图标规范化：AI ContextMenu 自定义图标 → MaterialSymbol；对话框关闭图标统一                              | 阶段 5   |
| G7  | 对话框 mousedown 焦点防护补齐（React 11 个）+ 焦点 e2e                                                        | 阶段 6   |
| G8  | CI 新增 chromium-only e2e smoke 工作流                                                                        | 阶段 7   |

### 1.2 明确不做

- **agents Vue UI 保留例外**：`packages/agents/src/vue/**`、`vue.ts`、`ai-sdk/vue.ts` 及其构建保留 → root devDeps 的 `vue`/`@vitejs/plugin-vue`/`vue-eslint-parser`、eslint 的 `.vue` 解析、`docs/api/docx-editor-agents/{vue,ai-sdk-vue}.api.md`、agents 的 `vue-tsc` typecheck 全部保留。
- 表样式预设下沉 core（原为 React/Vue 去重）：Vue 删除后 React 内联数据即单一来源，**不下沉**（已核实 `TableStyleGallery.tsx` 无其他包引用）。
- 存量「shared with Vue」注释全量清扫：churn 大、无门禁价值；仅清理会误导操作的少数几处（见阶段 0）。
- core 28 处循环依赖、对话框共享壳重构、编排层全面下沉、e2e 全量入 CI：维持「独立立项」判定。
- `packages/agents` 内 5 处 keyframes：随 agents 独立包处理。
- 插件模板标签色、表样式预设色、OOXML 默认值：文档域数据，门禁以 `color-token-ignore` 豁免。

---

## 二、阶段拆分

依赖：`0 → 1`；`2 → 3`（同改 core `editor.css`，顺序执行）；`4/5/6` 与 2/3 独立；`7` 依赖 0。
每阶段独立 commit、独立可测、独立回滚。**执行分支：`refactor/react-only-normalization`**（main 保持回滚基线，每阶段一 commit，全部完成后合回 main）。**fork 不发布 npm，不做 changeset**（判定见 3.6；裁决①已确认删除发布链）。

---

### 阶段 0：React-only 架构裁剪（整阶段单 commit，删除列表原子化）

**目标**：仓库不再含 Vue/Nuxt/parity 任何构建、测试、脚本、CI、快照、部署依赖；四包链与 React e2e 可用。

**A0. 覆盖移植（删除前先做，裁决④）**：把 `e2e/tests/parity/smoke/{watermark-render,watermark-presets,footnote-convergence}.spec.ts` 改写为 chromium-only 根级 spec（`e2e/tests/watermark-render.spec.ts`、`watermark-presets.spec.ts`、`footnote-convergence.spec.ts`，改用 React 夹具），先跑通再删 parity 目录，覆盖不丢。

**A. 删除（附录 A1 全表，共约 24 组）**：`packages/vue/`（178 tracked）、`packages/nuxt/`（8；注意目录名是 `nuxt`）、`examples/{vue,nuxt,parity}/`、`examples/shared/{AdapterSwitcher.tsx,ExampleSwitcher.vue,BrandLogo.vue}`（已核实 AdapterSwitcher 为死代码）、`e2e/tests/{vue,nuxt,parity}/`（29/1/12）、`docs/api/docx-editor-vue/`、`docs/site/content/vue/`、`docs/site/content/frameworks/nuxt.mdx`、parity 相关脚本（`check-export-parity`、`check-editor-contract`、`check-feature-parity`、`check-parity-contract` + `scripts/parity/`、`check-consumer-install`、`parity-prepublish`、`scripts/lib/parity-report.mjs`、`scripts/extract-icons.mjs`）、`scripts/perf/{cold-start,input-latency,save,scroll-fps}.mjs` + `scripts/perf/lib/editor-perf.mjs`（保留 `perf/compare-baseline.mjs`，已核实 `perf-check.yml` 只用它）、`openspec/changes/vue-editor-robust-implementation/`、发布链（`.github/workflows/release.yml`、`.changeset/`、`docs/RELEASING.md`、`vercel.json`——裁决项①）。

**B. 修改（附录 A2 全表）**

- `package.json`：workspaces 去 `examples/{vue,nuxt}`；删 `dev:vue/dev:nuxt/build:vue/build:assemble/preview/test:e2e:{vue,nuxt,parity,parity:smoke,full}/check:{export-parity,editor-contract,feature-parity,parity-contract,consumer-install}/parity:{perf,prepublish}/changeset/version-packages/release`；`build:packages` 改为 i18n→core→agents→react（与 SELF-MAINTENANCE 一致）；`build` 改为 `build:packages && build:react`；`preview` 指向 examples/vite dist；`check:parity` 改为 `check:public-docs-surface && check:adapter-css-thin`；devDeps 去 `@changesets/*`
- `playwright.config.ts`：仅 `chromium` project + `reactDevServer`；删 vue/nuxt/parity 项目、5174/3002 dev server、`PERF_REACT_ONLY` 分支
- `eslint.config.js`：删 packages/vue 规则块与 max-lines；`VUE_GROUP` 去 vue 包名；`SPEC` 常量改为内联说明；保留 `.vue` 解析（agents）
- `scripts/check-adapter-css-thin.mjs`（仅 react）、`scripts/check-public-docs-surface.mjs`（去 vue 条目）、`scripts/lib/packages.mjs`（PACKAGES 去 vue）
- `.github/workflows/{ci.yml,dependabot-lockfile.yml}`：删 `check:parity-contract` 步骤
- `.husky/pre-commit`：提示语去 Vue/parity/openspec 表述（命令名 `check:parity`/`api:check` 不变；**注意该文件 em-dash 已呈乱码（含 U+FFFD 替换符），编辑时用 Edit 工具并以 UTF-8 核对**）
- `examples/shared/config.ts` + `ExampleSwitcher.tsx`：去 Vue 条目与联合类型；`examples/dev-all.sh` 去 Vue 端口
- `docs/site/content/meta.json`、`frameworks/meta.json`：去 vue/nuxt 条目
- `packages/core/src/styles/editor.css`：删死选择器 `.ep-root .docx-editor-vue__pages-viewport*` 5 组（已核实 L287-319）
- 误导性注释清理：`packages/core/src/prosemirror/utils/extractTrackedChanges.ts:12`、`packages/core/src/prosemirror/plugins/suggestionMode/index.ts:88`（引用已删包名）、`e2e/tests/issue-777-vml-header-render.spec.ts:4-5`、`issue-734-rtl-table.spec.ts:7-8`、`packages/agents/src/bridge.ts`、`packages/core/tsup.config.ts:11`
- `.gitignore` 去 examples/vue 行；`bun install` 重生成 `bun.lock`（必须，CI `--frozen-lockfile`）

**验证命令**

```bash
bun install
bun run typecheck
bun test
bun run lint
bun run format:check
bun run i18n:validate
bun run check:parity
bun run --filter @eigenpal/docx-editor-i18n build
bun run --filter @eigenpal/docx-editor-core build
bun run --filter @eigenpal/docx-editor-agents build
bun run --filter @eigenpal/docx-editor-react build
bun run api:check
bun run check:i18n-bundle-size
bun run docs:json
npx playwright test --project=chromium e2e/tests/formatting.spec.ts e2e/tests/text-editing.spec.ts --timeout=30000 --workers=4
# 反证 grep（期望 0 命中）：
rg -n "docx-editor-vue|nuxt-docx-editor|examples/(vue|nuxt|parity)|project=(vue|nuxt|parity)" package.json playwright.config.ts .github scripts eslint.config.js .husky
```

**回滚**：`git revert <sha>` 单 commit 恢复全部删除文件；随后 `bun install` 复原 lock。

---

### 阶段 1：文档改造（AGENTS.md + SELF-MAINTENANCE + README/站点）

**目标**：opencode 项目指令落地为 React-only `AGENTS.md`；文档不再指导安装已删包。
**提交方式**：1a（项目指令与包文档）一个 commit；1b（站点内容）一个 commit（范围见裁决项②）。

**1a 涉及文件**

- `git mv CLAUDE.md AGENTS.md` 后按映射重写：

| 现 CLAUDE.md 章节                                                                          | 处置                                                                                                                     |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| 标题/简介、Verify、Test file map、Key file map、Extensions、i18n、Security、PR style、Bugs | 保留，去 Vue 字句（Security 的 grep 示例去 `--include="*.vue"`）                                                         |
| Architecture — Dual Rendering                                                              | 保留；删「Vue host」段                                                                                                   |
| React/Vue parity                                                                           | **删除**，替换为「React-only 边界」＋「共享逻辑必须下沉 core（单适配器也要下沉）」                                       |
| FlowBlock invariant — 3 switches                                                           | 改为 **2 switches**（core + React `measureBlock.ts`）                                                                    |
| Painter DOM contract                                                                       | 保留                                                                                                                     |
| Public API surface / Parity contract                                                       | 删 parity contract 小节，保留 API Extractor 快照流程                                                                     |
| Releasing (changesets)                                                                     | 整章替换为「Fork 私有分发」：四包构建顺序、主仓库 junction+build.js、不发布 npm、不做 changeset（链接 SELF-MAINTENANCE） |
| 新增                                                                                       | React-only 边界清单；本改造新增规范随阶段 2/3/5 落地写入（动效/颜色 token/图标），不留空头命令                           |

- `SELF-MAINTENANCE.md`：更新 root `build:packages` 说明；新增「React-only 边界」节（已删目录 + agents vue 例外）；测试命令不变
- `README.md`、`CONTRIBUTING.md`、`packages/{react,core,i18n}/README.md`、`packages/agents/README.md`、`PERFORMANCE-ISSUE.md`：去 Vue/Nuxt/parity 安装、包表、说明段落
- `.claude/` 与 openspec 技能保留（opencode 可加载）

**1b 涉及文件（裁决②：全量清扫）**：`docs/site/content/` **全量**去 Vue/Nuxt/parity 内容（含 `index/quickstart/installation/examples/migration` 与 `{react,guides,agents,core,i18n}/**`，以 grep 归零为准，约 28 个文件）；`docs/CONTENT-CONTROLS.md`、`docs/PROPS.md` 同步；`packages/core/src/**`、`packages/react/src/**`、`packages/i18n/src/index.ts` 的「shared with Vue」历史注释改写为「core 共享/单一实现」（只改措辞，不改行为）。

**验证命令**

```bash
npx prettier --check AGENTS.md SELF-MAINTENANCE.md README.md CONTRIBUTING.md
rg -n -i "docx-editor-vue|nuxt-docx-editor|examples/(vue|nuxt|parity)" AGENTS.md SELF-MAINTENANCE.md README.md CONTRIBUTING.md packages/*/README.md docs/site/content docs/*.md
# 期望 0 命中（CHANGELOG/docs/api/openspec 历史除外）
bun run check:parity
```

**回滚**：`git revert`；`AGENTS.md → CLAUDE.md` 逆重命名随 revert 恢复。

---

### 阶段 2：动效统一（React + core）

**目标**：`packages/{core,react}` keyframes 单一来源 core；`prefers-reduced-motion` 全覆盖；HF 光标类化；JS 闪烁降级。
**已核实**：React 5 处本地动效：`ui/LoadingIndicator.tsx`（L122-142 定义 + L332-336 运行时注入 `docx-loading-keyframes`）、`ui/UnsavedIndicator.tsx:160,179-180`、`DocxEditorHelpers.tsx:44-47`、`ErrorBoundary.tsx:249,354`、`ResponsePreview.tsx:114,125`；core 已有 `@keyframes hf-caret-blink` @ L888、`docx-paragraph-flash-fade` @ L535；全仓无 `prefers-reduced-motion` 媒体查询（仅 `ImageSelectionOverlay.vue:215` 注释——该文件随 Vue 删除）。

**涉及文件**

- `packages/core/src/styles/editor.css`：新增 `docx-spin`、`docx-loading-pulse/dots/bar`（取 React 现值与 2.1s cubic-bezier）、`docx-pulse`、`docx-slide-in`；`.docx-hf-caret { animation: hf-caret-blink 1.06s steps(1) infinite; }`；`@media (prefers-reduced-motion: reduce)` 作用域 `.ep-root *`、`.docx-loading, .docx-loading *`、`.docx-response-preview, .docx-response-preview *` → `animation-duration:0.01ms!important; animation-iteration-count:1!important; transition-duration:0.01ms!important;` + `.docx-hf-caret{animation:none!important}`
- React：`LoadingIndicator.tsx`（删本地 keyframes 与注入 effect，动画串改 core 名）、`UnsavedIndicator.tsx`、`DocxEditorHelpers.tsx`、`ErrorBoundary.tsx`、`ResponsePreview.tsx`、`DocxEditorPagedArea.tsx:516-519`（inline animation → `className="docx-hf-caret"`，色留阶段 3）
- `DocxEditor/overlays/SelectionOverlay.tsx`：`matchMedia('(prefers-reduced-motion: reduce)')` 命中则不启 setInterval（光标常亮）
- 新增 `e2e/tests/reduced-motion.spec.ts`：reduce 下断言 loading bar `animation-duration=0.01ms`、`.docx-hf-caret` `animation-name=none`；默认媒体下不为 none

**验证命令**

```bash
bun run typecheck
bun test packages/core
bun run check:adapter-css-thin
npx playwright test e2e/tests/reduced-motion.spec.ts --timeout=30000 --workers=4
npx playwright test e2e/tests/issue-928-zoom-caret-height.spec.ts e2e/tests/hf-selection-rects.spec.ts e2e/tests/hf-click-and-type.spec.ts --timeout=30000 --workers=4
npx playwright test e2e/tests/visual-regression.spec.ts --grep "loading" --timeout=30000 --workers=4
# 若 grep 无匹配：全跑 visual-regression.spec.ts 或人工截图对比，不跳过
```

**回滚**：`git revert`。
**同 commit 更新 AGENTS.md**：动效 keyframes 必须定义在 core 且 reduced-motion 覆盖（禁令配正面替代）。

---

### 阶段 3：颜色 token 化 + 门禁脚本

**目标**：React 侧除文档域数据/默认值/装饰外零硬编码颜色；`check:ui-colors` 防回归。

**core 新增 token（light 块；除注明外不做 dark 覆写）**

```
--doc-on-accent: #ffffff;                    /* 主题不变的强调色前景（勿用 dark 会反转的 --doc-on-primary）*/
--doc-scrim-rgb: 0, 0, 0;                    /* rgba(var(--doc-scrim-rgb), α) 动态蒙层 */
--doc-image-accent: #2563eb;                 /* 图片选框/手柄 */
--doc-swatch-bg: #ffffff;  --doc-swatch-outline: #bbb;
--doc-selection-overlay: rgba(66,133,244,0.3);
--doc-hf-caret: #4285f4;   --doc-hf-selection: rgba(66,133,244,0.25);
/* 画布高亮（勿在 .ep-root.dark 覆写，页面走 filter 反相）*/
--doc-comment-highlight-bg: rgba(255,212,0,0.35);
--doc-comment-highlight-border: rgba(255,212,0,0.7);
--doc-insertion-bg: rgba(52,168,83,0.2);  --doc-insertion-border: #2e7d32;
--doc-deletion-bg: rgba(211,47,47,0.2);
```

复用既有 token：`--doc-bg`/`--doc-bg-hover`/`--doc-border-light`/`--doc-border-input`/`--doc-text-muted`/`--doc-surface`/`--doc-shadow`/`--doc-shadow-strong`/`--doc-error`/`--doc-error-bg`（均已核验存在）。

**React 替换清单（实测行号）**

| 文件                                                       | 行                                                                                                              | 处置                                                                                              |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `components/DocxEditor/DocxEditorPagedArea.tsx`            | 516→`var(--doc-hf-caret)`；535→`var(--doc-hf-selection)`                                                        | chrome                                                                                            |
| `components/DocxEditor/overlays/SelectionOverlay.tsx`      | 47                                                                                                              | `var(--doc-selection-overlay)`                                                                    |
| `components/DocxEditor/DocxEditorShell.tsx`                | 239/248/249                                                                                                     | comment/insertion/deletion token                                                                  |
| `components/DocxEditor/overlays/ImageSelectionOverlay.tsx` | 70/96/99/107/360/361                                                                                            | `--doc-image-accent`、`--doc-swatch-bg`、`rgba(var(--doc-scrim-rgb),0.35/0.75)`、`color-mix(...)` |
| `components/DocxEditor/PageIndicator.tsx`                  | 29                                                                                                              | `--doc-on-accent`                                                                                 |
| `components/ui/LoadingIndicator.tsx`                       | 300→`--doc-on-accent`；413→`rgba(var(--doc-scrim-rgb), α)`                                                      | chrome                                                                                            |
| `components/ui/ColorPicker.tsx`                            | 567/624→`--doc-swatch-bg`；570/627→`--doc-swatch-outline`；664→`var(--doc-border-input)`；667→`--doc-swatch-bg` | chrome                                                                                            |
| `plugin-api/PluginHost.tsx`                                | 74/75/79/83/87/88/112/125/126/165/167                                                                           | `--doc-bg`/`--doc-border-light`/`--doc-text-muted`/scrim                                          |
| `components/sidebar/cardUtils.ts`                          | 44/61                                                                                                           | `--doc-on-accent`                                                                                 |

**豁免（加 `color-token-ignore: <理由>`）**：`ColorPicker.tsx:245,677,688`、`ImagePropertiesDialog.tsx:147,159`、`WatermarkDialog.tsx:149,170`、`TableBorderWidthPicker.tsx:119`、`plugins/template/components/{TemplateChip,TemplateHighlightOverlay}.tsx`、`ui/TableStyleGallery.tsx:118-136`、`components/TitleBar.tsx:92-97`、`DocxEditor.tsx:169,361`（JSDoc/注释）。

**涉及文件（新增/命令）**

- 新增 `scripts/check-ui-color-tokens.mjs`：扫 `packages/react/src/**/*.{ts,tsx,css}`（排除 `*.test.*`/`*.spec.*`）→ 剥注释 → 忽略 `var(--x, #hex)` 兜底 → 命中 hex/rgb(a)/hsl(a) 即失败，支持同行或上一行 `color-token-ignore: <理由>`；输出 `file:line: value`，非零退出
- `package.json`：加 `"check:ui-colors"`，追加进 `check:parity` 链尾
- AGENTS.md（同 commit）：Pitfalls 增「chrome 颜色必须 token；新 token 只加 core；文档域值用 ignore 注释」

**验证命令**

```bash
node scripts/check-ui-color-tokens.mjs
bun run check:parity
bun run typecheck
npx playwright test e2e/tests/split-color-button.spec.ts e2e/tests/colors.spec.ts --timeout=30000 --workers=4
npx playwright test e2e/tests/comments-sidebar.spec.ts --timeout=30000 --workers=4
npx playwright test e2e/tests/image-resize-handles.spec.ts e2e/tests/image-layout-modes.spec.ts --timeout=30000 --workers=4
# 反例自检：临时加 '#123456' → 脚本必须失败；验完删除
```

**回滚**：`git revert`。

---

### 阶段 4：`useVisualLineNavigation` 委托 core（含 core body-scope 修复）

**目标**：删 React 335 行自实现，薄包装 core 264 行等价实现；**先修复 core 的 HF 误匹配缺陷**（已核实：core `getCaretClientX` L52-82 直接 `container.querySelectorAll('span[data-pm-start]')` 未限定 body；React 现实现用 `findBodyPmSpans` 限定 `.layout-page-content`，L17/L56）。

**涉及文件**

- `packages/core/src/prosemirror/utils/visualLineNavigation.ts`：`getCaretClientX` 改用 `findBodyPmSpans`（span 查询）与 body 限定（空行兜底 `.layout-empty-run` 同理）；签名不变（`@internal`，快照无漂移）
- 新增 `packages/core/src/prosemirror/utils/visualLineNavigation.test.ts`（happy-dom；参照 `layout-painter/__tests__` 的 `GlobalRegistrator` 模式）：body span 与 HF span 同 pm 区间时只命中 body；空行兜底同理
- `packages/react/src/hooks/useVisualLineNavigation.ts`：重写为薄包装——`useRef(createVisualLineState())` + `handleVisualLineKeyDown(...)`；**导出签名与 `hooks/index.ts:63-64` 公共面不变**：`useVisualLineNavigation({ pagesContainerRef }) → { handlePMKeyDown }`，`PagedEditor.tsx:41,364,842` 调用点无需改
- 新增 `e2e/tests/visual-line-navigation.spec.ts`：长段连按 ArrowDown/ArrowUp 列位保持（sticky X）、跨段落边界

**验证命令**

```bash
bun run typecheck
bun test packages/core/src/prosemirror/utils/visualLineNavigation.test.ts
npx playwright test e2e/tests/visual-line-navigation.spec.ts --timeout=30000 --workers=4
npx playwright test e2e/tests/paged-editor-clicks.spec.ts e2e/tests/formatting-persistence.spec.ts --timeout=30000 --workers=4
bun run check:parity
```

**回滚**：`git revert`（core 修复与 React 重写是可独立 revert 的两文件）。

---

### 阶段 5：图标规范化（React-only）

**目标**：AI ContextMenu 自定义描边图标 → `MaterialSymbol`；对话框关闭图标统一。
**已核实修正**：`&times;` 仅 5 处（`FindReplaceDialog.tsx:578`、`HyperlinkDialog.tsx:511`、`InsertImageDialog.tsx:544`、`InsertSymbolDialog.tsx:778`、`InsertTableDialog.tsx:444`）；另 2 处手写 X SVG（`KeyboardShortcutsDialog.tsx:298`、`PasteSpecialDialog.tsx:428`，裁决项③）；其余 7 个对话框无 header 关闭图标。统一 **7 个对话框**。

**涉及文件**

- `packages/react/src/components/ui/Icons.tsx`：新增官方 Material Symbol path + `iconMap`：`auto_awesome`、`open_in_full`、`subject`、`translate`、`help`、`spellcheck`、`article`、`sentiment_satisfied`、`edit`（`edit_note`/`close` 已存在）
- `components/ContextMenu.tsx:83-188` 十个本地图标 → `<MaterialSymbol name=… size={16}/>`，删本地 SVG
- 5 处 `&times;` + 2 处手写 X SVG → `<MaterialSymbol name="close" size={16}/>`
- AGENTS.md（同 commit）：Pitfalls 增「图标一律 `Icons.tsx` 的 `<MaterialSymbol>`；新增图标补官方 SVG path；emoji/字符不做图标」

**验证命令**

```bash
bun run typecheck
bun run check:parity
npx playwright test e2e/tests/find-replace-shortcuts.spec.ts e2e/tests/hyperlinks.spec.ts e2e/tests/help-menu.spec.ts --timeout=30000 --workers=4
npx playwright test e2e/tests/table-context-menu.spec.ts --timeout=30000 --workers=4
# 人工截图前后对比（screenshots/）确认 ContextMenu 字形可接受
```

**回滚**：`git revert`。

---

### 阶段 6：对话框 mousedown 焦点防护补齐 + e2e

**目标**：对话框面板 mousedown 不冒泡到隐藏 PM（防焦点/选区丢失）。
**已核实清单（14 个对话框，`packages/react/src/components/dialogs/`）**：有 `onMouseDown` 3 个（PageSetup:278、SplitCell:150、Watermark:256,260）；仅 `onClick` 守卫 4 个（FootnoteProperties:177、ImagePosition:236、ImageProperties:191、TableProperties:166）；完全缺失 7 个（PasteSpecial、FindReplace、Hyperlink、InsertImage、InsertSymbol、InsertTable、KeyboardShortcuts）。**需补 11 个**，模板取 `PageSetupDialog.tsx:277-278`。

**涉及文件**：11 个 `.tsx`；新增 `e2e/tests/dialog-focus.spec.ts`（对可经工具栏打开的 FindReplace/Hyperlink/InsertTable/KeyboardShortcuts/Watermark/PageSetup，断言面板 mousedown 后 PM 选区/焦点不丢）。

**验证命令**

```bash
bun run typecheck
npx playwright test e2e/tests/dialog-focus.spec.ts e2e/tests/cursor-focus.spec.ts --timeout=30000 --workers=4
npx playwright test e2e/tests/find-replace-shortcuts.spec.ts e2e/tests/hyperlinks.spec.ts e2e/tests/table-context-menu.spec.ts e2e/tests/help-menu.spec.ts --timeout=30000 --workers=4
```

**回滚**：`git revert`。

---

### 阶段 7：CI e2e smoke（chromium-only）

**目标**：主 CI 仍不跑全量，但补最小浏览器冒烟作业。
**涉及文件**：新增 `.github/workflows/e2e-smoke.yml`——`bun install --frozen-lockfile` + `npx playwright install --with-deps chromium` + `--project=chromium e2e/tests/{formatting,text-editing,comments-sidebar}.spec.ts`；dev server 由 Playwright webServer 拉起（config 已 React-only）；`timeout-minutes: 20`；浏览器安装写法参照 `perf-check.yml:52-53`。

**验证命令（本地等价）**

```bash
npx playwright test --project=chromium e2e/tests/formatting.spec.ts e2e/tests/text-editing.spec.ts e2e/tests/comments-sidebar.spec.ts --timeout=30000 --workers=4
```

**回滚**：删该文件即可。

---

## 三、风险与依赖

1. **上游同步策略**：fork 原地自维护、不合并上游（SELF-MAINTENANCE.md:3-5），删除 Vue 不增加同步成本。
2. **CI 绿线收敛**：`ci.yml`/`dependabot-lockfile.yml` 删 `check:parity-contract`；`release.yml` 删除；`.husky/pre-commit` 改提示语但命令名不变；`bun.lock` 必须随阶段 0 提交，否则 CI `--frozen-lockfile` 失败。
3. **docs/api 与 signatures**：仅删 `docs/api/docx-editor-vue/`；阶段 4 core 实现修改不改导出签名，`api:check` 应无漂移；`signatures/version1/cla.json` 保留。
4. **主仓库集成（`.lawyer/editor`）**：已核实其 `package.json` 仅依赖四包、`build.js` 无 vue 引用 → 删除不影响；阶段 2/3/4 改 core 后需重建 core dist 并 `node build.js` 重生成 bundle（附录 A5）。
5. **`.claude/` 与 openspec**：`.claude/skills`、`.github/skills`、`.github/prompts` 保留（opencode 亦加载 `.claude/skills`）；仅删 `openspec/changes/vue-editor-robust-implementation/`；OpenSpec 流程保留，如需冻结另立项。
6. **changesets 去留（裁决项①，默认删）**：release.yml 依赖 npm OIDC + org App secrets，fork 不可用；保留反而可能误触发发布。删 `.changeset/`、根脚本、`@changesets/*` devDeps、`docs/RELEASING.md`；AGENTS.md「发布」章替换为「Fork 私有分发」。若裁决保留：文件不动，仅从 AGENTS.md/命令链移除强制要求。
7. **agents 保留 Vue 的连带**：root devDeps `vue`/`@vitejs/plugin-vue`/`vue-eslint-parser`、eslint `.vue` 解析、agents `vue-tsc` typecheck 与 build 均不变。
8. **动效注入移除**：移除 `LoadingIndicator` 运行时注入后，独立使用 `react/ui` 且未引 core styles 的消费者会失去动画；fork 消费者始终引 `styles.css`，风险低；AGENTS.md 写明「库内动效依赖 core styles.css」。
9. **颜色近似替换的视觉差**：`#6c757d→--doc-text-muted(#5f6368)`、`#e9ecef→--doc-border-light(#dadce0)` 等为语义等价非像素等价；e2e + 人工抽查兜底；若要求像素级，改在 core 增专用 token。
10. **画布 token 禁止暗色覆写**：评论/修订高亮 token 作用于被 `filter` 反相的画布，在 `.ep-root.dark` 覆写会反相成错误颜色——写入 core 注释与门禁说明。
11. **阶段 4 core 修复是行为修正**：不修就委托将引入 HF 误匹配回归，故 core 修复为阶段 4 前置（非可选）。
12. **覆盖保全（裁决④：现在移植）**：删除 `e2e/tests/{vue,nuxt,parity}` 共 42 spec 前，先把 parity smoke 的 watermark/footnote 用例移植为 chromium spec（阶段 0 A0），确保覆盖不丢。
13. **图标字形变化**：ContextMenu 手绘 16px 描边换 MaterialSymbol 后字形/粗细会变，阶段 5 截图对比；不可接受则回退 ContextMenu 单项（关闭按钮保留替换）。
14. **测试成本**：定向 e2e 单阶段 <5 分钟；阶段 7 CI 作业约 10-15 分钟。

---

## 四、技能同步预案

1. **新建项目技能（`.opencode/skills/`）**
   - `docx-react-only-boundaries`（阶段 0 后）：React-only 边界（已删架构清单 + agents vue 例外）、四包构建链、定向单测/e2e 命令、主仓库 junction+build.js 重建循环。
   - `docx-ui-color-tokens`（阶段 3）：`--doc-*` 清单与新增流程（只加 core `editor.css`）、chrome 必须 token / 文档域值用 `color-token-ignore`、`check:ui-colors` + `check:parity` 跑法、画布 token 禁暗色覆写。
   - `docx-motion-and-icons`（阶段 2/5）：keyframes 必须落 core + reduced-motion 覆盖；图标走 `Icons.tsx` `<MaterialSymbol>`、缺图标补官方 path；emoji/字符禁作图标（配正面替代写法）。
2. **`.opencode/skills/INDEX.md`**：与三条技能双向一致（L1 检查）。
3. **AGENTS.md 成文遵循白熊三原则（禁令配正面替代）**：
   - 「不要内联颜色」→「chrome 颜色用 `--doc-*` token；新增 token 只加在 core `editor.css`；OOXML 默认值加 `color-token-ignore: <理由>`」
   - 「不要新写 keyframes」→「新动效 keyframes 定义在 core `editor.css`，并确认 reduced-motion 降级覆盖」
   - 「不要用 emoji/字符当图标」→「图标用 `<MaterialSymbol name="…">`，缺失时在 `Icons.tsx` 补官方 SVG path」
4. **全局提升评估**：`quality-baseline` 的通用条款（reduced-motion、UI 颜色门禁）待本项目稳定后再提升；本次留项目级。
5. **每阶段提交后**跑技能一致性检查（skills ↔ INDEX、职责重叠、指令冲突），并核对 AGENTS.md/SELF-MAINTENANCE.md 是否失真。

---

## 五、主进程复核记录（2026-09-24）

子代理计划经主进程独立抽查（每项给出核验依据）：

| #   | 复核项                                                                                                                            | 结果                                                                                                                    |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 1   | 目录名与保留项：`packages/nuxt`（非 nuxt-docx-editor）、`packages/agents/src/vue` 存在                                            | ✅ 与计划一致                                                                                                           |
| 2   | 删除规模：`packages/vue` 178 / `packages/nuxt` 8 / `examples/vue` 18 / `examples/nuxt` 9 tracked；e2e vue 29 / nuxt 1 / parity 12 | ✅ 与计划一致（git ls-files 实测）                                                                                      |
| 3   | `&times;` 实为 5 处而非 14 处                                                                                                     | ✅ 实测确认（FindReplace:578、Hyperlink:511、InsertImage:544、InsertSymbol:778、InsertTable:444）                       |
| 4   | core `getCaretClientX` body-scope 缺陷                                                                                            | ✅ 实测确认（core L53 全容器查询 vs React L17/L56 `findBodyPmSpans`），阶段 4 前置修复成立                              |
| 5   | e2e helpers/fixtures 与 vue/nuxt/parity 无耦合                                                                                    | ✅ rg 0 命中，删除不破坏共享 helper                                                                                     |
| 6   | `perf-check.yml` 仅用 `compare-baseline.mjs`                                                                                      | ✅ 实测；删除其余 perf 脚本安全                                                                                         |
| 7   | `AdapterSwitcher.tsx` 死代码                                                                                                      | ✅ 仅自引用，无 import                                                                                                  |
| 8   | 死选择器 `.docx-editor-vue__pages-viewport` 5 组（L287-319）                                                                      | ✅ 实测确认；另发现 `extractTrackedChanges.ts:12`、`suggestionMode/index.ts:88` 两处已删包名注释，已补入阶段 0 清理清单 |
| 9   | 发布链现状：`release.yml`、`.changeset/`、`vercel.json`、`docs/RELEASING.md` 存在                                                 | ✅（裁决项①）                                                                                                           |
| 10  | `.husky/pre-commit` 内容含 parity/openspec 提示，且 em-dash 已是乱码字符                                                          | ✅ 计划已注明：编辑时用 Edit 工具并 UTF-8 核对                                                                          |

小瑕疵修正（已直接写入本文件）：① 补 2 处误导注释；② husky 编码注意；③ 阶段 0 验证命令补 `bun run check:parity` 与四包构建；④ 阶段 1 拆分 1a/1b 并绑定裁决项②；⑤ 风险 12 的裁决项④引用、风险 14 表述修正。

**复核结论：通过（含修正）**。4 项裁决结果（2026-09-24）：

- ① 发布链（changesets/release.yml/vercel.json/RELEASING.md）：**删除**。
- ② `docs/site` 清扫范围：**全量清扫**（grep 归零）。
- ③ 2 处手写 X SVG：**一并换 MaterialSymbol**。
- ④ parity smoke 的 watermark/footnote 覆盖：**现在移植**（阶段 0 A0）。

---

## 附录：删除爆炸半径清单

### A1 删除清单

| 路径/组                                                                                                                                                                                                                                                         | 规模        | 依据（实测）                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------- |
| `packages/vue/`                                                                                                                                                                                                                                                 | 178 tracked | 用户决定                                             |
| `packages/nuxt/`                                                                                                                                                                                                                                                | 8           | 同上                                                 |
| `examples/vue/`、`examples/nuxt/`、`examples/parity/`                                                                                                                                                                                                           | 18/9/2      | 消费已删包                                           |
| `examples/shared/{AdapterSwitcher.tsx,ExampleSwitcher.vue,BrandLogo.vue}`                                                                                                                                                                                       | 3           | AdapterSwitcher 死代码实锤；后两者仅 examples/vue 用 |
| `e2e/tests/vue/`、`e2e/tests/nuxt/`、`e2e/tests/parity/`                                                                                                                                                                                                        | 29/1/12     | 对应 Playwright project                              |
| `docs/api/docx-editor-vue/`                                                                                                                                                                                                                                     | 6           | API 快照                                             |
| `docs/site/content/vue/`、`frameworks/nuxt.mdx`                                                                                                                                                                                                                 | 5/1         | 站点页                                               |
| `scripts/check-export-parity.mjs`、`check-editor-contract.mjs`、`check-feature-parity.mjs`、`check-parity-contract.mjs`、`check-consumer-install.mjs`、`parity-prepublish.mjs`、`scripts/parity/`、`scripts/lib/parity-report.mjs`、`scripts/extract-icons.mjs` | 9 组        | 均枚举 vue 包/产物，逐脚本读源码确认                 |
| `scripts/perf/{cold-start,input-latency,save,scroll-fps}.mjs` + `scripts/perf/lib/editor-perf.mjs`                                                                                                                                                              | 5           | 双适配器比值预算；`compare-baseline.mjs` 保留        |
| `openspec/changes/vue-editor-robust-implementation/`                                                                                                                                                                                                            | 21          | Vue 专项 change                                      |
| `.github/workflows/release.yml`、`.changeset/`、`docs/RELEASING.md`、`vercel.json`                                                                                                                                                                              | 4           | 裁决项①：fork 不发布/不部署                          |

### A2 修改清单

| 文件                                                                                                                                                                                                                                      | 修改点                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `package.json`                                                                                                                                                                                                                            | workspaces/scripts 收敛、`build:packages` 四包顺序、`check:parity` 新链、devDeps 去 `@changesets/*` |
| `playwright.config.ts`                                                                                                                                                                                                                    | chromium-only + react dev server                                                                    |
| `eslint.config.js`                                                                                                                                                                                                                        | 去 packages/vue 规则；保留 `.vue` 解析（agents）                                                    |
| `scripts/check-adapter-css-thin.mjs`、`check-public-docs-surface.mjs`、`lib/packages.mjs`                                                                                                                                                 | React-only 化                                                                                       |
| `.github/workflows/{ci.yml,dependabot-lockfile.yml}`、`.husky/pre-commit`                                                                                                                                                                 | 去 parity-contract 步骤/提示语（husky 顺带修乱码）                                                  |
| `examples/shared/config.ts`、`ExampleSwitcher.tsx`、`examples/dev-all.sh`                                                                                                                                                                 | 去 Vue 条目/端口                                                                                    |
| `docs/site/content/meta.json`、`frameworks/meta.json`                                                                                                                                                                                     | 去 vue/nuxt 条目                                                                                    |
| `packages/core/src/styles/editor.css`                                                                                                                                                                                                     | 删死选择器 L287-319                                                                                 |
| `packages/core/src/prosemirror/utils/extractTrackedChanges.ts:12`、`plugins/suggestionMode/index.ts:88`、`e2e/tests/issue-777*.spec.ts:4-5`、`issue-734*.spec.ts:7-8`、`packages/agents/src/bridge.ts`、`packages/core/tsup.config.ts:11` | 去已删包/change 的误导注释                                                                          |
| `bun.lock`、`.gitignore`                                                                                                                                                                                                                  | 重生成 lock；去 examples/vue 行                                                                     |

### A3 scripts 逐个判定

| 脚本                                                                                                                                                                                                                                                                                                          | 判定               | 理由                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | --------------------------- |
| `check-adapter-css-thin.mjs`                                                                                                                                                                                                                                                                                  | 改造（React-only） | core 单一来源不变量仍有效   |
| `check-public-docs-surface.mjs`                                                                                                                                                                                                                                                                               | 改造               | React/agents surface 仍需守 |
| `check-ui-color-tokens.mjs`                                                                                                                                                                                                                                                                                   | 新增（阶段 3）     | 新门禁                      |
| `check-i18n-bundle-size.mjs`、`build-docs-json.mjs` + `lib/docs-model.mjs`、`validate-i18n.mjs` + `lib/i18n-keys.mjs`、`inject-package-doc.mjs`、`lib/named-exports.mjs`、`lib/source-index.mjs`、`perf/compare-baseline.mjs`、`fetch-reference.mjs`、`make-*.mjs`、`create-*.mjs`、`generate-large-doc-*.ts` | 保留               | 与 vue 无依赖（逐脚本确认） |
| `check-export-parity`、`check-editor-contract`、`check-feature-parity`、`check-parity-contract` + `scripts/parity/`、`check-consumer-install`、`parity-prepublish`、`extract-icons`、`perf/{cold-start,input-latency,save,scroll-fps}` + `perf/lib/editor-perf`、`lib/parity-report`                          | 删除               | 见 A1                       |

### A4 保留的 Vue 残留（有意）

| 项                                                                              | 理由                        |
| ------------------------------------------------------------------------------- | --------------------------- |
| `packages/agents/src/vue/**`、`vue.ts`、`ai-sdk/vue.ts`、agents vite/tsup 配置  | 用户决定保留 agents Vue UI  |
| `docs/api/docx-editor-agents/{vue,ai-sdk-vue}.api.md`                           | 对应能力仍在                |
| root devDeps `vue`/`@vitejs/plugin-vue`/`vue-eslint-parser`、eslint `.vue` 解析 | agents 构建/类型/ lint 需要 |
| `packages/*/CHANGELOG.md`、`openspec/changes/archive/**`                        | 历史记录                    |
| `signatures/version1/cla.json`                                                  | 无架构依赖                  |

### A5 主仓库（`.lawyer/editor`）合并后验证清单

1. `npm install` 确认 junction 仅解析四个 `@eigenpal/*` 包。
2. 按 `i18n → core → agents → react` 重建四包，确认 dist 生成。
3. `node build.js` 生成 `editor.bundle.js/css + docx-editor.bundle.css`，记录体积对比。
4. 主应用冒烟：打开 docx → 编辑/保存 → 修订与评论 → HF 编辑 → 打印。
5. 阶段 2/3/4 合并后重点核对：加载动画、正文/HF 光标、图片选框、评论/修订高亮（含暗色模式）、视觉换行上下移动。
6. 主仓库提交 bundles + gitlink SHA 提升。

### A6 行号与命令的实测说明

本计划全部行号/文件/命令由子代理 + 主进程两轮实测（`git ls-files`、`rg`、`Get-Content`、`Test-Path`），与早期版本不一致处均已修正并标注。执行时如某行号漂移，以 `rg` 现场定位为准，不改变阶段结构。
