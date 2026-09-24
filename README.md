> **自维护 fork（React-only）** — 基于上游 `@eigenpal/docx-editor` 1.9.0 的律师助手内嵌编辑器分支。上游项目 2026-06 停止维护、2.x 将修订/评论移入商业包；本 fork 保留 1.9.0 free core 自行维护，并已将架构裁剪为 React-only（Vue/Nuxt 包与 parity/发布工具链移除；`packages/agents` 内的 Vue UI 保留）。构建链、双仓提交与红线见 [SELF-MAINTENANCE.md](SELF-MAINTENANCE.md)。Apache-2.0。

---

<p align="center">
  <a href="https://www.docx-editor.dev/">
    <img src="./.github/assets/header.png" alt="DOCX Editor — .docx in, .docx out. Open source, agent ready, client-side." width="500" />
  </a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@eigenpal/docx-editor-core"><img src="https://img.shields.io/npm/v/@eigenpal/docx-editor-core.svg?style=flat-square&color=3B5BDB" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@eigenpal/docx-js-editor"><img src="https://img.shields.io/npm/dm/@eigenpal/docx-js-editor.svg?style=flat-square&color=3B5BDB" alt="npm downloads" /></a>
  <a href="https://github.com/eigenpal/docx-editor/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache_2.0-blue.svg?style=flat-square&color=3B5BDB" alt="license" /></a>
  <a href="https://docx-editor.dev/editor"><img src="https://img.shields.io/badge/Live_Demo-3B5BDB?style=flat-square&logo=vercel&logoColor=white" alt="Demo" /></a>
  <a href="https://www.docx-editor.dev/docs"><img src="https://img.shields.io/badge/Docs-3B5BDB?style=flat-square&logo=readthedocs&logoColor=white" alt="Documentation" /></a>
</p>

Open-source WYSIWYG `.docx` editor for React with canonical OOXML, tracked changes, and real-time collaboration. Agent-ready. **[Documentation](https://www.docx-editor.dev/docs)**

## Quick Start

```bash
npm install @eigenpal/docx-editor-react
```

See the [React quick start](#react) below.

<p align="center">
  <a href="https://docx-editor.dev/editor">
    <img src="./.github/assets/editor.png" alt="docx-editor screenshot" width="100%" />
  </a>
</p>

## Packages

| Package                                                                                      | Description                                                                                                                            | Docs                                                |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| [`@eigenpal/docx-editor-react`](https://www.npmjs.com/package/@eigenpal/docx-editor-react)   | <img src="https://cdn.simpleicons.org/react/61DAFB" width="20" align="middle" /> &nbsp; React adapter. Toolbar, paged editor, plugins. | [Docs](https://www.docx-editor.dev/docs/1.x/react)  |
| [`@eigenpal/docx-editor-core`](https://www.npmjs.com/package/@eigenpal/docx-editor-core)     | Framework-agnostic core: OOXML parser, serializer, layout engine, ProseMirror schema. Depend on this if you fork the React adapter.    | [Docs](https://www.docx-editor.dev/docs/1.x/core)   |
| [`@eigenpal/docx-editor-i18n`](https://www.npmjs.com/package/@eigenpal/docx-editor-i18n)     | Shared locale strings and types consumed by the React adapter.                                                                         | [Docs](https://www.docx-editor.dev/docs/1.x/i18n)   |
| [`@eigenpal/docx-editor-agents`](https://www.npmjs.com/package/@eigenpal/docx-editor-agents) | Agent SDK and chat UI: framework-agnostic bridge, MCP server, AI SDK adapters, plus UI components.                                     | [Docs](https://www.docx-editor.dev/docs/1.x/agents) |

> **Forking the adapter?** Keep your fork thin. Depend on `@eigenpal/docx-editor-core` directly so parser, serializer, and rendering fixes land in your build automatically, without backporting each upstream change by hand.

## React

```tsx
import { useState } from 'react';
import { DocxEditor } from '@eigenpal/docx-editor-react';
import '@eigenpal/docx-editor-react/styles.css';

export function App() {
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);

  return (
    <>
      <input
        type="file"
        accept=".docx"
        onChange={async (e) => setBuffer((await e.target.files?.[0]?.arrayBuffer()) ?? null)}
      />
      {buffer && <DocxEditor documentBuffer={buffer} mode="editing" />}
    </>
  );
}
```

> **Next.js / SSR:** Use dynamic import. The editor requires the DOM.

Full docs: [`packages/react`](packages/react) · [API reference](https://www.docx-editor.dev/docs/props).

## Plugins

```tsx
import { DocxEditor } from '@eigenpal/docx-editor-react';
import { PluginHost, templatePlugin } from '@eigenpal/docx-editor-react/plugin-api';

<PluginHost plugins={[templatePlugin]}>
  <DocxEditor documentBuffer={buffer} />
</PluginHost>;
```

See the [plugin documentation](https://www.docx-editor.dev/docs/plugins) for the full plugin API.

## Development

```bash
bun install
bun run dev        # localhost:5173
bun run build
bun run typecheck
```

本 fork 的重建与双仓提交流程见 [SELF-MAINTENANCE.md](SELF-MAINTENANCE.md)。

Examples: [Vite](examples/vite) | [Next.js](examples/nextjs) | [Remix](examples/remix) | [Astro](examples/astro)

**[Documentation](https://www.docx-editor.dev/docs)** | **[Props & Ref Methods](https://www.docx-editor.dev/docs/props)** | **[Plugins](https://www.docx-editor.dev/docs/plugins)** | **[Architecture](https://www.docx-editor.dev/docs/architecture)**

## Contributing

Contributions welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, tests, and the one-time CLA signature.

## Translations

| Locale  | Language             |
| ------- | -------------------- |
| `en`    | English              |
| `de`    | German               |
| `fr`    | French               |
| `he`    | Hebrew               |
| `hi`    | Hindi                |
| `pl`    | Polish               |
| `pt-BR` | Portuguese (Brazil)  |
| `tr`    | Turkish              |
| `zh-CN` | Chinese (Simplified) |

Help translate the editor into your language! See the full **[i18n contribution guide](docs/i18n.md)**.

```bash
bun run i18n:new de      # scaffold German locale
bun run i18n:status      # check translation coverage
```
