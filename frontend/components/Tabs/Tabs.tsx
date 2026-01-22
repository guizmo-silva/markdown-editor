'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useThemedIcon } from '@/utils/useThemedIcon';

interface Tab {
  id: string;
  title: string;
  isUnsaved?: boolean;
}

interface TabsProps {
  tabs?: Tab[];
  activeTabId?: string;
  onTabChange?: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
  onNewTab?: () => void;
  onTabRename?: (tabId: string, newName: string) => void;
  onTabReorder?: (fromIndex: number, toIndex: number) => void;
}

interface DragState {
  tabId: string;
  tabIndex: number;
  initialMouseX: number;
  tabElement: HTMLElement;
  tabRect: DOMRect;
  containerRect: DOMRect;
}

export default function Tabs({
  tabs = [{ id: 'untitled', title: 'Untitled' }],
  activeTabId = 'untitled',
  onTabChange,
  onTabClose,
  onNewTab,
  onTabRename,
  onTabReorder
}: TabsProps) {
  const { t } = useTranslation();
  const { getIconPath } = useThemedIcon();
  const [activeTab, setActiveTab] = useState(activeTabId);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Custom drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);
  const [ghostPosition, setGhostPosition] = useState<number>(0);
  const dragStateRef = useRef<DragState | null>(null);
  const tabRefs = useRef<Map<string, HTMLElement>>(new Map());
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  // Overflow detection state
  const [hasOverflow, setHasOverflow] = useState(false);

  // Focus input when editing starts
  useEffect(() => {
    if (editingTabId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTabId]);

  // Detect overflow in tabs container
  useEffect(() => {
    const container = tabsContainerRef.current;
    if (!container) return;

    const checkOverflow = () => {
      setHasOverflow(container.scrollWidth > container.clientWidth);
    };

    checkOverflow();

    const resizeObserver = new ResizeObserver(checkOverflow);
    resizeObserver.observe(container);

    const mutationObserver = new MutationObserver(checkOverflow);
    mutationObserver.observe(container, { childList: true, subtree: true });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [tabs.length]);

  // Update active tab when prop changes
  useEffect(() => {
    setActiveTab(activeTabId);
  }, [activeTabId]);

  // Handle mouse move during drag
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragStateRef.current || !tabsContainerRef.current) return;

    const { initialMouseX, tabRect, containerRect } = dragStateRef.current;
    const deltaX = e.clientX - initialMouseX;

    // Calculate new ghost position, constrained to container bounds
    const minX = containerRect.left - tabRect.left;
    const maxX = containerRect.right - tabRect.right - (hasOverflow ? 48 : 8); // Account for padding
    const newPosition = Math.max(minX, Math.min(maxX, deltaX));

    setGhostPosition(newPosition);

    // Determine which tab we're over based on mouse X position
    const mouseX = e.clientX;
    let newDragOverId: string | null = null;

    tabRefs.current.forEach((element, tabId) => {
      if (tabId === dragStateRef.current?.tabId) return;
      const rect = element.getBoundingClientRect();
      const tabCenter = rect.left + rect.width / 2;

      // Check if mouse is over this tab's area
      if (mouseX >= rect.left && mouseX <= rect.right) {
        newDragOverId = tabId;
      }
    });

    setDragOverTabId(newDragOverId);
  }, [hasOverflow]);

  // Handle mouse up to end drag
  const handleMouseUp = useCallback(() => {
    if (!dragStateRef.current) return;

    const { tabId: draggedId, tabIndex: fromIndex } = dragStateRef.current;

    if (dragOverTabId && dragOverTabId !== draggedId) {
      const toIndex = tabs.findIndex(tab => tab.id === dragOverTabId);
      if (toIndex !== -1 && fromIndex !== toIndex) {
        onTabReorder?.(fromIndex, toIndex);
      }
    }

    // Cleanup
    setIsDragging(false);
    setDraggedTabId(null);
    setDragOverTabId(null);
    setGhostPosition(0);
    dragStateRef.current = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [dragOverTabId, tabs, onTabReorder]);

  // Add/remove global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleTabClick = (tabId: string) => {
    if (isDragging) return;
    setActiveTab(tabId);
    onTabChange?.(tabId);
  };

  const handleTabClose = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    onTabClose?.(tabId);
  };

  const handleNewTab = () => {
    onNewTab?.();
  };

  const handleDoubleClick = (e: React.MouseEvent, tab: Tab) => {
    e.stopPropagation();
    setEditingTabId(tab.id);
    const nameWithoutExt = tab.title.replace(/\.md$/, '');
    setEditValue(nameWithoutExt);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, tabId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      finishEditing(tabId);
    } else if (e.key === 'Escape') {
      setEditingTabId(null);
      setEditValue('');
    }
  };

  const handleEditBlur = (tabId: string) => {
    finishEditing(tabId);
  };

  const finishEditing = (tabId: string) => {
    if (editValue.trim()) {
      let newName = editValue.trim();
      if (!newName.endsWith('.md')) {
        newName += '.md';
      }
      newName = newName.replace(/[<>:"/\\|?*]/g, '');

      if (newName && newName !== '.md') {
        onTabRename?.(tabId, newName);
      }
    }
    setEditingTabId(null);
    setEditValue('');
  };

  // Custom drag start handler
  const handleMouseDown = (e: React.MouseEvent, tabId: string, tabIndex: number) => {
    if (editingTabId === tabId) return;
    if (e.button !== 0) return; // Only left click

    const tabElement = tabRefs.current.get(tabId);
    const container = tabsContainerRef.current;
    if (!tabElement || !container) return;

    e.preventDefault();

    const tabRect = tabElement.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    dragStateRef.current = {
      tabId,
      tabIndex,
      initialMouseX: e.clientX,
      tabElement,
      tabRect,
      containerRect
    };

    setIsDragging(true);
    setDraggedTabId(tabId);
    setGhostPosition(0);
  };

  // Handle horizontal scroll with mouse wheel
  const handleWheel = (e: React.WheelEvent) => {
    if (tabsContainerRef.current) {
      e.preventDefault();
      tabsContainerRef.current.scrollLeft += e.deltaY;
    }
  };

  // Get the dragged tab data for rendering ghost
  const draggedTab = tabs.find(tab => tab.id === draggedTabId);

  return (
    <div className="h-[30px] bg-[var(--bg-primary)] flex items-stretch pl-0 relative">
      {/* Scrollable tabs container */}
      <div
        ref={tabsContainerRef}
        onWheel={handleWheel}
        className={`flex items-stretch overflow-x-auto scrollbar-thin scrollbar-thumb-[var(--tab-bg)] scrollbar-track-transparent ${hasOverflow ? 'pr-12' : 'pr-2'}`}
        style={{
          scrollbarWidth: 'thin',
          msOverflowStyle: 'none',
        }}
      >
        {tabs.map((tab, index) => (
          <div
            key={tab.id}
            ref={(el) => {
              if (el) tabRefs.current.set(tab.id, el);
              else tabRefs.current.delete(tab.id);
            }}
            onMouseDown={(e) => handleMouseDown(e, tab.id, index)}
            onClick={() => handleTabClick(tab.id)}
            onDoubleClick={(e) => handleDoubleClick(e, tab)}
            className={`
              px-3 flex items-center gap-2 cursor-pointer flex-shrink-0
              ${activeTab === tab.id
                ? 'bg-[var(--tab-bg)]'
                : 'bg-[var(--bg-primary)] border-2 border-[var(--tab-bg)] border-b-0 hover:bg-[var(--hover-bg-subtle)]'
              }
              ${dragOverTabId === tab.id ? 'border-l-2 border-l-[var(--accent-color)]' : ''}
              ${draggedTabId === tab.id ? 'opacity-30' : ''}
              transition-colors
            `}
            style={{
              borderTopLeftRadius: '15px',
              borderTopRightRadius: '15px',
              borderBottomLeftRadius: '0',
              borderBottomRightRadius: '0',
              cursor: isDragging ? 'grabbing' : 'pointer',
            }}
          >
            {editingTabId === tab.id ? (
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => handleEditKeyDown(e, tab.id)}
                onBlur={() => handleEditBlur(tab.id)}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="text-[10px] font-medium bg-transparent border-b border-[var(--text-primary)] outline-none text-[var(--tab-text)] min-w-[60px] max-w-[150px]"
                style={{ fontFamily: 'Roboto Mono, monospace' }}
              />
            ) : (
              <span
                className="text-[10px] font-medium select-none text-[var(--tab-text)] whitespace-nowrap"
                style={{ fontFamily: 'Roboto Mono, monospace' }}
                title={t('tooltips.doubleClickRename', 'Duplo clique para renomear')}
              >
                {tab.isUnsaved && <span className="text-[var(--text-muted)] mr-1">●</span>}
                {tab.title}
              </span>
            )}
            {tabs.length > 1 && (
              <button
                onClick={(e) => handleTabClose(e, tab.id)}
                onMouseDown={(e) => e.stopPropagation()}
                className="flex items-center justify-center hover:opacity-60 transition-opacity p-1.5 -mr-1"
                aria-label="Close tab"
              >
                <img src={getIconPath('close_tab_bttn.svg')} alt="Close" style={{ width: '7px', height: '8px' }} />
              </button>
            )}
          </div>
        ))}

        {/* Inline New Tab Button - when no overflow */}
        {!hasOverflow && (
          <button
            onClick={handleNewTab}
            className="flex items-center justify-center hover:bg-[var(--tab-bg)] rounded transition-colors self-center ml-2 flex-shrink-0"
            aria-label={t('tooltips.newTab')}
            title={t('tooltips.newTab')}
            style={{ width: '14px', height: '14px' }}
          >
            <img src={getIconPath('new_tab_bttn.svg')} alt={t('tooltips.newTab')} className="w-full h-full" />
          </button>
        )}
      </div>

      {/* Drag ghost - rendered at fixed position, moves only horizontally */}
      {isDragging && draggedTab && dragStateRef.current && (
        <div
          className={`
            absolute top-0 h-[30px] px-3 flex items-center gap-2 pointer-events-none z-50
            ${activeTab === draggedTab.id ? 'bg-[var(--tab-bg)]' : 'bg-[var(--bg-secondary)]'}
          `}
          style={{
            left: dragStateRef.current.tabRect.left - (tabsContainerRef.current?.getBoundingClientRect().left || 0) + ghostPosition,
            borderTopLeftRadius: '15px',
            borderTopRightRadius: '15px',
            opacity: 0.9,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          <span
            className="text-[10px] font-medium select-none text-[var(--tab-text)] whitespace-nowrap"
            style={{ fontFamily: 'Roboto Mono, monospace' }}
          >
            {draggedTab.isUnsaved && <span className="text-[var(--text-muted)] mr-1">●</span>}
            {draggedTab.title}
          </span>
        </div>
      )}

      {/* Fixed New Tab Button with fade - when overflow */}
      {hasOverflow && (
        <div
          className="absolute right-0 top-0 bottom-0 flex items-center pr-2 pl-8 pointer-events-none"
          style={{
            background: 'linear-gradient(to right, transparent, var(--bg-primary) 50%)',
          }}
        >
          <button
            onClick={handleNewTab}
            className="flex items-center justify-center hover:bg-[var(--tab-bg)] rounded transition-colors pointer-events-auto"
            aria-label={t('tooltips.newTab')}
            title={t('tooltips.newTab')}
            style={{ width: '14px', height: '14px' }}
          >
            <img src={getIconPath('new_tab_bttn.svg')} alt={t('tooltips.newTab')} className="w-full h-full" />
          </button>
        </div>
      )}
    </div>
  );
}
