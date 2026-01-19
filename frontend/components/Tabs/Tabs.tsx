'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useThemedIcon } from '@/utils/useThemedIcon';

interface Tab {
  id: string;
  title: string;
}

interface TabsProps {
  tabs?: Tab[];
  activeTabId?: string;
  onTabChange?: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
  onNewTab?: () => void;
}

export default function Tabs({
  tabs = [{ id: 'untitled', title: 'Untitled' }],
  activeTabId = 'untitled',
  onTabChange,
  onTabClose,
  onNewTab
}: TabsProps) {
  const { t } = useTranslation();
  const { getIconPath } = useThemedIcon();
  const [activeTab, setActiveTab] = useState(activeTabId);

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

  return (
    <div className="h-[30px] bg-[var(--bg-primary)] flex items-stretch pl-0 pr-2">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          onClick={() => handleTabClick(tab.id)}
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
          <span
            className="text-[10px] font-medium select-none text-[var(--tab-text)]"
            style={{ fontFamily: 'Roboto Mono, monospace' }}
          >
            {tab.title}
          </span>
          <button
            onClick={(e) => handleTabClose(e, tab.id)}
            className="flex items-center justify-center hover:opacity-60 transition-opacity"
            aria-label="Close tab"
            style={{ width: '5px', height: '6px' }}
          >
            <img src={getIconPath('close_tab_bttn.svg')} alt="Close" className="w-full h-full" />
          </button>
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
