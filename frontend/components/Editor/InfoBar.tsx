'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

// Map i18n language codes to spellcheck language codes
const SPELLCHECK_LANGUAGES: Record<string, { code: string; name: string }> = {
  'pt-BR': { code: 'pt-BR', name: 'Português (Brasil)' },
  'en-US': { code: 'en-US', name: 'English (US)' },
  'es-ES': { code: 'es-ES', name: 'Español' },
  'fr-FR': { code: 'fr-FR', name: 'Français' },
  'de-DE': { code: 'de-DE', name: 'Deutsch' },
};

interface InfoBarProps {
  line: number;
  column: number;
  characters: number;
  spellcheckEnabled: boolean;
  spellcheckLanguage: string;
  onSpellcheckToggle: (enabled: boolean) => void;
  onSpellcheckLanguageChange: (language: string) => void;
}

export default function InfoBar({
  line,
  column,
  characters,
  spellcheckEnabled,
  spellcheckLanguage,
  onSpellcheckToggle,
  onSpellcheckLanguageChange,
}: InfoBarProps) {
  const { t, i18n } = useTranslation();
  const [showSpellcheckMenu, setShowSpellcheckMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowSpellcheckMenu(false);
      }
    };

    if (showSpellcheckMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSpellcheckMenu]);

  const handleSelectLanguage = (langCode: string) => {
    onSpellcheckLanguageChange(langCode);
  };

  const getSpellcheckLabel = () => {
    if (!spellcheckEnabled) {
      return t('infobar.spellcheckOff');
    }
    return `${t('infobar.spellcheck')}: ${SPELLCHECK_LANGUAGES[spellcheckLanguage]?.name || spellcheckLanguage}`;
  };

  return (
    <div className="h-[24px] bg-[#E9E9E9] flex items-center justify-between px-4 border-t border-[#CCCCCC]">
      {/* Left side - Cursor position */}
      <div className="flex items-center gap-4 text-[10px] text-[#666666]" style={{ fontFamily: 'Roboto Mono, monospace' }}>
        <span>Line: {line}</span>
        <span>|</span>
        <span>Col: {column}</span>
      </div>

      {/* Center - Spellcheck indicator */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowSpellcheckMenu(!showSpellcheckMenu)}
          className={`text-[10px] px-2 py-0.5 rounded hover:bg-[#DADADA] transition-colors ${
            spellcheckEnabled ? 'text-[#666666]' : 'text-[#999999]'
          }`}
          style={{ fontFamily: 'Roboto Mono, monospace' }}
        >
          {getSpellcheckLabel()}
        </button>

        {showSpellcheckMenu && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-white border border-[#CCCCCC] rounded shadow-lg z-50 min-w-[200px]">
            {/* Toggle spellcheck */}
            <button
              onClick={() => {
                onSpellcheckToggle(!spellcheckEnabled);
              }}
              className="w-full px-3 py-2 text-left hover:bg-[#E9E9E9] flex items-center gap-2 text-sm border-b border-[#CCCCCC]"
            >
              <span className={`w-4 h-4 flex items-center justify-center rounded border ${
                spellcheckEnabled ? 'bg-[#333] border-[#333]' : 'border-[#999]'
              }`}>
                {spellcheckEnabled && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <span className="text-[#666666]">{t('infobar.enableSpellcheck')}</span>
            </button>

            {/* Language selection */}
            <div className="py-1">
              <div className="px-3 py-1 text-xs text-[#999999]">{t('infobar.selectLanguage')}</div>
              {Object.entries(SPELLCHECK_LANGUAGES).map(([code, lang]) => (
                <button
                  key={code}
                  onClick={() => handleSelectLanguage(code)}
                  disabled={!spellcheckEnabled}
                  className={`w-full px-3 py-1.5 text-left hover:bg-[#E9E9E9] flex items-center gap-2 text-sm ${
                    !spellcheckEnabled ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <span className={`w-4 h-4 flex items-center justify-center rounded-full border ${
                    spellcheckLanguage === code ? 'border-[#333]' : 'border-[#999]'
                  }`}>
                    {spellcheckLanguage === code && (
                      <span className="w-2 h-2 rounded-full bg-[#333]" />
                    )}
                  </span>
                  <span className="text-[#666666]">{lang.name}</span>
                  {code === i18n.language && (
                    <span className="text-[10px] text-[#999999] ml-auto">({t('infobar.current')})</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right side - Character count */}
      <div className="text-[10px] text-[#666666]" style={{ fontFamily: 'Roboto Mono, monospace' }}>
        Characters: {characters}
      </div>
    </div>
  );
}
