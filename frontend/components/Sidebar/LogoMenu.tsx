'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/components/ThemeProvider';
import { useThemedIcon } from '@/utils/useThemedIcon';

interface Language {
  code: string;
  name: string;
  flag: string;
}

const languages: Language[] = [
  { code: 'pt-BR', name: 'Português', flag: '🇧🇷' },
  { code: 'en-US', name: 'English', flag: '🇺🇸' },
  { code: 'es-ES', name: 'Español', flag: '🇪🇸' },
  { code: 'fr-FR', name: 'Français', flag: '🇫🇷' },
  { code: 'de-DE', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'ru-RU', name: 'Русский', flag: '🇷🇺' },
  { code: 'zh-CN', name: '简体中文', flag: '🇨🇳' },
];

export default function LogoMenu() {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { getIconPath } = useThemedIcon();
  const [isOpen, setIsOpen] = useState(false);
  const isDarkMode = theme === 'dark';
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setIsOpen(false);
  };

  const handleDarkModeToggle = () => {
    toggleTheme();
  };

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  return (
    <div className="relative" ref={menuRef}>
      {/* Logo - Clickable */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center hover:opacity-80 transition-opacity cursor-pointer"
        aria-label={t('tooltips.menu')}
        title={t('tooltips.menu')}
      >
        <img
          src={getIconPath('Logo.svg')}
          alt="MD Logo"
          className="h-[32px] w-auto"
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 w-[200px] bg-[var(--dropdown-bg)] border border-[var(--border-primary)] rounded-lg shadow-lg z-50 overflow-hidden"
          style={{ fontFamily: 'Roboto Mono, monospace' }}
        >
          {/* Language Section */}
          <div className="p-3 border-b border-[var(--border-secondary)]">
            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">
              {t('menu.language')}
            </div>
            <div className="space-y-1">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-[12px] transition-colors ${
                    currentLanguage.code === lang.code
                      ? 'bg-[var(--hover-bg)] text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--hover-bg-subtle)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.name}</span>
                  {currentLanguage.code === lang.code && (
                    <svg className="w-3 h-3 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Dark Mode Section */}
          <div className="p-3">
            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">
              {t('menu.appearance')}
            </div>
            <button
              onClick={handleDarkModeToggle}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded text-[12px] text-[var(--text-secondary)] hover:bg-[var(--hover-bg-subtle)] hover:text-[var(--text-primary)] transition-colors"
            >
              <div className="flex items-center gap-2">
                {isDarkMode ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                )}
                <span>{t('menu.darkMode')}</span>
              </div>

              {/* Toggle Switch */}
              <div
                className={`w-8 h-4 rounded-full transition-colors relative ${
                  isDarkMode ? 'bg-[var(--text-primary)]' : 'bg-[var(--border-primary)]'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-3 h-3 rounded-full shadow transition-transform ${
                    isDarkMode ? 'translate-x-4 bg-[var(--bg-primary)]' : 'translate-x-0.5 bg-white'
                  }`}
                />
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
