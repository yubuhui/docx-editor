import { useEffect } from 'react';
import {
  getHyperlinkAttrs,
  getSelectedText,
  getTableContext,
  deleteTable as pmDeleteTable,
} from '@eigenpal/docx-editor-core/prosemirror';
import type { useTableSelection } from '../../../hooks/useTableSelection';
import type { useFindReplace } from '../../../hooks/useFindReplace';
import type { useHyperlinkDialog } from '../../dialogs/HyperlinkDialog';
import type { PagedEditorRef } from '../PagedEditor';
import type { FormattingAction } from '../../Toolbar';

/**
 * Top-level keyboard shortcuts:
 *  - Cmd/Ctrl+O → open the DOCX picker when File > Open is enabled
 *  - Cmd/Ctrl+F → open Find dialog (seeded with current selection)
 *  - Cmd/Ctrl+H → open Find/Replace dialog
 *  - Cmd/Ctrl+K → open Hyperlink dialog (edit if cursor sits on a link)
 *  - Ctrl+Shift+C → copy formatting (format painter)
 *  - Ctrl+Shift+V → paste formatting (format painter)
 *  - Delete/Backspace on a full-table layout selection → delete the table
 *
 * Format painter shortcuts use capture-phase listeners on `window` so they
 * fire before the browser interprets Ctrl+Shift+C (Chrome DevTools).
 * Remaining shortcuts listen on `document` at bubble phase — standard.
 */
export function useKeyboardShortcuts({
  pagedEditorRef,
  disableFindReplaceShortcuts,
  showFileOpen,
  onOpenDocument,
  findReplace,
  hyperlinkDialog,
  tableSelection,
  onFormat,
}: {
  pagedEditorRef: React.RefObject<PagedEditorRef | null>;
  disableFindReplaceShortcuts: boolean;
  showFileOpen: boolean;
  onOpenDocument?: () => void;
  findReplace: ReturnType<typeof useFindReplace>;
  hyperlinkDialog: ReturnType<typeof useHyperlinkDialog>;
  tableSelection: ReturnType<typeof useTableSelection>;
  onFormat?: React.MutableRefObject<((action: FormattingAction) => void) | undefined>;
}) {
  // ── Format painter shortcuts (capture phase on window) ──────────────
  // Must be on window with capture=true so we beat the browser's built-in
  // Ctrl+Shift+C handler (Chrome DevTools element selector).
  useEffect(() => {
    const handleCaptureKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl || !e.shiftKey || e.altKey) return;

      if (e.code === 'KeyC') {
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();
        onFormat?.current?.('formatPainterCopy');
      } else if (e.code === 'KeyV') {
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();
        onFormat?.current?.('formatPainterPaste');
      }
    };

    // Also swallow keyup to prevent Chrome's shortcut from firing on keyup
    const handleCaptureKeyUp = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl || !e.shiftKey || e.altKey) return;
      if (e.code === 'KeyC' || e.code === 'KeyV') {
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();
      }
    };

    window.addEventListener('keydown', handleCaptureKeyDown, { capture: true });
    window.addEventListener('keyup', handleCaptureKeyUp, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleCaptureKeyDown, { capture: true });
      window.removeEventListener('keyup', handleCaptureKeyUp, { capture: true });
    };
  }, [onFormat]);

  // ── General editor shortcuts (bubble phase on document) ─────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Delete a layout-selected table (the non-ProseMirror selection in the
      // pages overlay) or a full ProseMirror CellSelection covering all cells.
      if (!cmdOrCtrl && !e.shiftKey && !e.altKey) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          const view = pagedEditorRef.current?.getView();
          if (view) {
            const sel = view.state.selection as { $anchorCell?: unknown; forEachCell?: unknown };
            const isCellSel = '$anchorCell' in sel && typeof sel.forEachCell === 'function';
            if (isCellSel) {
              const context = getTableContext(view.state);
              if (context.isInTable && context.table) {
                let totalCells = 0;
                context.table.descendants((node) => {
                  if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
                    totalCells += 1;
                  }
                });
                let selectedCells = 0;
                (sel as { forEachCell: (fn: () => void) => void }).forEachCell(() => {
                  selectedCells += 1;
                });
                if (totalCells > 0 && selectedCells >= totalCells) {
                  e.preventDefault();
                  pmDeleteTable(view.state, view.dispatch);
                  return;
                }
              }
            }
          }

          if (tableSelection.state.tableIndex !== null) {
            e.preventDefault();
            tableSelection.handleAction('deleteTable');
            return;
          }
        }
      }

      if (cmdOrCtrl && !e.shiftKey && !e.altKey) {
        if (e.key.toLowerCase() === 'f') {
          if (disableFindReplaceShortcuts) return;
          e.preventDefault();
          const selection = window.getSelection();
          const selectedText = selection && !selection.isCollapsed ? selection.toString() : '';
          findReplace.openFind(selectedText);
        } else if (e.key.toLowerCase() === 'o') {
          if (!showFileOpen || !onOpenDocument) return;
          e.preventDefault();
          onOpenDocument();
        } else if (e.key.toLowerCase() === 'h') {
          if (disableFindReplaceShortcuts) return;
          e.preventDefault();
          const selection = window.getSelection();
          const selectedText = selection && !selection.isCollapsed ? selection.toString() : '';
          findReplace.openReplace(selectedText);
        } else if (e.key.toLowerCase() === 'k') {
          e.preventDefault();
          const view = pagedEditorRef.current?.getView();
          if (view) {
            const selectedText = getSelectedText(view.state);
            const existingLink = getHyperlinkAttrs(view.state);
            if (existingLink) {
              hyperlinkDialog.openEdit({
                url: existingLink.href,
                displayText: selectedText,
                tooltip: existingLink.tooltip,
              });
            } else {
              hyperlinkDialog.openInsert(selectedText);
            }
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    pagedEditorRef,
    disableFindReplaceShortcuts,
    showFileOpen,
    onOpenDocument,
    findReplace,
    hyperlinkDialog,
    tableSelection,
  ]);
}
