'use client';

import { useState, useRef } from 'react';
import { CodeEditor } from './Editor';
import { MarkdownPreview } from './Preview';
import { AssetsSidebar } from './Sidebar';
import { ViewToggle, type ViewMode } from './ViewToggle';
import { Tabs } from './Tabs';
import { Toolbar } from './Toolbar';

export default function EditorLayout() {
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [markdown, setMarkdown] = useState(`# Welcome to Markdown Editor

Start typing your markdown here...

## Features
- **Real-time preview**
- *Line numbers*
- ~~Character count~~
- \`Tab support\`
- Click assets in sidebar to navigate[^1]

## Images

Here's an example image:
![Markdown Logo](https://markdown-here.com/img/icon256.png)
![Another Image](https://via.placeholder.com/150)

## Links

Check out these resources:
- [GitHub](https://github.com)
- [Markdown Guide](https://www.markdownguide.org)
- [Internal link](#features)

## Code Example

\`\`\`javascript
function hello() {
  console.log("Hello, World!");
}
\`\`\`

## Table

| Feature | Status |
|---------|--------|
| Editor  | ✅ Done |
| Preview | ✅ Done |
| Sidebar | ✅ Done |
| Export  | 🔄 TODO |

## Alerts

[!NOTE] This is a note alert with important information.

[!TIP] Here's a helpful tip for you!

[!IMPORTANT] Pay attention to this important message.

[!WARNING] Be careful with this warning.

[!CAUTION] This is a caution alert.

## Blockquote

> This is a blockquote example.
> It can span multiple lines.

---

**Bold text** and *italic text* work perfectly!

## Footnotes

This text has a footnote reference[^1] and another one[^2].

[^1]: This is the first footnote definition.
[^2]: This is the second footnote with more details.`);

  const [scrollToLine, setScrollToLine] = useState<number | undefined>();

  const handleNavigateToLine = (line: number) => {
    setScrollToLine(line);
    // Reset after navigation to allow re-navigation to same line
    setTimeout(() => setScrollToLine(undefined), 100);
  };

  const handleFileSelect = (filePath: string) => {
    // TODO: Load file content from backend
    console.log('Selected file:', filePath);
    // For now, just log the selection
  };

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="h-screen w-screen flex flex-row bg-white">
      {/* Sidebar - Full height on the left */}
      {!isSidebarCollapsed && (
        <AssetsSidebar
          markdown={markdown}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onNavigateToLine={handleNavigateToLine}
          onFileSelect={handleFileSelect}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />
      )}

      {/* Collapsed Sidebar */}
      {isSidebarCollapsed && (
        <div className="w-[60px] bg-white border-r border-[#CCCCCC] flex flex-col items-center relative">
          {/* Logo at top */}
          <div className="py-3 border-b border-[#CCCCCC] w-full flex items-center justify-center">
            <img
              src="/Logo.svg"
              alt="MD Logo"
              className="h-[32px] w-auto"
            />
          </div>

          {/* Vertical Toggle */}
          <div className="py-3">
            <ViewToggle currentMode={viewMode} onModeChange={setViewMode} vertical={true} />
          </div>

          {/* Expand Button - Fixed at bottom */}
          <button
            onClick={handleToggleSidebar}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 w-10 h-10 bg-white rounded-full shadow-md hover:shadow-lg flex items-center justify-center transition-all border border-[#CCCCCC]"
            aria-label="Show sidebar"
          >
            <img
              src="/hide_side_bar_icon.svg"
              alt="Show sidebar"
              className="h-4 w-4"
            />
          </button>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tabs with border below */}
        <div className="border-b border-[#CCCCCC]">
          <Tabs
            onTabChange={(tabId) => console.log('Tab changed to:', tabId)}
            onTabClose={(tabId) => console.log('Tab closed:', tabId)}
            onNewTab={() => console.log('New tab requested')}
          />
        </div>

        {/* Content Area - Based on view mode */}
        <div className="flex-1 flex overflow-hidden">
          {/* Code Editor */}
          {(viewMode === 'code' || viewMode === 'split') && (
            <div className={`${viewMode === 'split' ? 'flex-1 border-r border-[#999999]' : 'w-full'} flex flex-col`}>
              <Toolbar
                textareaRef={editorRef}
                value={markdown}
                onChange={setMarkdown}
              />
              <div className="flex-1 overflow-hidden">
                <CodeEditor
                  ref={editorRef}
                  value={markdown}
                  onChange={setMarkdown}
                  placeholder="Start typing your markdown..."
                  scrollToLine={scrollToLine}
                />
              </div>
            </div>
          )}

          {/* Preview */}
          {(viewMode === 'preview' || viewMode === 'split') && (
            <div className={viewMode === 'split' ? 'flex-1' : 'w-full'}>
              <MarkdownPreview content={markdown} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
