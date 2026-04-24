'use client';

import { useTranslation } from 'react-i18next';
import { useMemo, useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

interface PreviewInfoBarProps {
  content: string;
  viewTheme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  isScrollSynced?: boolean;
  onToggleScrollSync?: () => void;
  columnWidth?: number;
  onColumnWidthChange?: (value: number) => void;
  onColumnWidthLiveChange?: (value: number) => void;
  previewZoom?: number;
  onPreviewZoomIn?: () => void;
  onPreviewZoomOut?: () => void;
  onPreviewZoomReset?: () => void;
  animateIn?: 'hidden' | 'instant' | 'slide-up';
}

const COMPACT_THRESHOLD = 500;

export default function PreviewInfoBar({ content, viewTheme, onToggleTheme, isScrollSynced, onToggleScrollSync, columnWidth, onColumnWidthChange, onColumnWidthLiveChange, previewZoom, onPreviewZoomIn, onPreviewZoomOut, onPreviewZoomReset, animateIn }: PreviewInfoBarProps) {
  const { t } = useTranslation();

  const [isCompact, setIsCompact] = useState(false);
  const [localSliderValue, setLocalSliderValue] = useState(() => 100 - (columnWidth ?? 100));
  const isDraggingSliderRef = useRef(false);
  const [showStatsMenu, setShowStatsMenu] = useState(false);
  const [statsMenuPos, setStatsMenuPos] = useState({ top: 0, left: 0 });
  const [isMounted, setIsMounted] = useState(false);

  const infoBarRef = useRef<HTMLDivElement>(null);
  const statsButtonRef = useRef<HTMLButtonElement>(null);
  const statsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setIsMounted(true); }, []);

  // Sync slider from parent only when not dragging
  useEffect(() => {
    if (!isDraggingSliderRef.current && columnWidth !== undefined) {
      setLocalSliderValue(100 - columnWidth);
    }
  }, [columnWidth]);

  useEffect(() => {
    const container = infoBarRef.current;
    if (!container) return;
    const checkWidth = () => setIsCompact(container.clientWidth < COMPACT_THRESHOLD);
    checkWidth();
    const observer = new ResizeObserver(checkWidth);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (showStatsMenu && statsButtonRef.current) {
      const rect = statsButtonRef.current.getBoundingClientRect();
      setStatsMenuPos({ top: rect.top - 8, left: rect.left + rect.width / 2 });
    }
  }, [showStatsMenu]);

  useEffect(() => {
    if (!showStatsMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideButton = statsButtonRef.current?.contains(target);
      const isInsideMenu = statsMenuRef.current?.contains(target);
      if (!isInsideButton && !isInsideMenu) setShowStatsMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showStatsMenu]);

  useLayoutEffect(() => {
    const el = infoBarRef.current;
    if (!el) return;
    if (animateIn === 'hidden') {
      el.classList.remove('infobar-slide-in');
      el.style.height = '0';
      el.style.overflow = 'hidden';
    } else {
      el.style.height = '';
      el.style.overflow = '';
      el.classList.remove('infobar-slide-in');
      if (animateIn === 'slide-up') {
        void el.offsetHeight;
        el.classList.add('infobar-slide-in');
        const cleanup = () => el.classList.remove('infobar-slide-in');
        el.addEventListener('animationend', cleanup, { once: true });
      }
    }
  }, [animateIn]);

  // Calculate statistics
  const stats = useMemo(() => {
    const plainText = content
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/\[.*?\]\(.*?\)/g, '')
      .replace(/`{3}[\s\S]*?`{3}/g, '')
      .replace(/`.*?`/g, '')
      .replace(/[#*_~\->\[\]]/g, '')
      .trim();

    const characters = content.length;
    const words = plainText.split(/\s+/).filter(word => word.length > 0).length;
    return { characters, words };
  }, [content]);

  const isDark = viewTheme === 'dark';
  const bgColor = isDark ? '#676767' : '#E9E9E9';
  const borderColor = isDark ? '#CDCDCD' : '#999999';
  const textColor = isDark ? '#E5E5E5' : '#666666';
  const textMuted = isDark ? '#AAAAAA' : '#999999';
  const hoverBg = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
  const dropdownBg = isDark ? '#272727' : '#FFFFFF';

  const statsDropdown = showStatsMenu && isMounted && createPortal(
    <div
      ref={statsMenuRef}
      className="fixed rounded-lg shadow-lg min-w-[140px] overflow-hidden py-1"
      style={{
        top: statsMenuPos.top,
        left: statsMenuPos.left,
        transform: 'translate(-50%, -100%)',
        backgroundColor: dropdownBg,
        border: `1px solid ${borderColor}`,
        zIndex: 99999
      }}
    >
      <div className="px-3 py-1.5 text-[10px]" style={{ color: textColor, fontFamily: 'Roboto Mono, monospace' }}>
        {t('infobar.words')}: {stats.words}
      </div>
      <div className="px-3 py-1.5 text-[10px]" style={{ color: textColor, fontFamily: 'Roboto Mono, monospace' }}>
        {t('infobar.characters')}: {stats.characters}
      </div>
    </div>,
    document.body
  );

  return (
    <div
      ref={infoBarRef}
      className="infobar-fullbleed h-[24px] flex items-center justify-between px-4"
      style={{ backgroundColor: bgColor, borderTop: '1px solid var(--border-editor)' }}
    >
      {/* Left side - Words (non-compact) or Stats button (compact) */}
      <div className="flex items-center text-[10px]" style={{ fontFamily: 'Roboto Mono, monospace', color: textColor }}>
        {isCompact ? (
          <button
            ref={statsButtonRef}
            onClick={() => setShowStatsMenu(!showStatsMenu)}
            className="text-[10px] px-2 py-0.5 rounded transition-colors flex items-center gap-1"
            style={{ fontFamily: 'Roboto Mono, monospace', color: textColor }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBg}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <span>{t('infobar.statistics', 'Estatísticas')}</span>
            <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        ) : (
          <span>{t('infobar.words')}: {stats.words}</span>
        )}
      </div>

      {/* Center - Column width slider + Scroll sync toggle + Theme toggle */}
      <div className="flex items-center gap-2">
        {columnWidth !== undefined && onColumnWidthChange && (
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke={textColor} viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" d="M9 5h6M8 12h8M9 19h6" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 9l2 3-2 3M20 9l-2 3 2 3" />
            </svg>
            <input
              type="range" min={0} max={60} step={1}
              value={localSliderValue}
              onPointerDown={() => { isDraggingSliderRef.current = true; }}
              onChange={(e) => {
                const raw = Number(e.target.value);
                setLocalSliderValue(raw);
                onColumnWidthLiveChange?.(100 - raw);
              }}
              onPointerUp={(e) => {
                isDraggingSliderRef.current = false;
                onColumnWidthChange?.(100 - Number((e.target as HTMLInputElement).value));
              }}
              className="column-width-slider"
              style={{
                width: '80px', height: '2px', appearance: 'none', WebkitAppearance: 'none',
                background: isDark ? '#AAAAAA' : '#999999', borderRadius: '1px',
                outline: 'none', cursor: 'pointer', accentColor: textColor,
              }}
              title={`${100 - localSliderValue}%`}
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

      {/* Right side - Zoom control + Character count (compact: chars move to Estatísticas) */}
      <div className="flex items-center gap-3">
        {previewZoom !== undefined && (
          <div className="flex items-center">
            <button
              onClick={onPreviewZoomOut}
              className="w-5 h-5 flex items-center justify-center rounded transition-colors text-[11px]"
              style={{ color: previewZoom <= 70 ? textMuted : textColor, opacity: previewZoom <= 70 ? 0.4 : 1 }}
              onMouseEnter={(e) => { if (previewZoom > 70) e.currentTarget.style.backgroundColor = hoverBg; }}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              disabled={previewZoom <= 70}
              aria-label={t('infobar.zoomOut')}
            >−</button>
            <button
              onClick={onPreviewZoomReset}
              className="px-1 h-5 flex items-center justify-center rounded transition-colors text-[10px] min-w-[38px] text-center"
              style={{ fontFamily: 'Roboto Mono, monospace', color: textColor }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBg}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              title={t('infobar.zoomReset')}
            >{previewZoom}%</button>
            <button
              onClick={onPreviewZoomIn}
              className="w-5 h-5 flex items-center justify-center rounded transition-colors text-[11px]"
              style={{ color: previewZoom >= 150 ? textMuted : textColor, opacity: previewZoom >= 150 ? 0.4 : 1 }}
              onMouseEnter={(e) => { if (previewZoom < 150) e.currentTarget.style.backgroundColor = hoverBg; }}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              disabled={previewZoom >= 150}
              aria-label={t('infobar.zoomIn')}
            >+</button>
          </div>
        )}
        {!isCompact && (
          <div className="text-[10px]" style={{ fontFamily: 'Roboto Mono, monospace', color: textColor }}>
            {t('infobar.characters')}: {stats.characters}
          </div>
        )}
      </div>

      {statsDropdown}
    </div>
  );
}
