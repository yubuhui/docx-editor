---
name: docx-dialog-focus-guards
description: 'DOCX 编辑器对话框 mousedown 焦点防护：面板根元素加 onMouseDown stopPropagation（overlay 不加，保持点击遮罩关闭）；对应 e2e 用 document mousedown 计数 + agentSelection 快照断言。Triggers: 对话框, mousedown, stopPropagation, 焦点丢失, 选区丢失, dialog-focus, focus guard, 面板 mousedown, 冒泡, caret 被抢'
---

# 对话框 mousedown 焦点防护

<role>改 `packages/react/src/components/dialogs/**` 或写编辑器焦点/选区 e2e 时按本技能执行。</role>

## 统一模式（14 个对话框）

- **面板**根元素加 `onMouseDown={(e) => e.stopPropagation()}`；模板是 `PageSetupDialog.tsx` 的 dialog div。
- **overlay 只保留 `onClick` 关闭**，不要加 mousedown 守卫——守卫会吞掉 document 级 mousedown，破坏其它「点击外部关闭」UI，也改变遮罩点击语义。
- 特例：`PasteSpecialDialog` / `KeyboardShortcutsDialog` 根元素本身就是面板（无 overlay），守卫加在根 div；它们的「点击外部关闭」是 document 监听 + `contains` 判断，不受影响。
- `WatermarkDialog` 是参考实现：overlay + panel 两处都有守卫。
- 面板与 overlay 的区分：面板是包含标题/内容/按钮的容器；`role="dialog"` 在 Watermark/PageSetup 等面板上，但 FindReplace/Hyperlink 等把它挂在 overlay 上，别按 role 找。

## 机制

React 18 在 root 容器代理事件；synthetic `stopPropagation()` 会调用原生 `stopPropagation()`，因此面板内的 mousedown 不会到达 document 级监听——编辑器的全局 caret/focus 处理器由此被隔离。

## e2e 断言模式（`e2e/tests/dialog-focus.spec.ts`）

1. 选区准备：`gotoEmpty()` → `focus()` → `typeText(...)` → `selectAll()`；用 `window.__DOCX_EDITOR_E2E__.agentSelection()` 轮询确认 PM state 选区已建立。
2. 面板 mousedown 前挂 document mousedown 计数器；`page.mouse.down()` 面板左上非交互区（`box.x + 16, box.y + 12`）后断言计数**不增长**——守卫缺位时此断言失败，这是能反证修复的稳定信号。
3. 同时断言 `agentSelection()` 快照（`selectedText`/`before`/`after`）前后一致 + 面板仍可见（面板 mousedown 不能关掉对话框）。
4. 遮罩关闭回归：modal（PageSetup/Hyperlink/Watermark）点 `(10,10)` 断言面板卸载。`FindReplaceDialog` 的 overlay 是 `pointerEvents:none` 的非模态浮层，没有「点遮罩关闭」，别测。

## 踩坑

- **PM 在 `left:-9999px`**：Playwright `.click()` 报 outside viewport；用 `locator.evaluate((el) => el.focus())` 或 `EditorPage.focus()`。
- **FindReplace / Hyperlink 打开约 100ms 后自动聚焦输入框**：打开后不要断言 PM 仍聚焦；Watermark / PageSetup 不自动聚焦，可断言 PM 聚焦保持。
- **真实 mousedown 会把焦点移到 body**（浏览器默认行为，stopPropagation 不阻止）：断言对象是 PM **state** 选区与全局事件泄漏，不要断言 `document.activeElement` 仍是 PM。
- **菜单入口名**：File → `Page setup`（小写 s）、Insert → `Watermark`；用 `page.getByTestId('title-bar')` 限定菜单按钮，避免与对话框内按钮重名。

## 关键命令

- 定向验证：`bunx playwright test e2e/tests/dialog-focus.spec.ts --project=chromium --timeout=30000 --workers=1`
- 反证守卫有效性：`git stash push -- packages/react/src/components/dialogs` → 跑上命令（find/replace、hyperlink 两例应失败）→ `git stash pop`。
