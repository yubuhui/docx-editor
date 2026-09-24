# 项目技能索引（`.opencode/skills/`）

> 双向一致：本文件每条对应一个 `{name}/SKILL.md`，新增/删除技能时同步此表。

| Skill                   | 用途                                                                                                                                                                           | 触发词                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `docx-ui-color-tokens`  | DOCX 编辑器 chrome 颜色必须走 `--doc-*` token：新增 token 只加 core `editor.css`、文档域值用 `color-token-ignore`、`check:ui-colors` 门禁与豁免写法、画布 token 禁暗色覆写。   | 颜色, 颜色 token, --doc, check:ui-colors, 硬编码颜色, color-token-ignore, 深色模式, 画布高亮, 图片选框颜色 |
| `docx-motion-and-icons` | DOCX 编辑器动效与图标规范：keyframes 只落 core `editor.css` 并同步 reduced-motion 降级；UI 图标一律 `Icons.tsx` 的 `<MaterialSymbol>`，缺图标补官方 path，emoji/字符禁作图标。 | 动效, keyframes, reduced-motion, 图标, MaterialSymbol, Icons.tsx, iconMap, emoji 图标, 关闭按钮            |
