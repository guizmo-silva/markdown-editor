'use client';

import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';

interface PreviewInfoBarProps {
  content: string;
}

export default function PreviewInfoBar({ content }: PreviewInfoBarProps) {
  const { t } = useTranslation();

  // Calculate statistics
  const stats = useMemo(() => {
    // Remove markdown syntax for more accurate word count
    const plainText = content
      .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
      .replace(/\[.*?\]\(.*?\)/g, '') // Remove links
      .replace(/`{3}[\s\S]*?`{3}/g, '') // Remove code blocks
      .replace(/`.*?`/g, '') // Remove inline code
      .replace(/[#*_~\->\[\]]/g, '') // Remove markdown symbols
      .trim();

    const characters = content.length;
    const words = plainText
      .split(/\s+/)
      .filter(word => word.length > 0).length;

    return { characters, words };
  }, [content]);

  return (
    <div className="h-[24px] bg-[var(--bg-secondary)] flex items-center justify-between px-4 border-t border-[var(--border-primary)]">
      {/* Left side - Word count */}
      <div className="flex items-center gap-4 text-[10px] text-[var(--text-secondary)]" style={{ fontFamily: 'Roboto Mono, monospace' }}>
        <span>Words: {stats.words}</span>
      </div>

      {/* Right side - Character count */}
      <div className="text-[10px] text-[var(--text-secondary)]" style={{ fontFamily: 'Roboto Mono, monospace' }}>
        Characters: {stats.characters}
      </div>
    </div>
  );
}
