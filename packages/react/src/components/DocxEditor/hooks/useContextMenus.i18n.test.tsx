import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { afterAll, beforeAll } from 'bun:test';

beforeAll(() => GlobalRegistrator.register());
afterAll(() => GlobalRegistrator.unregister());

import { afterEach, describe, expect, test } from 'bun:test';
import { cleanup, render } from '@testing-library/react';
import { useRef } from 'react';
import { zhCN, type Translations } from '@eigenpal/docx-editor-i18n';
import { useContextMenus } from './useContextMenus';
import type { TextContextMenuItem } from '../../TextContextMenu';

function Harness({
  i18n,
  onItems,
}: {
  i18n?: Translations;
  onItems: (items: TextContextMenuItem[]) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { contextMenuItems } = useContextMenus({
    getActiveEditorView: () => null,
    focusActiveEditor: () => {},
    openSplitCellDialog: () => {},
    scrollContainerRef: scrollRef,
    editorContentRef: contentRef,
    i18n,
    onAddComment: () => {},
  });
  onItems(contextMenuItems);
  return (
    <div ref={scrollRef}>
      <div ref={contentRef} />
    </div>
  );
}

afterEach(() => {
  cleanup();
});

describe('useContextMenus i18n labels', () => {
  // Regression: the hook runs in DocxEditor's body, which is OUTSIDE the
  // internal <LocaleProvider> — `useTranslation()` there always reads the
  // English default. Labels must come from the `i18n` prop instead.
  test('labels follow the i18n prop', () => {
    let items: TextContextMenuItem[] = [];
    render(<Harness i18n={zhCN} onItems={(v) => (items = v)} />);
    const labels = items.map((i) => i.label);
    expect(labels).toContain('剪切');
    expect(labels).toContain('复制');
    expect(labels).toContain('粘贴');
    expect(labels).toContain('全选');
    expect(labels).not.toContain('Cut');
  });

  test('falls back to English without an i18n prop', () => {
    let items: TextContextMenuItem[] = [];
    render(<Harness onItems={(v) => (items = v)} />);
    expect(items.map((i) => i.label)).toContain('Cut');
  });
});
