/**
 * Context Menu Component
 *
 * Right-click context menu for AI actions on selected text.
 * Shows AI options like rewrite, expand, summarize, translate, etc.
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import type { AIAction, SelectionContext } from '@eigenpal/docx-editor-core/types/agentApi';
import {
  getActionDescription,
  DEFAULT_AI_ACTIONS,
} from '@eigenpal/docx-editor-core/types/agentApi';
import { useTranslation } from '../i18n';
import type { TranslationKey } from '@eigenpal/docx-editor-i18n';
import { Z_INDEX } from '../styles/zIndex';
import { MaterialSymbol } from './ui/Icons';

const AI_ACTION_KEY_MAP: Record<AIAction, TranslationKey> = {
  askAI: 'contextMenu.aiActions.askAi',
  rewrite: 'contextMenu.aiActions.rewrite',
  expand: 'contextMenu.aiActions.expand',
  summarize: 'contextMenu.aiActions.summarize',
  translate: 'contextMenu.aiActions.translate',
  explain: 'contextMenu.aiActions.explain',
  fixGrammar: 'contextMenu.aiActions.fixGrammar',
  makeFormal: 'contextMenu.aiActions.makeFormal',
  makeCasual: 'contextMenu.aiActions.makeCasual',
  custom: 'contextMenu.aiActions.custom',
};

// ============================================================================
// TYPES
// ============================================================================

/**
 * Context menu props
 */
export interface ContextMenuProps {
  /** Whether the menu is visible */
  isOpen: boolean;
  /** Menu position */
  position: { x: number; y: number };
  /** Selected text */
  selectedText: string;
  /** Selection context for AI operations */
  selectionContext?: SelectionContext;
  /** Callback when an action is selected */
  onAction: (action: AIAction, customPrompt?: string) => void;
  /** Callback when menu is closed */
  onClose: () => void;
  /** Available actions (defaults to DEFAULT_AI_ACTIONS) */
  actions?: AIAction[];
  /** Whether to show custom prompt option */
  showCustomPrompt?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * Context menu item props
 */
interface MenuItemProps {
  action: AIAction;
  onClick: () => void;
  isHighlighted: boolean;
  onMouseEnter: () => void;
}

/**
 * Custom prompt dialog props
 */
interface CustomPromptDialogProps {
  isOpen: boolean;
  onSubmit: (prompt: string) => void;
  onClose: () => void;
  selectedText: string;
}

// ============================================================================
// ICONS
// ============================================================================

/** Material Symbol name per AI action (official paths live in ui/Icons.tsx). */
const ACTION_ICON_NAMES: Record<AIAction, string> = {
  askAI: 'auto_awesome',
  rewrite: 'edit',
  expand: 'open_in_full',
  summarize: 'subject',
  translate: 'translate',
  explain: 'help',
  fixGrammar: 'spellcheck',
  makeFormal: 'article',
  makeCasual: 'sentiment_satisfied',
  custom: 'edit_note',
};

/**
 * Get icon for an action
 */
function getActionIcon(action: AIAction): React.ReactNode {
  return <MaterialSymbol name={ACTION_ICON_NAMES[action]} size={16} />;
}

// ============================================================================
// MENU ITEM COMPONENT
// ============================================================================

const MenuItem: React.FC<MenuItemProps> = ({ action, onClick, isHighlighted, onMouseEnter }) => {
  const { t } = useTranslation();
  const label = t(AI_ACTION_KEY_MAP[action]);
  const description = getActionDescription(action);
  const icon = getActionIcon(action);

  return (
    <button
      type="button"
      className={`docx-context-menu-item ${isHighlighted ? 'docx-context-menu-item-highlighted' : ''}`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      title={description}
      role="menuitem"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        width: '100%',
        padding: '8px 12px',
        border: 'none',
        background: isHighlighted ? 'var(--doc-primary-light)' : 'transparent',
        cursor: 'pointer',
        fontSize: '13px',
        color: 'var(--doc-text)',
        textAlign: 'left',
      }}
    >
      <span style={{ display: 'flex', color: 'var(--doc-text-muted)' }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
};

// ============================================================================
// CUSTOM PROMPT DIALOG
// ============================================================================

const CustomPromptDialog: React.FC<CustomPromptDialogProps> = ({
  isOpen,
  onSubmit,
  onClose,
  selectedText,
}) => {
  const [prompt, setPrompt] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onSubmit(prompt.trim());
      setPrompt('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="docx-custom-prompt-dialog"
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        padding: '8px',
        background: 'var(--doc-surface)',
        borderTop: '1px solid var(--doc-border)',
      }}
    >
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '8px', fontSize: '12px', color: 'var(--doc-text-muted)' }}>
          Selected: "{selectedText.slice(0, 50)}
          {selectedText.length > 50 ? '...' : ''}"
        </div>
        <input
          ref={inputRef}
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('contextMenu.customPromptPlaceholder')}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid var(--doc-border-light)',
            borderRadius: '4px',
            fontSize: '13px',
          }}
        />
        <div style={{ marginTop: '8px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 12px',
              border: '1px solid var(--doc-border-light)',
              borderRadius: '4px',
              background: 'var(--doc-surface)',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={!prompt.trim()}
            style={{
              padding: '6px 12px',
              border: 'none',
              borderRadius: '4px',
              background: prompt.trim() ? 'var(--doc-primary)' : 'var(--doc-border)',
              color: prompt.trim() ? 'white' : 'var(--doc-text-placeholder)',
              cursor: prompt.trim() ? 'pointer' : 'not-allowed',
              fontSize: '12px',
            }}
          >
            {t('common.send')}
          </button>
        </div>
      </form>
    </div>
  );
};

// ============================================================================
// MAIN CONTEXT MENU COMPONENT
// ============================================================================

export const ContextMenu: React.FC<ContextMenuProps> = ({
  isOpen,
  position,
  selectedText,
  selectionContext: _selectionContext,
  onAction,
  onClose,
  actions = DEFAULT_AI_ACTIONS,
  showCustomPrompt = true,
  className = '',
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const { t } = useTranslation();

  // All available actions including custom
  const allActions = showCustomPrompt ? [...actions, 'custom' as AIAction] : actions;

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          if (showPromptDialog) {
            setShowPromptDialog(false);
          } else {
            onClose();
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev + 1) % allActions.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev - 1 + allActions.length) % allActions.length);
          break;
        case 'Enter':
          e.preventDefault();
          const action = allActions[highlightedIndex];
          if (action === 'custom') {
            setShowPromptDialog(true);
          } else {
            onAction(action);
            onClose();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, highlightedIndex, allActions, onAction, onClose, showPromptDialog]);

  // Reset highlighted index when menu opens
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0);
      setShowPromptDialog(false);
    }
  }, [isOpen]);

  // Position the menu to stay within viewport
  const getMenuStyle = useCallback((): React.CSSProperties => {
    const menuWidth = 200;
    const menuHeight = allActions.length * 36 + 16; // Approximate height

    let x = position.x;
    let y = position.y;

    // Adjust for viewport boundaries
    if (typeof window !== 'undefined') {
      if (x + menuWidth > window.innerWidth) {
        x = window.innerWidth - menuWidth - 10;
      }
      if (y + menuHeight > window.innerHeight) {
        y = window.innerHeight - menuHeight - 10;
      }
      if (x < 10) x = 10;
      if (y < 10) y = 10;
    }

    return {
      position: 'fixed',
      top: y,
      left: x,
      minWidth: menuWidth,
      background: 'var(--doc-surface)',
      border: '1px solid var(--doc-border-light)',
      borderRadius: '8px',
      boxShadow: '0 2px 10px var(--doc-shadow)',
      zIndex: Z_INDEX.contextMenu,
      padding: '4px 0',
      overflow: 'hidden',
    };
  }, [position, allActions.length]);

  const handleActionClick = (action: AIAction) => {
    if (action === 'custom') {
      setShowPromptDialog(true);
    } else {
      onAction(action);
      onClose();
    }
  };

  const handleCustomPromptSubmit = (prompt: string) => {
    onAction('custom', prompt);
    onClose();
  };

  if (!isOpen || !selectedText) return null;

  return (
    <div
      ref={menuRef}
      className={`docx-context-menu ${className}`}
      style={getMenuStyle()}
      role="menu"
      aria-label={t('contextMenu.ariaLabel')}
    >
      {/* Header showing selected text preview */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--doc-border)',
          fontSize: '11px',
          color: 'var(--doc-text-muted)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        "{selectedText.slice(0, 30)}
        {selectedText.length > 30 ? '...' : ''}"
      </div>

      {/* Menu items */}
      <div role="group">
        {allActions.map((action, index) => (
          <MenuItem
            key={action}
            action={action}
            onClick={() => handleActionClick(action)}
            isHighlighted={index === highlightedIndex}
            onMouseEnter={() => setHighlightedIndex(index)}
          />
        ))}
      </div>

      {/* Custom prompt dialog */}
      {showCustomPrompt && (
        <CustomPromptDialog
          isOpen={showPromptDialog}
          onSubmit={handleCustomPromptSubmit}
          onClose={() => setShowPromptDialog(false)}
          selectedText={selectedText}
        />
      )}
    </div>
  );
};

// ============================================================================
// HOOK FOR CONTEXT MENU
// ============================================================================

/**
 * Hook to manage context menu state
 */
export function useContextMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState('');
  const [selectionContext, setSelectionContext] = useState<SelectionContext | undefined>();

  const openMenu = useCallback(
    (e: React.MouseEvent | MouseEvent, text: string, context?: SelectionContext) => {
      e.preventDefault();
      setPosition({ x: e.clientX, y: e.clientY });
      setSelectedText(text);
      setSelectionContext(context);
      setIsOpen(true);
    },
    []
  );

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    position,
    selectedText,
    selectionContext,
    openMenu,
    closeMenu,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get action shortcuts
 */
export function getActionShortcut(action: AIAction): string | undefined {
  const shortcuts: Partial<Record<AIAction, string>> = {
    rewrite: 'Ctrl+Shift+R',
    summarize: 'Ctrl+Shift+S',
    translate: 'Ctrl+Shift+T',
    fixGrammar: 'Ctrl+Shift+G',
  };
  return shortcuts[action];
}

/**
 * Check if action is available for selection
 */
export function isActionAvailable(
  _action: AIAction,
  selectedText: string,
  _selectionContext?: SelectionContext
): boolean {
  if (!selectedText || selectedText.trim().length === 0) {
    return false;
  }

  // All actions are available for any non-empty selection
  return true;
}

/**
 * Get default actions for selection
 */
export function getDefaultActions(): AIAction[] {
  return [...DEFAULT_AI_ACTIONS];
}

/**
 * Get all available actions
 */
export function getAllActions(): AIAction[] {
  return [
    'askAI',
    'rewrite',
    'expand',
    'summarize',
    'translate',
    'explain',
    'fixGrammar',
    'makeFormal',
    'makeCasual',
    'custom',
  ];
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ContextMenu;
