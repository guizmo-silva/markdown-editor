'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface AssetSectionProps {
  title: string;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export default function AssetSection({ title, count, children, defaultOpen = false }: AssetSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-[#CCCCCC]">
      {/* Section Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-[#F0F0F0] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-[#000]" style={{ fontFamily: 'Roboto Mono, monospace' }}>
            {title}
          </span>
          <span className="text-[11px] text-[#666666]" style={{ fontFamily: 'Roboto Mono, monospace' }}>
            ({count})
          </span>
        </div>
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Section Content */}
      {isOpen && (
        <div className="px-3 pb-2">
          {count > 0 ? children : (
            <p className="text-[11px] text-[#999999] italic" style={{ fontFamily: 'Roboto Mono, monospace' }}>
              No items
            </p>
          )}
        </div>
      )}
    </div>
  );
}
