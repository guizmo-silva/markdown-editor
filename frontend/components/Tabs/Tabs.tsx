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
    <div className="h-[30px] bg-white flex items-stretch pl-0 pr-2">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          onClick={() => handleTabClick(tab.id)}
          className={`
            px-3 flex items-center gap-2 cursor-pointer
            ${activeTab === tab.id
              ? 'bg-[#E9E9E9]'
              : 'bg-white border-2 border-[#E9E9E9] border-b-0 hover:bg-[#F5F5F5]'
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
            className="text-[10px] font-medium select-none text-[#999999]"
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
        className="flex items-center justify-center hover:bg-[#E9E9E9] rounded transition-colors self-center ml-2"
        aria-label="New tab"
        style={{ width: '14px', height: '14px' }}
      >
        <img src="/new_tab_bttn.svg" alt="New tab" className="w-full h-full" />
      </button>
    </div>
  );
}
