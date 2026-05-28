'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface EditorContextMenuProps {
  x: number;
  y: number;
  hasSelection: boolean;
  onClose: () => void;
  onBold: () => void;
  onItalic: () => void;
  onStrike: () => void;
  onHighlight: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onFind: () => void;
}

export default function EditorContextMenu({
  x, y, hasSelection,
  onClose, onBold, onItalic, onStrike, onHighlight,
  onCopy, onCut, onPaste, onFind,
}: EditorContextMenuProps) {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  useEffect(() => {
    if (!menuRef.current) return;
    const { offsetWidth: w, offsetHeight: h } = menuRef.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setPos({
      left: x + w > vw ? Math.max(0, vw - w - 8) : x,
      top:  y + h > vh ? Math.max(0, vh - h - 8) : y,
    });
  }, [x, y]);

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const run = (fn: () => void) => {
    fn();
    onClose();
  };

  const disabledClass = 'opacity-40 cursor-not-allowed';
  const itemClass = 'w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[var(--hover-bg-subtle)] transition-colors text-left';

  return (
    <div
      ref={menuRef}
      className="fixed z-[500] min-w-[180px] py-1
                 bg-[var(--dropdown-bg)] border border-[var(--border-primary)]
                 rounded-lg shadow-lg overflow-hidden
                 text-[12px] text-[var(--text-primary)]"
      style={{ left: pos.left, top: pos.top }}
    >
      {/* Formatting group */}
      <button className={itemClass} onClick={() => run(onBold)}>
        <svg className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
            d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
        </svg>
        <span style={{ fontFamily: 'Roboto Mono, monospace' }}>{t('contextMenu.bold', 'Negrito')}</span>
        <span className="ml-auto text-[10px] text-[var(--text-secondary)]">Ctrl+B</span>
      </button>

      <button className={itemClass} onClick={() => run(onItalic)}>
        <svg className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <line strokeLinecap="round" strokeWidth={2} x1="19" y1="4" x2="10" y2="4" />
          <line strokeLinecap="round" strokeWidth={2} x1="14" y1="20" x2="5" y2="20" />
          <line strokeLinecap="round" strokeWidth={2} x1="15" y1="4" x2="9" y2="20" />
        </svg>
        <span style={{ fontFamily: 'Roboto Mono, monospace' }}>{t('contextMenu.italic', 'Itálico')}</span>
        <span className="ml-auto text-[10px] text-[var(--text-secondary)]">Ctrl+I</span>
      </button>

      <button className={itemClass} onClick={() => run(onStrike)}>
        <svg className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <line strokeLinecap="round" strokeWidth={2} x1="5" y1="12" x2="19" y2="12" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M16 6c0-1.1-1.8-2-4-2s-4 .9-4 2c0 2 4 3 4 3" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 18c0 1.1 1.8 2 4 2s4-.9 4-2c0-2-4-3-4-3" />
        </svg>
        <span style={{ fontFamily: 'Roboto Mono, monospace' }}>{t('contextMenu.strikethrough', 'Tachado')}</span>
      </button>

      <button className={itemClass} onClick={() => run(onHighlight)}>
        <svg className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15.232 5.232l3.536 3.536M9 13l6.5-6.5a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H8v-2.414a2 2 0 01.586-1.414z" />
          <line strokeLinecap="round" strokeWidth={2} x1="3" y1="21" x2="21" y2="21" />
        </svg>
        <span style={{ fontFamily: 'Roboto Mono, monospace' }}>{t('contextMenu.highlight', 'Destaque')}</span>
      </button>

      <div className="my-1 border-t border-[var(--border-secondary)]" />

      {/* Clipboard group */}
      <button
        className={`${itemClass} ${!hasSelection ? disabledClass : ''}`}
        onClick={() => { if (hasSelection) run(onCopy); }}
        disabled={!hasSelection}
      >
        <svg className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
        <span style={{ fontFamily: 'Roboto Mono, monospace' }}>{t('contextMenu.copy', 'Copiar')}</span>
        <span className="ml-auto text-[10px] text-[var(--text-secondary)]">Ctrl+C</span>
      </button>

      <button
        className={`${itemClass} ${!hasSelection ? disabledClass : ''}`}
        onClick={() => { if (hasSelection) run(onCut); }}
        disabled={!hasSelection}
      >
        <svg className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="6" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <line x1="20" y1="4" x2="8.12" y2="15.88" />
          <line x1="14.47" y1="14.48" x2="20" y2="20" />
          <line x1="8.12" y1="8.12" x2="12" y2="12" />
        </svg>
        <span style={{ fontFamily: 'Roboto Mono, monospace' }}>{t('contextMenu.cut', 'Recortar')}</span>
        <span className="ml-auto text-[10px] text-[var(--text-secondary)]">Ctrl+X</span>
      </button>

      <button className={itemClass} onClick={() => { onClose(); setTimeout(onPaste, 0); }}>
        <svg className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
          <rect strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} x="9" y="3" width="6" height="4" rx="2" />
        </svg>
        <span style={{ fontFamily: 'Roboto Mono, monospace' }}>{t('contextMenu.paste', 'Colar')}</span>
        <span className="ml-auto text-[10px] text-[var(--text-secondary)]">Ctrl+V</span>
      </button>

      <div className="my-1 border-t border-[var(--border-secondary)]" />

      {/* Find group */}
      <button className={itemClass} onClick={() => run(onFind)}>
        <svg className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="11" cy="11" r="8" strokeWidth={2} />
          <line strokeLinecap="round" strokeWidth={2} x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span style={{ fontFamily: 'Roboto Mono, monospace' }}>
          {hasSelection ? t('contextMenu.findSelection', 'Buscar seleção') : t('contextMenu.find', 'Buscar')}
        </span>
        <span className="ml-auto text-[10px] text-[var(--text-secondary)]">Ctrl+F</span>
      </button>
    </div>
  );
}
