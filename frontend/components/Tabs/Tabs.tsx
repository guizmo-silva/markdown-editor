'use client';

import { useState, useRef, useEffect } from 'react';
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
}

export default function Tabs({
  tabs = [{ id: 'untitled', title: 'Untitled' }],
  activeTabId = 'untitled',
  onTabChange,
  onTabClose,
  onNewTab,
  onTabRename
}: TabsProps) {
  const { t } = useTranslation();
  const { getIconPath } = useThemedIcon();
  const [activeTab, setActiveTab] = useState(activeTabId);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingTabId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTabId]);

  // Update active tab when prop changes
  useEffect(() => {
    setActiveTab(activeTabId);
  }, [activeTabId]);

  const handleTabClick = (tabId: string) => {
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
    // Remove .md extension for editing
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
      // Add .md extension if not present
      let newName = editValue.trim();
      if (!newName.endsWith('.md')) {
        newName += '.md';
      }
      // Sanitize filename (remove invalid characters)
      newName = newName.replace(/[<>:"/\\|?*]/g, '');

      if (newName && newName !== '.md') {
        onTabRename?.(tabId, newName);
      }
    }
    setEditingTabId(null);
    setEditValue('');
  };

  return (
    <div className="h-[30px] bg-[var(--bg-primary)] flex items-stretch pl-0 pr-2">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          onClick={() => handleTabClick(tab.id)}
          onDoubleClick={(e) => handleDoubleClick(e, tab)}
          className={`
            px-3 flex items-center gap-2 cursor-pointer
            ${activeTab === tab.id
              ? 'bg-[var(--tab-bg)]'
              : 'bg-[var(--bg-primary)] border-2 border-[var(--tab-bg)] border-b-0 hover:bg-[var(--hover-bg-subtle)]'
            }
            transition-colors
          `}
          style={{
            borderTopLeftRadius: '15px',
            borderTopRightRadius: '15px',
            borderBottomLeftRadius: '0',
            borderBottomRightRadius: '0',
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
              className="text-[10px] font-medium bg-transparent border-b border-[var(--text-primary)] outline-none text-[var(--tab-text)] min-w-[60px] max-w-[150px]"
              style={{ fontFamily: 'Roboto Mono, monospace' }}
            />
          ) : (
            <span
              className="text-[10px] font-medium select-none text-[var(--tab-text)]"
              style={{ fontFamily: 'Roboto Mono, monospace' }}
              title={t('tooltips.doubleClickRename', 'Duplo clique para renomear')}
            >
              {tab.isUnsaved && <span className="text-[var(--text-muted)] mr-1">●</span>}
              {tab.title}
            </span>
          )}
          {/* Only show close button if there's more than 1 tab */}
          {tabs.length > 1 && (
            <button
              onClick={(e) => handleTabClose(e, tab.id)}
              className="flex items-center justify-center hover:opacity-60 transition-opacity"
              aria-label="Close tab"
              style={{ width: '5px', height: '6px' }}
            >
              <img src={getIconPath('close_tab_bttn.svg')} alt="Close" className="w-full h-full" />
            </button>
          )}
        </div>
      ))}

      {/* New Tab Button */}
      <button
        onClick={handleNewTab}
        className="flex items-center justify-center hover:bg-[var(--tab-bg)] rounded transition-colors self-center ml-2"
        aria-label={t('tooltips.newTab')}
        title={t('tooltips.newTab')}
        style={{ width: '14px', height: '14px' }}
      >
        <img src={getIconPath('new_tab_bttn.svg')} alt={t('tooltips.newTab')} className="w-full h-full" />
      </button>
    </div>
  );
}
