# 项目技能索引（`.opencode/skills/`）

> 双向一致：本文件每条对应一个 `{name}/SKILL.md`，新增/删除技能时同步此表。

| Skill                        | 用途                                                                                                                                                                           | 触发词                                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `docx-ui-color-tokens`       | DOCX 编辑器 chrome 颜色必须走 `--doc-*` token：新增 token 只加 core `editor.css`、文档域值用 `color-token-ignore`、`check:ui-colors` 门禁与豁免写法、画布 token 禁暗色覆写。   | 颜色, 颜色 token, --doc, check:ui-colors, 硬编码颜色, color-token-ignore, 深色模式, 画布高亮, 图片选框颜色  |
| `docx-motion-and-icons`      | DOCX 编辑器动效与图标规范：keyframes 只落 core `editor.css` 并同步 reduced-motion 降级；UI 图标一律 `Icons.tsx` 的 `<MaterialSymbol>`，缺图标补官方 path，emoji/字符禁作图标。 | 动效, keyframes, reduced-motion, 图标, MaterialSymbol, Icons.tsx, iconMap, emoji 图标, 关闭按钮             |
| `docx-dialog-focus-guards`   | DOCX 编辑器对话框 mousedown 焦点防护：面板根元素加 stopPropagation、overlay 不加；e2e 用 document mousedown 计数 + agentSelection 快照断言，含反证命令。                       | 对话框, mousedown, stopPropagation, 焦点丢失, 选区丢失, dialog-focus, focus guard, 面板 mousedown, 冒泡     |
| `docx-react-only-boundaries` | fork 的 React-only 边界与工作流：已删架构清单/agents Vue 例外、四包构建链、bunx e2e 命令与浏览器镜像、主仓库 junction+build.js 重建循环、分支与验收命令。                      | React-only, 架构边界, 四包构建, build:packages, 主仓库重建, junction, build.js, bunx playwright, 浏览器镜像 |
