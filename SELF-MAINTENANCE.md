# SELF-MAINTENANCE 自维护指南

> 本仓库是律师助手（D:\Ai_Project\lawyer_assistant）内嵌 DOCX 编辑器的 **fork 自维护线**。
> 上游 eigenpal/docx-editor 已改名 `@docx-editor.dev/*` 并升至 2.x（修订/评论挪进商业 pro 包）。
> 本项目决定**留在 1.9.0 自维护**：修订在 free core，源码已 vendored，可自由修改、私有化、随离线安装包分发。

## 仓库定位与 gitlink 说明

- 本仓库以 **gitlink（伪 submodule，mode 160000）** 挂载在主仓库 `.lawyer/docx-editor-src`，**无 `.gitmodules`**。
- 主仓库的提交记录只保存本仓库的 HEAD SHA；**本仓库目录本身不在主仓库内做版本控制**（本目录有独立 `.git`）。
- 主仓库全新 clone 后，`.lawyer/docx-editor-src` 是**空目录**，需手动恢复：

```powershell
# 从主仓库根目录执行
git clone git@github.com:chitwitgit/docx-editor.git .lawyer/docx-editor-src
# checkout 到主仓库记录的 SHA（git ls-files -s .lawyer/docx-editor-src 的第三个字段）
git -C .lawyer/docx-editor-src checkout <主仓库记录的SHA>
```

恢复后需在 `.lawyer/editor` 重建四个包的 junction + dist：

```powershell
cd .lawyer/editor
npm install   # 重建 @eigenpal/* 的 file: junction
# 若 dist 缺失，见下方「重建包」
```

## 重建循环（改源码 → 双仓提交的固定工作流）

改 fork 的 `packages/*/src` 后，**必须依次执行**：

```
1. 重建四个包（依赖顺序：i18n → core → agents → react）：
   cd .lawyer/docx-editor-src
   bun install   # 首次或依赖变动时
   bun run --filter @eigenpal/docx-editor-i18n build
   bun run --filter @eigenpal/docx-editor-core build
   bun run --filter @eigenpal/docx-editor-agents build
   bun run --filter @eigenpal/docx-editor-react build
   （产物 dist/ 被本仓库 gitignore，不入库；editor 经 junction + dist 解析源码）

2. 重建 editor bundle（主仓库）：
   cd ..\editor
   node build.js   # 重新生成 editor.bundle.js/css + docx-editor.bundle.css（主仓库入库）

3. 验证：单测（bun test）/ headless 冒烟

4. 双仓各一个 commit：
   - fork：只提交 src 改动（git add packages/...，dist 不入库）
   - 主仓库：提交 bundles + gitlink SHA 提升（git add .lawyer/docx-editor-src 记录新 SHA）
```

> 不要用 root `bun run build:packages`（会连 vue/nuxt 一起建，慢且可能因缺依赖失败）。
> 纯 host 改动（`docx-editor-host.jsx`/`editor-router.jsx`/`editor.css`）只需 `node build.js`，无需重建 fork 包。

## 分支与提交规范

- 本仓库 `main` 保持为可回滚基线。
- 每轮修复开短命分支 `fix/<中文保真项>`，单 commit 后合回 `main`。
- 提交信息沿用现有风格（`fix: ...` + 动机/影响文件摘要）。
- 合回 main 后推远程建立基线：`git push origin main`。

## 自维护红线

- **`.ep-root` 前缀不得迁移**：主仓库 host（`docx-editor-host.jsx` 隐藏样式选择器、右键菜单替换）与 `editor.css` 大量 `.ep-*` 覆写依赖 1.x 类名。任何 DOM 结构调整须保持 `.ep-root`，勿引入 2.x 的 `.docx-editor` 命名。
- **修订/评论能力留在 free core**：这是留在 1.x 的核心原因，改动不得把 revisions/comments 逻辑搬到商业依赖。
- **dist 不提交**：`packages/*/dist` 在本仓库 gitignore，提交只含 src。

## 何时考虑升级上游 2.x

见主仓库计划 `opencode/plans/docx-editor-self-maintenance-20260917.md` 阶段 F 的触发条件（授权成本/框架风险/安全合规/能力缺口）。

## 测试

- 定向单测：`bun test packages/core/src/<相关目录>/__tests__/<用例>.test.ts`
- 全量 e2e（500+）只在最终验证时跑，日常用定向 spec：
  `npx playwright test --grep "<pattern>" --timeout=30000 --workers=4`