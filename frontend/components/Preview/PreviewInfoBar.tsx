'use client';

import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';

interface PreviewInfoBarProps {
  content: string;
  viewTheme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  isScrollSynced?: boolean;
  onToggleScrollSync?: () => void;
  columnWidth?: number;
  onColumnWidthChange?: (value: number) => void;
}

export default function PreviewInfoBar({ content, viewTheme, onToggleTheme, isScrollSynced, onToggleScrollSync, columnWidth, onColumnWidthChange }: PreviewInfoBarProps) {
  const { t } = useTranslation();

  // Calculate statistics
  const stats = useMemo(() => {
    // Remove markdown syntax for more accurate word count
    const plainText = content
      .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
      .replace(/\[.*?\]\(.*?\)/g, '') // Remove links
      .replace(/`{3}[\s\S]*?`{3}/g, '') // Remove code blocks
      .replace(/`.*?`/g, '') // Remove inline code
      .replace(/[#*_~\->\[\]]/g, '') // Remove markdown symbols
      .trim();

    const characters = content.length;
    const words = plainText
      .split(/\s+/)
      .filter(word => word.length > 0).length;

    return { characters, words };
  }, [content]);

  const isDark = viewTheme === 'dark';

  // Theme-specific colors
  const bgColor = isDark ? '#676767' : '#E9E9E9';
  const borderColor = isDark ? '#CDCDCD' : '#999999';
  const textColor = isDark ? '#E5E5E5' : '#666666';
  const hoverBg = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';

  return (
    <div
      className="h-[24px] flex items-center justify-between px-4"
      style={{
        backgroundColor: bgColor,
        borderTop: `1px solid ${borderColor}`
      }}
    >
      {/* Left side - Word count */}
      <div
        className="flex items-center gap-4 text-[10px]"
        style={{ fontFamily: 'Roboto Mono, monospace', color: textColor }}
      >
        <span>{t('infobar.words')}: {stats.words}</span>
      </div>

      {/* Center - Column width slider + Scroll sync toggle + Theme toggle */}
      <div className="flex items-center gap-2">
        {/* Column width slider */}
        {columnWidth !== undefined && onColumnWidthChange && (
          <div className="flex items-center gap-1.5">
            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke={textColor} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h16" />
            </svg>
            <input
              type="range"
              min={50}
              max={100}
              step={1}
              value={columnWidth}
              onChange={(e) => onColumnWidthChange(Number(e.target.value))}
              className="column-width-slider"
              style={{
                width: '80px',
                height: '2px',
                appearance: 'none',
                WebkitAppearance: 'none',
                background: isDark ? '#AAAAAA' : '#999999',
                borderRadius: '1px',
                outline: 'none',
                cursor: 'pointer',
                accentColor: textColor,
              }}
              title={`${columnWidth}%`}
            />
          </div>
        )}
        {onToggleScrollSync && (
          <button
            onClick={onToggleScrollSync}
            className="p-1 rounded transition-colors"
            style={{ color: textColor }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBg}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            title={isScrollSynced ? t('infobar.scrollSyncOn') : t('infobar.scrollSyncOff')}
          >
            {isScrollSynced ? (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        )}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            className="p-1 rounded transition-colors"
            style={{ color: textColor }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBg}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            aria-label="Toggle theme"
          >
            {viewTheme === 'dark' ? (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Right side - Character count */}
      <div
        className="text-[10px]"
        style={{ fontFamily: 'Roboto Mono, monospace', color: textColor }}
      >
        {t('infobar.characters')}: {stats.characters}
      </div>
    </div>
  );
}
