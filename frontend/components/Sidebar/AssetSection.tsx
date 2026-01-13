'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface AssetSectionProps {
  title: string;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
  mdSymbol?: string; // Markdown symbol like "#", "![]", "[]()"
}

export default function AssetSection({ title, count, children, defaultOpen = false, mdSymbol }: AssetSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div>
      {/* Section Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-[#F0F0F0] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold text-[#000]" style={{ fontFamily: 'Roboto Mono, monospace' }}>
            {title} {mdSymbol && <span className="text-[#666666]">{mdSymbol}</span>}
          </span>
          <img
            src="/element_fold_icon.svg"
            alt={isOpen ? 'Expanded' : 'Collapsed'}
            className={`w-3 h-2 transition-transform ${isOpen ? '' : '-rotate-90'}`}
          />
        </div>
      </button>

      {/* Section Content */}
      {isOpen && (
        <div className="pr-3 relative">
          {count > 0 ? (
            <div className="relative pl-6 pb-2">
              {/* Main vertical tree line - will be hidden after last element via CSS */}
              <div className="absolute left-3 top-0 bottom-0 w-[1px] bg-[#CCCCCC] tree-line"></div>

              {/* Container for children with tree connectors */}
              <div className="relative">
                {children}
              </div>
            </div>
          ) : (
            <div className="pl-6">
              <p className="text-[11px] text-[#999999] italic" style={{ fontFamily: 'Roboto Mono, monospace' }}>
                No items
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
