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
          style={{
            width: 'calc((100% - 8px - 8px) / 3)',
            height: 'calc(100% - 8px)',
            top: '4px',
            left: '4px',
            transform: vertical
              ? `translateY(calc(${sliderPosition} * (100% + 4px)))`
              : `translateX(calc(${sliderPosition} * (100% + 4px)))`,
          }}
        />

        {/* Code Only View */}
        <button
          onClick={() => onModeChange('code')}
          className="relative z-10 p-2 rounded transition-colors text-[var(--text-primary)] hover:bg-[var(--bg-code)]/50"
          title={t('viewToggle.codeView')}
        >
        <svg width="18" height="15" viewBox="0 0 18 15" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g clipPath="url(#clip0_10_145)">
            <path d="M0 2.98753V0L10.6894 4.65003V7.06251L0 11.7125V8.72501L7.48514 5.90002L7.7076 5.87506L7.71996 5.80013L7.48514 5.75015L0 2.98753ZM18 15H6.65481V12.6125H18V15Z" fill="currentColor"/>
          </g>
          <defs>
            <clipPath id="clip0_10_145">
              <rect width="18" height="15" fill="white"/>
            </clipPath>
          </defs>
        </svg>
        </button>

        {/* Split View */}
        <button
          onClick={() => onModeChange('split')}
          className="relative z-10 p-2 rounded transition-colors text-[var(--text-primary)] hover:bg-[var(--bg-code)]/50"
          title={t('viewToggle.splitView')}
        >
        <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g clipPath="url(#clip0_12_149)">
            <path d="M15.7564 1.83083H1.3374V4.85189H15.7564V1.83083Z" fill="currentColor"/>
            <path d="M15.1313 4.10089C15.1313 2.86807 14.132 1.86858 12.8989 1.86847H4.10107C2.8681 1.86869 1.86874 2.86813 1.86865 4.10089V12.8987C1.86865 14.1316 2.86805 15.1309 4.10107 15.1312H12.8989C14.132 15.131 15.1313 14.1316 15.1313 12.8987V4.10089ZM16.6313 12.8987C16.6313 14.9602 14.9604 16.631 12.8989 16.6312H4.10107C2.03973 16.6309 0.368652 14.9601 0.368652 12.8987V4.10089C0.368741 2.03959 2.03979 0.368688 4.10107 0.368467H12.8989C14.9603 0.368584 16.6313 2.03953 16.6313 4.10089V12.8987Z" fill="currentColor"/>
            <path d="M8.5 3.22989L8.5 15.8333Z" fill="currentColor"/>
            <path d="M9.25 3.22989L9.25 15.8334H7.75L7.75 3.22989H9.25Z" fill="currentColor"/>
          </g>
          <defs>
            <linearGradient id="paint0_linear_12_149" x1="0.298367" y1="8.5" x2="16.7018" y2="8.5" gradientUnits="userSpaceOnUse">
              <stop/>
            </linearGradient>
            <clipPath id="clip0_12_149">
              <rect width="17" height="17" fill="white"/>
            </clipPath>
          </defs>
        </svg>
        </button>

        {/* Preview Only View */}
        <button
          onClick={() => onModeChange('preview')}
          className="relative z-10 p-2 rounded transition-colors text-[var(--text-primary)] hover:bg-[var(--bg-code)]/50"
          title={t('viewToggle.previewView')}
        >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g clipPath="url(#clip0_39_200)">
            <path d="M13.6726 3.56483C14.2249 3.56483 14.6726 4.01254 14.6726 4.56483C14.6726 5.11711 14.2249 5.56483 13.6726 5.56483L7.49976 5.56483C6.94747 5.56483 6.49976 5.11711 6.49976 4.56483C6.49976 4.01254 6.94747 3.56483 7.49976 3.56483L13.6726 3.56483Z" fill="currentColor"/>
            <path d="M13.6733 8.28241C14.2254 8.28268 14.6733 8.73029 14.6733 9.28241C14.6733 9.83454 14.2254 10.2821 13.6733 10.2824H1.32666C0.774375 10.2824 0.32666 9.8347 0.32666 9.28241C0.32666 8.73013 0.774375 8.28241 1.32666 8.28241H13.6733Z" fill="currentColor"/>
            <path d="M13.6733 13C14.2254 13.0003 14.6733 13.4479 14.6733 14C14.6733 14.5521 14.2254 14.9997 13.6733 15H1.32666C0.774375 15 0.32666 14.5523 0.32666 14C0.32666 13.4477 0.774375 13 1.32666 13H13.6733Z" fill="currentColor"/>
            <path d="M3.12187 1.57729L1.82241 6.54264H0.539551L2.42854 0.497866H3.22981L3.12187 1.57729ZM4.14732 6.54264L2.83956 1.57729L2.71916 0.497866H3.53288L5.43848 6.54264H4.14732ZM4.19299 4.28831V5.29715H1.46536V4.28831H4.19299Z" fill="currentColor"/>
          </g>
          <defs>
            <clipPath id="clip0_39_200">
              <rect width="15" height="15" fill="white"/>
            </clipPath>
          </defs>
        </svg>
        </button>
      </div>
    </div>
  );
}
