'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface AssetSectionProps {
  title: string;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
  mdSymbol?: string; // Markdown symbol like "#", "![]", "[]()"
  isOpen?: boolean; // Controlled mode
  onToggle?: (isOpen: boolean) => void; // Callback for controlled mode
}

export default function AssetSection({ title, count, children, defaultOpen = false, mdSymbol, isOpen: controlledIsOpen, onToggle }: AssetSectionProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen);

  // Use controlled value if provided, otherwise use internal state
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  // Sync internal state with controlled value
  useEffect(() => {
    if (controlledIsOpen !== undefined) {
      setInternalIsOpen(controlledIsOpen);
    }
  }, [controlledIsOpen]);

  const handleToggle = () => {
    const newValue = !isOpen;
    setInternalIsOpen(newValue);
    onToggle?.(newValue);
  };

  return (
    <div>
      {/* Section Header */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between pl-[20px] pr-3 py-2 hover:bg-[var(--hover-bg)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold text-[var(--text-primary)]" style={{ fontFamily: 'Roboto Mono, monospace' }}>
            {title} {mdSymbol && <span className="text-[var(--text-secondary)]">{mdSymbol}</span>}
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
            <div className="relative pl-[32px] pb-2">
              {/* Main vertical tree line - will be hidden after last element via CSS */}
              <div className="absolute left-[20px] top-0 bottom-0 w-[1px] bg-[var(--border-primary)] tree-line"></div>

              {/* Container for children with tree connectors */}
              <div className="relative">
                {children}
              </div>
            </div>
          ) : (
            <div className="pl-[32px]">
              <p className="text-[11px] text-[var(--text-muted)] italic" style={{ fontFamily: 'Roboto Mono, monospace' }}>
                No items
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
