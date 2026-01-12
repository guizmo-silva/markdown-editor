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
}

export default function AssetsSidebar({ markdown, viewMode, onViewModeChange, onNavigateToLine, onFileSelect }: AssetsSidebarProps) {
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
    <div className="w-[230px] h-full bg-white border-r border-[#CCCCCC] flex flex-col">
      {/* View Toggle - Top of sidebar */}
      <ViewToggle currentMode={viewMode} onModeChange={onViewModeChange} />

      {/* Content Section - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {/* Sidebar Header */}
        <div className="px-3 py-3 border-b border-[#CCCCCC]">
          <h2 className="text-[20px] font-bold text-[#000]" style={{ fontFamily: 'Roboto Mono, monospace' }}>
            {t('sidebar.title', 'Assets')}
          </h2>
        </div>

      {/* Headings Section */}
      <AssetSection title={t('sidebar.headings', 'Headings')} count={assets.headings.length} defaultOpen={true}>
        {assets.headings.map((heading, index) => (
          <div
            key={index}
            onClick={() => handleItemClick(heading.line)}
            className="mb-1 p-2 hover:bg-[#F0F0F0] cursor-pointer rounded transition-colors"
            style={{ paddingLeft: `${(heading.level - 1) * 8 + 8}px` }}
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#999999]" style={{ fontFamily: 'Roboto Mono, monospace' }}>
                {'#'.repeat(heading.level)}
              </span>
              <span className="text-[11px] text-[#000] font-medium" style={{ fontFamily: 'Roboto Mono, monospace' }}>
                {heading.text}
              </span>
            </div>
            <div className="text-[9px] text-[#999999] mt-1" style={{ fontFamily: 'Roboto Mono, monospace' }}>
              Line {heading.line}
            </div>
          </div>
        ))}
      </AssetSection>

      {/* Images Section */}
      <AssetSection title={t('sidebar.images', 'Images')} count={assets.images.length} defaultOpen={false}>
        {assets.images.map((image, index) => (
          <div
            key={index}
            onClick={() => handleItemClick(image.line)}
            className="mb-2 p-2 hover:bg-[#F0F0F0] cursor-pointer rounded transition-colors"
          >
            <div className="text-[11px] text-[#000] font-medium mb-1" style={{ fontFamily: 'Roboto Mono, monospace' }}>
              {image.alt}
            </div>
            <div className="text-[10px] text-[#666666] truncate" style={{ fontFamily: 'Roboto Mono, monospace' }}>
              {image.url}
            </div>
            <div className="text-[9px] text-[#999999] mt-1" style={{ fontFamily: 'Roboto Mono, monospace' }}>
              Line {image.line}
            </div>
          </div>
        ))}
      </AssetSection>

      {/* Links Section */}
      <AssetSection title={t('sidebar.links', 'Links')} count={assets.links.length} defaultOpen={false}>
        {assets.links.map((link, index) => (
          <div
            key={index}
            onClick={() => handleItemClick(link.line)}
            className="mb-2 p-2 hover:bg-[#F0F0F0] cursor-pointer rounded transition-colors"
          >
            <div className="flex items-center gap-1 mb-1">
              {link.isExternal ? (
                <svg className="w-3 h-3 text-[#666666]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              ) : (
                <svg className="w-3 h-3 text-[#666666]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              )}
              <div className="text-[11px] text-[#000] font-medium" style={{ fontFamily: 'Roboto Mono, monospace' }}>
                {link.text}
              </div>
            </div>
            <div className="text-[10px] text-[#666666] truncate" style={{ fontFamily: 'Roboto Mono, monospace' }}>
              {link.url}
            </div>
            <div className="text-[9px] text-[#999999] mt-1" style={{ fontFamily: 'Roboto Mono, monospace' }}>
              Line {link.line}
            </div>
          </div>
        ))}
      </AssetSection>

      {/* Alerts Section */}
      <AssetSection title={t('sidebar.alerts', 'Alerts')} count={assets.alerts.length}>
        {assets.alerts.map((alert, index) => (
          <div
            key={index}
            onClick={() => handleItemClick(alert.line)}
            className="mb-2 p-2 hover:bg-[#F0F0F0] cursor-pointer rounded transition-colors"
          >
            <div className="flex items-center gap-1 mb-1">
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
            </div>
            <div className="text-[11px] text-[#000] line-clamp-2" style={{ fontFamily: 'Roboto Mono, monospace' }}>
              {alert.content}
            </div>
            <div className="text-[9px] text-[#999999] mt-1" style={{ fontFamily: 'Roboto Mono, monospace' }}>
              Line {alert.line}
            </div>
          </div>
        ))}
      </AssetSection>

      {/* Footnotes Section */}
      <AssetSection title={t('sidebar.footnotes', 'Footnotes')} count={assets.footnotes.length}>
        {assets.footnotes.map((footnote, index) => (
          <div
            key={index}
            onClick={() => handleItemClick(footnote.line)}
            className="mb-2 p-2 hover:bg-[#F0F0F0] cursor-pointer rounded transition-colors"
          >
            <div className="text-[11px] text-[#000] font-medium mb-1" style={{ fontFamily: 'Roboto Mono, monospace' }}>
              [^{footnote.id}]
            </div>
            {footnote.definition && (
              <div className="text-[10px] text-[#666666] line-clamp-2" style={{ fontFamily: 'Roboto Mono, monospace' }}>
                {footnote.definition}
              </div>
            )}
            <div className="text-[9px] text-[#999999] mt-1" style={{ fontFamily: 'Roboto Mono, monospace' }}>
              Line {footnote.line}
            </div>
          </div>
        ))}
      </AssetSection>

      {/* Tables Section */}
      <AssetSection title={t('sidebar.tables', 'Tables')} count={assets.tables.length}>
        {assets.tables.map((table, index) => (
          <div
            key={index}
            onClick={() => handleItemClick(table.line)}
            className="mb-2 p-2 hover:bg-[#F0F0F0] cursor-pointer rounded transition-colors"
          >
            <div className="text-[11px] text-[#000] font-medium mb-1" style={{ fontFamily: 'Roboto Mono, monospace' }}>
              {table.header}
            </div>
            <div className="text-[10px] text-[#666666]" style={{ fontFamily: 'Roboto Mono, monospace' }}>
              {table.rows} rows × {table.cols} columns
            </div>
            <div className="text-[9px] text-[#999999] mt-1" style={{ fontFamily: 'Roboto Mono, monospace' }}>
              Line {table.line}
            </div>
          </div>
        ))}
      </AssetSection>

        {/* File Browser */}
        <FileBrowser onFileSelect={onFileSelect} />
      </div>
    </div>
  );
}
