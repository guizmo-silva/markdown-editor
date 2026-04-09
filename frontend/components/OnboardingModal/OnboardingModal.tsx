'use client';

import { useState, useEffect } from 'react';
import i18n from '@/utils/i18n';

const LANGUAGES = [
  { code: 'pt-BR', name: 'Português',  flag: '🇧🇷' },
  { code: 'en-US', name: 'English',    flag: '🇺🇸' },
  { code: 'es-ES', name: 'Español',    flag: '🇪🇸' },
  { code: 'fr-FR', name: 'Français',   flag: '🇫🇷' },
  { code: 'de-DE', name: 'Deutsch',    flag: '🇩🇪' },
  { code: 'ru-RU', name: 'Русский',    flag: '🇷🇺' },
  { code: 'zh-CN', name: '简体中文',   flag: '🇨🇳' },
  { code: 'hi-IN', name: 'हिन्दी',    flag: '🇮🇳' },
];

const TICKER_PHRASES = [
  'Selecione o idioma da interface:',
  'Select the interface language:',
  'Selecciona el idioma de la interfaz:',
  "Sélectionnez la langue de l'interface :",
  'Wählen Sie die Sprache der Benutzeroberfläche:',
  'Выберите язык интерфейса:',
  '选择界面语言：',
  'इंटरफ़ेस भाषा चुनें:',
];

const TICKER_CONTENT = TICKER_PHRASES.join('   ·   ');

interface OnboardingModalProps {
  isOpen: boolean;
  onConfirm: (langCode: string) => void;
}

export default function OnboardingModal({ isOpen, onConfirm }: OnboardingModalProps) {
  const [selected, setSelected] = useState<string>(() => {
    // Try to pre-select based on browser language
    if (typeof navigator !== 'undefined') {
      const browserLang = navigator.language;
      const exact = LANGUAGES.find(l => l.code === browserLang);
      if (exact) return exact.code;
      const partial = LANGUAGES.find(l => l.code.startsWith(browserLang.split('-')[0]));
      if (partial) return partial.code;
    }
    return 'pt-BR';
  });

  const [shouldRender, setShouldRender] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const t = setTimeout(() => setAnimateIn(true), 20);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen && shouldRender) {
      setAnimateIn(false);
      const t = setTimeout(() => setShouldRender(false), 150);
      return () => clearTimeout(t);
    }
  }, [isOpen, shouldRender]);

  const handleConfirm = () => {
    i18n.changeLanguage(selected);
    onConfirm(selected);
  };

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center z-[110] transition-all duration-150 ease-out
        ${animateIn ? 'bg-black/50' : 'bg-black/0'}`}
    >
      <div
        className={`bg-[var(--dropdown-bg)] rounded-lg shadow-xl p-8 w-[540px] max-w-[92vw] flex flex-col gap-6
          transition-all duration-150 ease-out
          ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'}`}
      >
        {/* Scrolling ticker */}
        <div
          className="relative h-7 overflow-hidden"
          style={{
            maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
            WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
          }}
        >
          <div className="onboarding-ticker absolute inset-y-0 flex items-center whitespace-nowrap text-[12px] font-bold text-[var(--text-secondary)]"
            style={{ fontFamily: 'Roboto Mono, monospace' }}
          >
            <span>{TICKER_CONTENT}&nbsp;&nbsp;&nbsp;·&nbsp;&nbsp;&nbsp;</span>
            <span>{TICKER_CONTENT}&nbsp;&nbsp;&nbsp;·&nbsp;&nbsp;&nbsp;</span>
          </div>
        </div>

        {/* Language grid — 4 × 2 */}
        <div className="grid grid-cols-4 gap-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setSelected(lang.code)}
              className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded border transition-all cursor-pointer
                ${selected === lang.code
                  ? 'border-[var(--text-primary)] bg-[var(--hover-bg)]'
                  : 'border-[var(--border-primary)] bg-transparent hover:bg-[var(--hover-bg-subtle)] hover:border-[var(--text-secondary)]'
                }`}
            >
              <span className="text-[20px] leading-none">{lang.flag}</span>
              <span
                className="text-[11px] text-[var(--text-primary)] leading-tight text-center"
                style={{ fontFamily: 'Roboto Mono, monospace' }}
              >
                {lang.name}
              </span>
            </button>
          ))}
        </div>

        {/* OK button */}
        <div className="flex justify-end">
          <button
            onClick={handleConfirm}
            className="px-8 py-2 bg-[var(--button-bg)] text-[var(--text-button)] text-[13px] rounded
                       hover:bg-[var(--button-hover)] transition-colors cursor-pointer"
            style={{ fontFamily: 'Roboto Mono, monospace' }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
