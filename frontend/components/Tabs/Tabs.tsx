'use client';

import { useState } from 'react';

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
  tabs = [
    { id: '1', title: 'Example Document01' },
    { id: '2', title: 'Example Document02' }
  ],
  activeTabId = '1',
  onTabChange,
  onTabClose,
  onNewTab
}: TabsProps) {
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
    <div className="h-[36px] bg-[#E9E9E9] flex items-start pl-0 pr-2 gap-1">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          onClick={() => handleTabClick(tab.id)}
          className={`
            h-full px-3 flex items-center gap-2 cursor-pointer
            ${activeTab === tab.id
              ? 'bg-white border-t border-l border-r border-[#CCCCCC]'
              : 'bg-[#E9E9E9] hover:bg-[#DADADA]'
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
            className={`text-[10px] font-medium select-none ${activeTab === tab.id ? 'text-[#000]' : 'text-[#999999]'}`}
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
            <img src="/close_tab_bttn.svg" alt="Close" className="w-full h-full" />
          </button>
        </div>
      ))}

      {/* New Tab Button */}
      <button
        onClick={handleNewTab}
        className="flex items-center justify-center hover:bg-[#DADADA] rounded transition-colors self-center"
        aria-label="New tab"
        style={{ width: '14px', height: '14px' }}
      >
        <img src="/new_tab_bttn.svg" alt="New tab" className="w-full h-full" />
      </button>
    </div>
  );
}
