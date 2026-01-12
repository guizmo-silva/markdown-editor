'use client';

import { useTranslation } from 'react-i18next';

interface InfoBarProps {
  line: number;
  column: number;
  characters: number;
}

export default function InfoBar({ line, column, characters }: InfoBarProps) {
  const { t } = useTranslation();

  return (
    <div className="h-[24px] bg-[#E9E9E9] flex items-center justify-between px-4 border-t border-[#CCCCCC]">
      {/* Left side - Cursor position */}
      <div className="flex items-center gap-4 text-[10px] text-[#666666]" style={{ fontFamily: 'Roboto Mono, monospace' }}>
        <span>Line: {line}</span>
        <span>|</span>
        <span>Col: {column}</span>
      </div>

      {/* Right side - Character count */}
      <div className="text-[10px] text-[#666666]" style={{ fontFamily: 'Roboto Mono, monospace' }}>
        Characters: {characters}
      </div>
    </div>
  );
}
