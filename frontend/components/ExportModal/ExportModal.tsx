'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'html' | 'md' | 'txt') => void;
  filename: string;
  hasImages?: boolean;
}

export default function ExportModal({
  isOpen,
  onClose,
  onExport,
  filename,
  hasImages = false,
}: ExportModalProps) {
  const { t } = useTranslation();

  // Animation state
  const [shouldRender, setShouldRender] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [exitDirection, setExitDirection] = useState(false);

  // Handle open
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setExitDirection(false);
      const timeout = setTimeout(() => {
        setAnimateIn(true);
      }, 20);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  // Handle close
  useEffect(() => {
    if (!isOpen && shouldRender) {
      setAnimateIn(false);
      setExitDirection(true);
      const timeout = setTimeout(() => {
        setShouldRender(false);
        setExitDirection(false);
      }, 150);
      return () => clearTimeout(timeout);
    }
  }, [isOpen, shouldRender]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleFormatClick = (format: 'html' | 'md' | 'txt') => {
    onExport(format);
  };

  if (!shouldRender) return null;

  const formats = [
    {
      id: 'html' as const,
      name: 'HTML',
      extension: '.html',
      description: t('exportModal.htmlDescription', 'Documento web completo'),
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      )
    },
    {
      id: 'md' as const,
      name: 'Markdown',
      extension: '.md',
      description: t('exportModal.mdDescription', 'Arquivo markdown original'),
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      id: 'txt' as const,
      name: t('exportModal.text', 'Texto'),
      extension: '.txt',
      description: t('exportModal.txtDescription', 'Texto simples sem formatacao'),
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    }
  ];

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center z-[100] transition-all duration-150 ease-out
        ${animateIn ? 'bg-black/50' : 'bg-black/0'}`}
      onClick={onClose}
    >
      <div
        className={`bg-[var(--dropdown-bg)] rounded-lg shadow-xl p-6 w-[420px] max-w-[90vw]
          transition-all duration-150 ease-out
          ${animateIn ? 'opacity-100 translate-y-0' : exitDirection ? 'opacity-0 translate-y-2' : 'opacity-0 -translate-y-2'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <h2
          className="text-[16px] font-bold text-[var(--text-primary)] mb-2"
          style={{ fontFamily: 'Roboto Mono, monospace' }}
        >
          {t('exportModal.title', 'Exportar documento')}
        </h2>

        {/* Filename preview */}
        <p
          className="text-[12px] text-[var(--text-secondary)] mb-5 truncate"
          style={{ fontFamily: 'Roboto Mono, monospace' }}
        >
          {filename}
        </p>

        {/* Images notice */}
        {hasImages && (
          <p
            className="text-[11px] text-[var(--text-secondary)] mb-4 px-3 py-2 bg-[var(--bg-secondary)] rounded border border-[var(--border-primary)]"
            style={{ fontFamily: 'Roboto Mono, monospace' }}
          >
            {t('exportModal.hasImages', 'Este documento possui imagens. Será exportado como arquivo .zip contendo o documento e as imagens.')}
          </p>
        )}

        {/* Format cards */}
        <div className="flex gap-3 mb-5">
          {formats.map((format) => (
            <button
              key={format.id}
              onClick={() => handleFormatClick(format.id)}
              className="flex-1 p-4 border border-[var(--border-primary)] rounded-lg
                         flex flex-col items-center gap-2
                         hover:border-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]
                         transition-all cursor-pointer group"
            >
              <div className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                {format.icon}
              </div>
              <span
                className="text-[13px] font-medium text-[var(--text-primary)]"
                style={{ fontFamily: 'Roboto Mono, monospace' }}
              >
                {format.name}
              </span>
              <span
                className="text-[10px] text-[var(--text-muted)]"
                style={{ fontFamily: 'Roboto Mono, monospace' }}
              >
                {format.extension}
              </span>
            </button>
          ))}
        </div>

        {/* Cancel button */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]
                       hover:bg-[var(--bg-secondary)] rounded transition-colors"
            style={{ fontFamily: 'Roboto Mono, monospace' }}
          >
            {t('buttons.cancel', 'Cancelar')}
          </button>
        </div>
      </div>
    </div>
  );
}
