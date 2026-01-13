'use client';

import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import AssetSection from './AssetSection';
import { FileBrowser } from '@/components/FileBrowser';
import { ViewToggle, ViewMode } from '@/components/ViewToggle';
import { parseMarkdownAssets, type MarkdownAssets } from '@/utils/markdownParser';

interface AssetsSidebarProps {
  markdown: string;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onNavigateToLine?: (line: number) => void;
  onFileSelect?: (filePath: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function AssetsSidebar({
  markdown,
  viewMode,
  onViewModeChange,
  onNavigateToLine,
  onFileSelect,
  isCollapsed = false,
  onToggleCollapse
}: AssetsSidebarProps) {
  const { t } = useTranslation();

  // Parse markdown to extract all assets
  const assets: MarkdownAssets = useMemo(() => {
    return parseMarkdownAssets(markdown);
  }, [markdown]);

  const handleItemClick = (line: number) => {
    if (onNavigateToLine) {
      onNavigateToLine(line);
    }
  };

  return (
    <div className="w-[230px] h-full bg-white border-r border-[#CCCCCC] flex flex-col relative">
      {/* Top Section: Logo and View Toggle */}
      <div className="px-4 py-3 border-b border-[#CCCCCC] flex items-center justify-between gap-3">
        {/* Logo */}
        <img
          src="/Logo.svg"
          alt="MD Logo"
          className="h-[32px] w-auto"
        />

        {/* View Toggle */}
        <ViewToggle currentMode={viewMode} onModeChange={onViewModeChange} />
      </div>

      {/* Content Section - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {/* Conteúdo Section */}
        <div className="border-b border-[#CCCCCC]">
          <div className="px-3 py-3">
            <h2 className="text-[20px] font-bold text-[#000]" style={{ fontFamily: 'Roboto Mono, monospace' }}>
              Conteúdo
            </h2>
          </div>

          {/* Headings Section */}
          <AssetSection title={t('sidebar.headings', 'Titulo')} count={assets.headings.length} defaultOpen={true} mdSymbol="#">
            {assets.headings.map((heading, index) => {
              const isLast = index === assets.headings.length - 1;
              return (
                <div
                  key={index}
                  onClick={() => handleItemClick(heading.line)}
                  className={`mb-1 p-2 hover:bg-[#F0F0F0] cursor-pointer rounded transition-colors relative ${isLast ? 'tree-last-item' : ''}`}
                  style={{ paddingLeft: `${(heading.level - 1) * 8 + 8}px` }}
                >
                  {/* Horizontal connector from vertical line to item */}
                  <div className="absolute left-[-12px] top-[14px] w-3 h-[1px] bg-[#CCCCCC]"></div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-[#999999]" style={{ fontFamily: 'Roboto Mono, monospace' }}>
                      {'#'.repeat(heading.level)}
                    </span>
                    <span className="text-[11px] text-[#000] font-medium" style={{ fontFamily: 'Roboto Mono, monospace' }}>
                      {heading.text}
                    </span>
                    <span className="text-[9px] text-[#999999]" style={{ fontFamily: 'Roboto Mono, monospace' }}>
                      (Line {heading.line})
                    </span>
                  </div>
                </div>
              );
            })}
          </AssetSection>

          {/* Images Section */}
          <AssetSection title={t('sidebar.images', 'Imagens')} count={assets.images.length} defaultOpen={false} mdSymbol="![]">
            {assets.images.map((image, index) => {
              const isLast = index === assets.images.length - 1;
              return (
                <div
                  key={index}
                  onClick={() => handleItemClick(image.line)}
                  className={`mb-2 p-2 hover:bg-[#F0F0F0] cursor-pointer rounded transition-colors relative ${isLast ? 'tree-last-item' : ''}`}
                >
                  {/* Horizontal connector from vertical line to item */}
                  <div className="absolute left-[-12px] top-[14px] w-3 h-[1px] bg-[#CCCCCC]"></div>

                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[11px] text-[#000] font-medium" style={{ fontFamily: 'Roboto Mono, monospace' }}>
                      {image.alt}
                    </span>
                    <span className="text-[9px] text-[#999999]" style={{ fontFamily: 'Roboto Mono, monospace' }}>
                      (Line {image.line})
                    </span>
                  </div>
                  <div className="text-[10px] text-[#666666] truncate" style={{ fontFamily: 'Roboto Mono, monospace' }}>
                    {image.url}
                  </div>
                </div>
              );
            })}
          </AssetSection>

          {/* Links Section */}
          <AssetSection title={t('sidebar.links', 'Links')} count={assets.links.length} defaultOpen={false} mdSymbol="[]()">
            {assets.links.map((link, index) => {
              const isLast = index === assets.links.length - 1;
              return (
                <div
                  key={index}
                  onClick={() => handleItemClick(link.line)}
                  className={`mb-2 p-2 hover:bg-[#F0F0F0] cursor-pointer rounded transition-colors relative ${isLast ? 'tree-last-item' : ''}`}
                >
                  {/* Horizontal connector from vertical line to item */}
                  <div className="absolute left-[-12px] top-[14px] w-3 h-[1px] bg-[#CCCCCC]"></div>

                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {link.isExternal ? (
                      <svg className="w-3 h-3 text-[#666666] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3 text-[#666666] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    )}
                    <span className="text-[11px] text-[#000] font-medium" style={{ fontFamily: 'Roboto Mono, monospace' }}>
                      {link.text}
                    </span>
                    <span className="text-[9px] text-[#999999]" style={{ fontFamily: 'Roboto Mono, monospace' }}>
                      (Line {link.line})
                    </span>
                  </div>
                  <div className="text-[10px] text-[#666666] truncate" style={{ fontFamily: 'Roboto Mono, monospace' }}>
                    {link.url}
                  </div>
                </div>
              );
            })}
          </AssetSection>

          {/* Alerts Section */}
          <AssetSection title={t('sidebar.alerts', 'Alerts')} count={assets.alerts.length} mdSymbol="[!]">
            {assets.alerts.map((alert, index) => {
              const isLast = index === assets.alerts.length - 1;
              return (
                <div
                  key={index}
                  onClick={() => handleItemClick(alert.line)}
                  className={`mb-2 p-2 hover:bg-[#F0F0F0] cursor-pointer rounded transition-colors relative ${isLast ? 'tree-last-item' : ''}`}
                >
                  {/* Horizontal connector from vertical line to item */}
                  <div className="absolute left-[-12px] top-[14px] w-3 h-[1px] bg-[#CCCCCC]"></div>

                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        alert.type === 'NOTE' ? 'bg-blue-100 text-blue-800' :
                        alert.type === 'TIP' ? 'bg-green-100 text-green-800' :
                        alert.type === 'IMPORTANT' ? 'bg-purple-100 text-purple-800' :
                        alert.type === 'WARNING' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}
                      style={{ fontFamily: 'Roboto Mono, monospace' }}
                    >
                      {alert.type}
                    </span>
                    <span className="text-[9px] text-[#999999]" style={{ fontFamily: 'Roboto Mono, monospace' }}>
                      (Line {alert.line})
                    </span>
                  </div>
                  <div className="text-[11px] text-[#000] line-clamp-2" style={{ fontFamily: 'Roboto Mono, monospace' }}>
                    {alert.content}
                  </div>
                </div>
              );
            })}
          </AssetSection>

          {/* Footnotes Section */}
          <AssetSection title={t('sidebar.footnotes', 'Footnotes')} count={assets.footnotes.length} mdSymbol="[^]">
            {assets.footnotes.map((footnote, index) => {
              const isLast = index === assets.footnotes.length - 1;
              return (
                <div
                  key={index}
                  onClick={() => handleItemClick(footnote.line)}
                  className={`mb-2 p-2 hover:bg-[#F0F0F0] cursor-pointer rounded transition-colors relative ${isLast ? 'tree-last-item' : ''}`}
                >
                  {/* Horizontal connector from vertical line to item */}
                  <div className="absolute left-[-12px] top-[14px] w-3 h-[1px] bg-[#CCCCCC]"></div>

                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[11px] text-[#000] font-medium" style={{ fontFamily: 'Roboto Mono, monospace' }}>
                      [^{footnote.id}]
                    </span>
                    <span className="text-[9px] text-[#999999]" style={{ fontFamily: 'Roboto Mono, monospace' }}>
                      (Line {footnote.line})
                    </span>
                  </div>
                  {footnote.definition && (
                    <div className="text-[10px] text-[#666666] line-clamp-2" style={{ fontFamily: 'Roboto Mono, monospace' }}>
                      {footnote.definition}
                    </div>
                  )}
                </div>
              );
            })}
          </AssetSection>

          {/* Tables Section */}
          <AssetSection title={t('sidebar.tables', 'Tables')} count={assets.tables.length} mdSymbol="|">
            {assets.tables.map((table, index) => {
              const isLast = index === assets.tables.length - 1;
              return (
                <div
                  key={index}
                  onClick={() => handleItemClick(table.line)}
                  className={`mb-2 p-2 hover:bg-[#F0F0F0] cursor-pointer rounded transition-colors relative ${isLast ? 'tree-last-item' : ''}`}
                >
                  {/* Horizontal connector from vertical line to item */}
                  <div className="absolute left-[-12px] top-[14px] w-3 h-[1px] bg-[#CCCCCC]"></div>

                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[11px] text-[#000] font-medium" style={{ fontFamily: 'Roboto Mono, monospace' }}>
                      {table.header}
                    </span>
                    <span className="text-[9px] text-[#999999]" style={{ fontFamily: 'Roboto Mono, monospace' }}>
                      (Line {table.line})
                    </span>
                  </div>
                  <div className="text-[10px] text-[#666666]" style={{ fontFamily: 'Roboto Mono, monospace' }}>
                    {table.rows} rows × {table.cols} columns
                  </div>
                </div>
              );
            })}
          </AssetSection>
        </div>

        {/* Arquivos Section */}
        <div>
          <div className="px-3 py-3">
            <h2 className="text-[20px] font-bold text-[#000]" style={{ fontFamily: 'Roboto Mono, monospace' }}>
              Arquivos
            </h2>
          </div>
          <FileBrowser onFileSelect={onFileSelect} />
        </div>
      </div>

      {/* Collapse Button - Fixed at bottom right */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="absolute bottom-4 right-4 w-10 h-10 bg-white rounded-full shadow-md hover:shadow-lg flex items-center justify-center transition-all border border-[#CCCCCC]"
          aria-label="Toggle sidebar"
        >
          <img
            src="/hide_side_bar_icon.svg"
            alt="Toggle sidebar"
            className="h-4 w-4"
          />
        </button>
      )}
    </div>
  );
}
