'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

// Map i18n language codes to spellcheck language codes
const SPELLCHECK_LANGUAGES: Record<string, { code: string; name: string }> = {
  'pt-BR': { code: 'pt-BR', name: 'Português (Brasil)' },
  'en-US': { code: 'en-US', name: 'English (US)' },
  'es-ES': { code: 'es-ES', name: 'Español' },
  'fr-FR': { code: 'fr-FR', name: 'Français' },
  'de-DE': { code: 'de-DE', name: 'Deutsch' },
  'ru-RU': { code: 'ru-RU', name: 'Русский' },
  'zh-CN': { code: 'zh-CN', name: '简体中文' },
};

interface InfoBarProps {
  line: number;
  column: number;
  characters: number;
  spellcheckEnabled: boolean;
  spellcheckLanguage: string;
  onSpellcheckToggle: (enabled: boolean) => void;
  onSpellcheckLanguageChange: (language: string) => void;
  viewTheme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  saveStatus?: 'saved' | 'saving' | 'unsaved' | 'error';
  columnWidth?: number;
  onColumnWidthChange?: (value: number) => void;
}

const COMPACT_THRESHOLD = 500;

export default function InfoBar({
  line,
  column,
  characters,
  spellcheckEnabled,
  spellcheckLanguage,
  onSpellcheckToggle,
  onSpellcheckLanguageChange,
  viewTheme,
  onToggleTheme,
  saveStatus,
  columnWidth,
  onColumnWidthChange,
}: InfoBarProps) {
  const { t, i18n } = useTranslation();
  const [showSpellcheckMenu, setShowSpellcheckMenu] = useState(false);
  const [showStatsMenu, setShowStatsMenu] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [spellcheckMenuPos, setSpellcheckMenuPos] = useState({ top: 0, left: 0 });
  const [statsMenuPos, setStatsMenuPos] = useState({ top: 0, left: 0 });
  const [isMounted, setIsMounted] = useState(false);

  const spellcheckButtonRef = useRef<HTMLButtonElement>(null);
  const statsButtonRef = useRef<HTMLButtonElement>(null);
  const spellcheckMenuRef = useRef<HTMLDivElement>(null);
  const statsMenuRef = useRef<HTMLDivElement>(null);
  const infoBarRef = useRef<HTMLDivElement>(null);

  // Check if component is mounted (for portal)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Detect width and set compact mode
  useEffect(() => {
    const container = infoBarRef.current;
    if (!container) return;

    const checkWidth = () => {
      setIsCompact(container.clientWidth < COMPACT_THRESHOLD);
    };

    checkWidth();

    const resizeObserver = new ResizeObserver(checkWidth);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Calculate dropdown position when showing spellcheck menu
  useEffect(() => {
    if (showSpellcheckMenu && spellcheckButtonRef.current) {
      const rect = spellcheckButtonRef.current.getBoundingClientRect();
      setSpellcheckMenuPos({
        top: rect.top - 8, // 8px margin
        left: rect.left + rect.width / 2
      });
    }
  }, [showSpellcheckMenu]);

  // Calculate dropdown position when showing stats menu
  useEffect(() => {
    if (showStatsMenu && statsButtonRef.current) {
      const rect = statsButtonRef.current.getBoundingClientRect();
      setStatsMenuPos({
        top: rect.top - 8, // 8px margin
        left: rect.left + rect.width / 2
      });
    }
  }, [showStatsMenu]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (showSpellcheckMenu) {
        const isInsideButton = spellcheckButtonRef.current?.contains(target);
        const isInsideMenu = spellcheckMenuRef.current?.contains(target);
        if (!isInsideButton && !isInsideMenu) {
          setShowSpellcheckMenu(false);
        }
      }

      if (showStatsMenu) {
        const isInsideButton = statsButtonRef.current?.contains(target);
        const isInsideMenu = statsMenuRef.current?.contains(target);
        if (!isInsideButton && !isInsideMenu) {
          setShowStatsMenu(false);
        }
      }
    };

    if (showSpellcheckMenu || showStatsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSpellcheckMenu, showStatsMenu]);

  const handleSelectLanguage = (langCode: string) => {
    onSpellcheckLanguageChange(langCode);
  };

  const getSpellcheckLabel = () => {
    if (!spellcheckEnabled) {
      return t('infobar.spellcheckOff');
    }
    // Use language code abbreviation instead of full name
    return `${t('infobar.spellcheck')}: ${spellcheckLanguage}`;
  };

  const isDark = viewTheme === 'dark';

  // Theme-specific colors
  const bgColor = isDark ? '#676767' : '#E9E9E9';
  const borderColor = isDark ? '#CDCDCD' : '#999999';
  const textColor = isDark ? '#E5E5E5' : '#666666';
  const textMuted = isDark ? '#AAAAAA' : '#999999';
  const hoverBg = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
  const dropdownBg = isDark ? '#272727' : '#FFFFFF';
  const textPrimary = isDark ? '#FFFFFF' : '#2D2D2D';
  const bgPrimary = isDark ? '#121212' : '#FFFFFF';

  const getSaveStatusDisplay = () => {
    if (!saveStatus) return null;

    const statusConfig = {
      saved: {
        text: t('status.saved', 'Salvo'),
        color: isDark ? '#4ADE80' : '#22C55E',
        icon: (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      },
      saving: {
        text: t('status.saving', 'Salvando...'),
        color: isDark ? '#FBBF24' : '#F59E0B',
        icon: (
          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )
      },
      unsaved: {
        text: t('status.unsaved', 'Alterado'),
        color: textMuted,
        icon: (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="4" />
          </svg>
        )
      },
      error: {
        text: t('status.error', 'Erro'),
        color: isDark ? '#F87171' : '#EF4444',
        icon: (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      }
    };

    const config = statusConfig[saveStatus];

    return (
      <div
        className="flex items-center gap-1 text-[10px]"
        style={{ fontFamily: 'Roboto Mono, monospace', color: config.color }}
      >
        {config.icon}
        <span>{config.text}</span>
      </div>
    );
  };

  // Spellcheck dropdown menu (rendered via portal)
  const spellcheckDropdown = showSpellcheckMenu && isMounted && createPortal(
    <div
      ref={spellcheckMenuRef}
      className="fixed rounded-lg shadow-lg min-w-[200px] overflow-hidden"
      style={{
        top: spellcheckMenuPos.top,
        left: spellcheckMenuPos.left,
        transform: 'translate(-50%, -100%)',
        backgroundColor: dropdownBg,
        border: `1px solid ${borderColor}`,
        zIndex: 99999
      }}
    >
      {/* Toggle spellcheck */}
      <button
        onClick={() => {
          onSpellcheckToggle(!spellcheckEnabled);
        }}
        className="w-full px-3 py-2 text-left flex items-center gap-2 text-sm"
        style={{ borderBottom: `1px solid ${borderColor}` }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBg}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <span
          className="w-4 h-4 flex items-center justify-center rounded border"
          style={{
            backgroundColor: spellcheckEnabled ? textPrimary : 'transparent',
            borderColor: spellcheckEnabled ? textPrimary : textMuted
          }}
        >
          {spellcheckEnabled && (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke={bgPrimary}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </span>
        <span style={{ color: textColor }}>{t('infobar.enableSpellcheck')}</span>
      </button>

      {/* Language selection */}
      <div className="py-1">
        <div className="px-3 py-1 text-xs" style={{ color: textMuted }}>{t('infobar.selectLanguage')}</div>
        {Object.entries(SPELLCHECK_LANGUAGES).map(([code, lang]) => (
          <button
            key={code}
            onClick={() => handleSelectLanguage(code)}
            disabled={!spellcheckEnabled}
            className={`w-full px-3 py-1.5 text-left flex items-center gap-2 text-sm ${
              !spellcheckEnabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onMouseEnter={(e) => { if (spellcheckEnabled) e.currentTarget.style.backgroundColor = hoverBg }}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <span
              className="w-4 h-4 flex items-center justify-center rounded-full border"
              style={{ borderColor: spellcheckLanguage === code ? textPrimary : textMuted }}
            >
              {spellcheckLanguage === code && (
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: textPrimary }} />
              )}
            </span>
            <span style={{ color: textColor }}>{lang.name}</span>
            {code === i18n.language && (
              <span className="text-[10px] ml-auto" style={{ color: textMuted }}>({t('infobar.current')})</span>
            )}
          </button>
        ))}
      </div>
    </div>,
    document.body
  );

  // Stats dropdown menu (rendered via portal)
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
      <div
        className="px-3 py-1.5 text-[10px]"
        style={{ color: textColor, fontFamily: 'Roboto Mono, monospace' }}
      >
        {t('infobar.line')}: {line}
      </div>
      <div
        className="px-3 py-1.5 text-[10px]"
        style={{ color: textColor, fontFamily: 'Roboto Mono, monospace' }}
      >
        {t('infobar.column')}: {column}
      </div>
      <div
        className="px-3 py-1.5 text-[10px]"
        style={{ color: textColor, fontFamily: 'Roboto Mono, monospace' }}
      >
        {t('infobar.characters')}: {characters}
      </div>
    </div>,
    document.body
  );

  return (
    <div
      ref={infoBarRef}
      className="infobar-fullbleed h-[24px] flex items-center justify-between px-4"
      style={{
        backgroundColor: bgColor,
        borderTop: `1px solid ${borderColor}`
      }}
    >
      {/* Left side - Save status and cursor position (when not compact) */}
      <div
        className="flex items-center gap-4 text-[10px]"
        style={{ fontFamily: 'Roboto Mono, monospace', color: textColor }}
      >
        {getSaveStatusDisplay()}
        {!isCompact && (
          <>
            {saveStatus && <span>|</span>}
            <span>{t('infobar.line')}: {line}</span>
            <span>|</span>
            <span>{t('infobar.column')}: {column}</span>
          </>
        )}
      </div>

      {/* Center - Stats dropdown (compact), Theme toggle and Spellcheck */}
      <div className="flex items-center gap-3">
        {/* Stats dropdown - only in compact mode */}
        {isCompact && (
          <div className="relative">
            <button
              ref={statsButtonRef}
              onClick={() => setShowStatsMenu(!showStatsMenu)}
              className="text-[10px] px-2 py-0.5 rounded transition-colors flex items-center gap-1"
              style={{
                fontFamily: 'Roboto Mono, monospace',
                color: textColor
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBg}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <span>{t('infobar.statistics', 'Estatísticas')}</span>
              <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        )}

        {/* Column width slider */}
        {columnWidth !== undefined && onColumnWidthChange && (
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke={textMuted} viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" d="M9 5h6M8 12h8M9 19h6" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 9l2 3-2 3M20 9l-2 3 2 3" />
            </svg>
            <input
              type="range"
              min={0}
              max={60}
              step={1}
              value={100 - columnWidth}
              onChange={(e) => onColumnWidthChange(100 - Number(e.target.value))}
              className="column-width-slider"
              style={{
                width: '80px',
                height: '2px',
                appearance: 'none',
                WebkitAppearance: 'none',
                background: textMuted,
                borderRadius: '1px',
                outline: 'none',
                cursor: 'pointer',
                accentColor: textColor,
              }}
              title={`${columnWidth}%`}
            />
          </div>
        )}

        {/* Theme toggle icon */}
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

        {/* Spellcheck indicator */}
        <div className="relative">
          <button
            ref={spellcheckButtonRef}
            onClick={() => setShowSpellcheckMenu(!showSpellcheckMenu)}
            className="text-[10px] px-2 py-0.5 rounded transition-colors"
            style={{
              fontFamily: 'Roboto Mono, monospace',
              color: spellcheckEnabled ? textColor : textMuted
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBg}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            {getSpellcheckLabel()}
          </button>
        </div>
      </div>

      {/* Right side - Character count (hidden in compact mode) */}
      {!isCompact ? (
        <div
          className="text-[10px]"
          style={{ fontFamily: 'Roboto Mono, monospace', color: textColor }}
        >
          {t('infobar.characters')}: {characters}
        </div>
      ) : (
        <div className="w-0" />
      )}

      {/* Dropdowns rendered via portal */}
      {spellcheckDropdown}
      {statsDropdown}
    </div>
  );
}
