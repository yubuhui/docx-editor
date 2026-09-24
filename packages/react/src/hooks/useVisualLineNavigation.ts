/**
 * Visual Line Navigation Hook
 *
 * Thin React binding over the framework-agnostic visual-line navigation
 * helpers in core. The hook owns the persistent sticky-X state as refs (its
 * historical public shape) and delegates the algorithm to
 * `@eigenpal/docx-editor-core/prosemirror/utils/visualLineNavigation`.
 */

import { useCallback, useRef } from 'react';
import type { EditorView } from 'prosemirror-view';
import {
  createVisualLineState,
  findLineElementAtPosition as coreFindLineElementAtPosition,
  findPositionOnLineAtClientX as coreFindPositionOnLineAtClientX,
  getCaretClientX as coreGetCaretClientX,
  handleVisualLineKeyDown,
} from '@eigenpal/docx-editor-core/prosemirror/utils/visualLineNavigation';

export interface VisualLineNavigationOptions {
  pagesContainerRef: React.RefObject<HTMLDivElement | null>;
}

export function useVisualLineNavigation({ pagesContainerRef }: VisualLineNavigationOptions) {
  const stickyXRef = useRef<number | null>(null);
  const lastVisualLineIndexRef = useRef<number>(-1);

  const getCaretClientX = useCallback(
    (pmPos: number): number | null => {
      const container = pagesContainerRef.current;
      return container ? coreGetCaretClientX(container, pmPos) : null;
    },
    [pagesContainerRef]
  );

  const findLineElementAtPosition = useCallback(
    (pmPos: number): HTMLElement | null => {
      const container = pagesContainerRef.current;
      return container ? coreFindLineElementAtPosition(container, pmPos) : null;
    },
    [pagesContainerRef]
  );

  const findPositionOnLineAtClientX = useCallback(
    (lineEl: HTMLElement, clientX: number): number | null =>
      coreFindPositionOnLineAtClientX(lineEl, clientX),
    []
  );

  const handlePMKeyDown = useCallback(
    (view: EditorView, event: KeyboardEvent): boolean => {
      // The refs stay the persistent storage: seed a fresh core state carrier
      // from them per key event and write the result back so consecutive
      // ArrowUp/ArrowDown presses keep one sticky X.
      const state = createVisualLineState();
      state.stickyX = stickyXRef.current;
      state.lastVisualLineIndex = lastVisualLineIndexRef.current;
      const handled = handleVisualLineKeyDown(state, view, event, pagesContainerRef.current);
      stickyXRef.current = state.stickyX;
      lastVisualLineIndexRef.current = state.lastVisualLineIndex;
      return handled;
    },
    [pagesContainerRef]
  );

  return {
    stickyXRef,
    lastVisualLineIndexRef,
    getCaretClientX,
    findLineElementAtPosition,
    findPositionOnLineAtClientX,
    handlePMKeyDown,
  };
}
