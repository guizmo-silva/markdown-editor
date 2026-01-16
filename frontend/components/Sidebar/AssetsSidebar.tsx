'use client';

import { useTranslation } from 'react-i18next';
import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import AssetSection from './AssetSection';
import LogoMenu from './LogoMenu';
import { FileBrowser } from '@/components/FileBrowser';
import { ViewToggle, ViewMode } from '@/components/ViewToggle';
import { parseMarkdownAssets, type MarkdownAssets } from '@/utils/markdownParser';

type SectionId = 'headings' | 'images' | 'links' | 'alerts' | 'footnotes' | 'tables';

const SECTION_MIN_PERCENT = 20; // Minimum 20% for each section
const SECTION_MAX_PERCENT = 80; // Maximum 80% for each section

interface AssetsSidebarProps {
  markdown: string;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onNavigateToLine?: (line: number) => void;
  onFileSelect?: (filePath: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  width?: number;
}

export default function AssetsSidebar({
  markdown,
  viewMode,
  onViewModeChange,
  onNavigateToLine,
  onFileSelect,
  isCollapsed = false,
  onToggleCollapse,
  width = 230
}: AssetsSidebarProps) {
  const { t } = useTranslation();

  // State to track which sections are open
  const [openSections, setOpenSections] = useState<Record<SectionId, boolean>>({
    headings: true, // Default open
    images: false,
    links: false,
    alerts: false,
    footnotes: false,
    tables: false,
  });

  // Trigger for collapsing all files in FileBrowser
  const [filesCollapseTrigger, setFilesCollapseTrigger] = useState(0);

  // State for section divider resize
  const [contentSectionPercent, setContentSectionPercent] = useState(50);
  const [isResizingSection, setIsResizingSection] = useState(false);
  const sectionContainerRef = useRef<HTMLDivElement>(null);

  // Parse markdown to extract all assets
  const assets: MarkdownAssets = useMemo(() => {
    return parseMarkdownAssets(markdown);
  }, [markdown]);

  // Handle section toggle
  const handleSectionToggle = (sectionId: SectionId, isOpen: boolean) => {
    setOpenSections(prev => ({ ...prev, [sectionId]: isOpen }));
  };

  // Collapse all content sections
  const handleCollapseAllContent = () => {
    // Check if any section is open
    const anyOpen = Object.values(openSections).some(v => v);
    if (anyOpen) {
      setOpenSections({
        headings: false,
        images: false,
        links: false,
        alerts: false,
        footnotes: false,
        tables: false,
      });
    }
  };

  // Collapse all files
  const handleCollapseAllFiles = () => {
    setFilesCollapseTrigger(prev => prev + 1);
  };

  const handleItemClick = (line: number) => {
    if (onNavigateToLine) {
      onNavigateToLine(line);
    }
  };

  // Section divider resize handlers
  const handleSectionResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSection(true);
  }, []);

  const handleSectionResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizingSection || !sectionContainerRef.current) return;

    const container = sectionContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    const relativeY = e.clientY - containerRect.top;
    const percentage = (relativeY / containerRect.height) * 100;

    if (percentage >= SECTION_MIN_PERCENT && percentage <= SECTION_MAX_PERCENT) {
      setContentSectionPercent(percentage);
    } else if (percentage < SECTION_MIN_PERCENT) {
      setContentSectionPercent(SECTION_MIN_PERCENT);
    } else if (percentage > SECTION_MAX_PERCENT) {
      setContentSectionPercent(SECTION_MAX_PERCENT);
    }
  }, [isResizingSection]);

  const handleSectionResizeEnd = useCallback(() => {
    setIsResizingSection(false);
  }, []);

  useEffect(() => {
    if (isResizingSection) {
      document.addEventListener('mousemove', handleSectionResizeMove);
      document.addEventListener('mouseup', handleSectionResizeEnd);
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleSectionResizeMove);
      document.removeEventListener('mouseup', handleSectionResizeEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingSection, handleSectionResizeMove, handleSectionResizeEnd]);

  return (
    <div className="h-full bg-white border-r border-[#CCCCCC] flex flex-col relative" style={{ width }}>
      {/* Top Section: Logo and View Toggle */}
      <div className="pl-[20px] pr-4 pt-[20px] pb-3 flex items-center justify-between gap-3">
        {/* Logo with Menu */}
        <LogoMenu />

        {/* View Toggle */}
        <ViewToggle currentMode={viewMode} onModeChange={onViewModeChange} />
      </div>

      {/* Sections Container */}
      <div ref={sectionContainerRef} className="flex-1 flex flex-col overflow-hidden">
        {/* Conteúdo Section - with independent scroll */}
        <div
          className="overflow-hidden flex flex-col"
          style={{ height: `${contentSectionPercent}%` }}
        >
          <div className="pl-[20px] pr-3 py-3 flex-shrink-0">
            <h2
              className="text-[20px] font-bold text-[#000] cursor-pointer hover:text-[#666666] transition-colors"
              style={{ fontFamily: 'Roboto Mono, monospace' }}
              onClick={handleCollapseAllContent}
              title="Click to collapse all"
            >
              {t('sidebar.content')}
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto">

          {/* Headings Section */}
          <AssetSection title={t('sidebar.headings', 'Titulo')} count={assets.headings.length} mdSymbol="#" isOpen={openSections.headings} onToggle={(isOpen) => handleSectionToggle('headings', isOpen)}>
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
          <AssetSection title={t('sidebar.images', 'Imagens')} count={assets.images.length} mdSymbol="![]" isOpen={openSections.images} onToggle={(isOpen) => handleSectionToggle('images', isOpen)}>
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
          <AssetSection title={t('sidebar.links', 'Links')} count={assets.links.length} mdSymbol="[]()" isOpen={openSections.links} onToggle={(isOpen) => handleSectionToggle('links', isOpen)}>
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
          <AssetSection title={t('sidebar.alerts', 'Alerts')} count={assets.alerts.length} mdSymbol="[!]" isOpen={openSections.alerts} onToggle={(isOpen) => handleSectionToggle('alerts', isOpen)}>
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
          <AssetSection title={t('sidebar.footnotes', 'Footnotes')} count={assets.footnotes.length} mdSymbol="[^]" isOpen={openSections.footnotes} onToggle={(isOpen) => handleSectionToggle('footnotes', isOpen)}>
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
          <AssetSection title={t('sidebar.tables', 'Tables')} count={assets.tables.length} mdSymbol="|" isOpen={openSections.tables} onToggle={(isOpen) => handleSectionToggle('tables', isOpen)}>
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
        </div>

        {/* Section Divider - Resizable (larger hit area, thin visual line) */}
        <div
          className="h-[11px] cursor-row-resize flex-shrink-0 flex items-center group"
          onMouseDown={handleSectionResizeStart}
        >
          <div className="w-full h-[1px] bg-[#CCCCCC] group-hover:bg-[#999999] group-active:bg-[#999999] transition-colors" />
        </div>

        {/* Arquivos Section - with independent scroll */}
        <div
          className="overflow-hidden flex flex-col"
          style={{ height: `calc(${100 - contentSectionPercent}% - 11px)` }}
        >
          <div className="pl-[20px] pr-3 py-3 flex-shrink-0">
            <h2
              className="text-[20px] font-bold text-[#000] cursor-pointer hover:text-[#666666] transition-colors"
              style={{ fontFamily: 'Roboto Mono, monospace' }}
              onClick={handleCollapseAllFiles}
              title="Click to collapse all"
            >
              {t('fileBrowser.title')}
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            <FileBrowser onFileSelect={onFileSelect} collapseAllTrigger={filesCollapseTrigger} />
          </div>
        </div>
      </div>

      {/* Bottom Section - Export and Collapse buttons */}
      <div className="flex-shrink-0 px-4 py-4 flex items-center justify-between">
        {/* Export Button */}
        <button
          className="px-4 py-2 bg-[#000] text-white text-[12px] font-medium rounded hover:bg-[#333] transition-colors"
          style={{ fontFamily: 'Roboto Mono, monospace' }}
        >
          {t('buttons.export')}
        </button>

        {/* Collapse Button */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-2 hover:bg-[#E9E9E9] rounded transition-colors"
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
    </div>
  );
}
