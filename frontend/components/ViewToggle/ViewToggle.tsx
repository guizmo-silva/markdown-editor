'use client';

import { useTranslation } from 'react-i18next';

export type ViewMode = 'code' | 'split' | 'preview';

interface ViewToggleProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  vertical?: boolean;
}

export default function ViewToggle({ currentMode, onModeChange, vertical = false }: ViewToggleProps) {
  const { t } = useTranslation();

  // Calculate slider position based on current mode
  const getSliderPosition = () => {
    switch (currentMode) {
      case 'code': return 0;
      case 'split': return 1;
      case 'preview': return 2;
      default: return 0;
    }
  };

  const sliderPosition = getSliderPosition();

  return (
    <div className="flex items-center justify-center gap-1">
      <div className={`relative inline-flex bg-[var(--bg-secondary)] rounded-lg p-1 gap-1 ${vertical ? 'flex-col' : ''}`}>
        {/* Sliding indicator */}
        <div
          className="absolute bg-[var(--bg-primary)] rounded shadow-sm transition-transform duration-200 ease-out"
          style={vertical ? {
            width: 'calc(100% - 8px)',
            height: 'calc((100% - 8px - 8px) / 3)',
            top: '4px',
            left: '4px',
            transform: `translateY(calc(${sliderPosition} * (100% + 4px)))`,
          } : {
            width: 'calc((100% - 8px - 8px) / 3)',
            height: 'calc(100% - 8px)',
            top: '4px',
            left: '4px',
            transform: `translateX(calc(${sliderPosition} * (100% + 4px)))`,
          }}
        />

        {/* Code Only View */}
        <button
          onClick={() => onModeChange('code')}
          className="relative z-10 p-2 rounded transition-colors text-[var(--text-primary)] hover:bg-[var(--bg-code)]/50"
          title={t('viewToggle.codeView')}
        >
        <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 4.5V1.5L10 6V8.5L0 13V10L7 7.25L7.2 7.22L7.21 7.15L7 7.1L0 4.5ZM17 16H6.25V13.5H17V16Z" fill="currentColor"/>
        </svg>
        </button>

        {/* Split View */}
        <button
          onClick={() => onModeChange('split')}
          className="relative z-10 p-2 rounded transition-colors text-[var(--text-primary)] hover:bg-[var(--bg-code)]/50"
          title={t('viewToggle.splitView')}
        >
        <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="1.5" y="1.5" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
          <rect x="7.75" y="1.5" width="1.5" height="14" fill="currentColor"/>
        </svg>
        </button>

        {/* Preview Only View */}
        <button
          onClick={() => onModeChange('preview')}
          className="relative z-10 p-2 rounded transition-colors text-[var(--text-primary)] hover:bg-[var(--bg-code)]/50"
          title={t('viewToggle.previewView')}
        >
        <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15.5 4.5C16 4.5 16.5 5 16.5 5.5C16.5 6 16 6.5 15.5 6.5H8.5C8 6.5 7.5 6 7.5 5.5C7.5 5 8 4.5 8.5 4.5H15.5Z" fill="currentColor"/>
          <path d="M15.5 9.25C16 9.25 16.5 9.75 16.5 10.25C16.5 10.75 16 11.25 15.5 11.25H1.5C1 11.25 0.5 10.75 0.5 10.25C0.5 9.75 1 9.25 1.5 9.25H15.5Z" fill="currentColor"/>
          <path d="M15.5 14C16 14 16.5 14.5 16.5 15C16.5 15.5 16 16 15.5 16H1.5C1 16 0.5 15.5 0.5 15C0.5 14.5 1 14 1.5 14H15.5Z" fill="currentColor"/>
          <path d="M3.5 2.5L2.2 7H1L2.7 1.5H3.4L3.5 2.5ZM4.4 7L3.2 2.5L3.1 1.5H3.8L5.6 7H4.4ZM4.5 5V6H2V5H4.5Z" fill="currentColor"/>
        </svg>
        </button>
      </div>
    </div>
  );
}
