'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { CodeMirrorEditor, type CodeMirrorHandle } from './Editor';
import { MarkdownPreview } from './Preview';
import { AssetsSidebar } from './Sidebar';
import { ViewToggle, type ViewMode } from './ViewToggle';
import { Tabs } from './Tabs';
import { Toolbar } from './Toolbar';

const SIDEBAR_MIN_WIDTH = 230;
const SIDEBAR_MAX_WIDTH = 380;
const SPLIT_MIN_PERCENT = 20; // Minimum 20% for each panel
const SPLIT_MAX_PERCENT = 80; // Maximum 80% for each panel

export default function EditorLayout() {
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_MIN_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [splitPosition, setSplitPosition] = useState(50); // Percentage for code editor width
  const [isResizingSplit, setIsResizingSplit] = useState(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<CodeMirrorHandle>(null);
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

> [!NOTE]
> This is a note alert with important information.

> [!TIP]
> Here's a helpful tip for you!

> [!IMPORTANT]
> Pay attention to this important message.

> [!WARNING]
> Be careful with this warning.

> [!CAUTION]
> This is a caution alert.

## Blockquote

> This is a blockquote example.
> It can span multiple lines.

---

**Bold text** and *italic text* work perfectly!

## Math Formulas

Inline math: $E = mc^2$ and $a^2 + b^2 = c^2$

Block math (Quadratic Formula):

$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

Summation:

$$\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$$

Integral:

$$\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$

Matrix:

$$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$$

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

  // Sidebar resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const newWidth = e.clientX;
    if (newWidth >= SIDEBAR_MIN_WIDTH && newWidth <= SIDEBAR_MAX_WIDTH) {
      setSidebarWidth(newWidth);
    } else if (newWidth < SIDEBAR_MIN_WIDTH) {
      setSidebarWidth(SIDEBAR_MIN_WIDTH);
    } else if (newWidth > SIDEBAR_MAX_WIDTH) {
      setSidebarWidth(SIDEBAR_MAX_WIDTH);
    }
  }, [isResizing]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Split resize handlers
  const handleSplitResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSplit(true);
  }, []);

  const handleSplitResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizingSplit || !splitContainerRef.current) return;

    const container = splitContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    const relativeX = e.clientX - containerRect.left;
    const percentage = (relativeX / containerRect.width) * 100;

    if (percentage >= SPLIT_MIN_PERCENT && percentage <= SPLIT_MAX_PERCENT) {
      setSplitPosition(percentage);
    } else if (percentage < SPLIT_MIN_PERCENT) {
      setSplitPosition(SPLIT_MIN_PERCENT);
    } else if (percentage > SPLIT_MAX_PERCENT) {
      setSplitPosition(SPLIT_MAX_PERCENT);
    }
  }, [isResizingSplit]);

  const handleSplitResizeEnd = useCallback(() => {
    setIsResizingSplit(false);
  }, []);

  useEffect(() => {
    if (isResizingSplit) {
      document.addEventListener('mousemove', handleSplitResizeMove);
      document.addEventListener('mouseup', handleSplitResizeEnd);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      if (isResizingSplit) {
        document.removeEventListener('mousemove', handleSplitResizeMove);
        document.removeEventListener('mouseup', handleSplitResizeEnd);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
  }, [isResizingSplit, handleSplitResizeMove, handleSplitResizeEnd]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  return (
    <div className="h-screen w-screen flex flex-row bg-[var(--bg-primary)]">
      {/* Sidebar - Full height on the left */}
      {!isSidebarCollapsed && (
        <div className="relative flex" style={{ width: sidebarWidth }}>
          <AssetsSidebar
            markdown={markdown}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onNavigateToLine={handleNavigateToLine}
            onFileSelect={handleFileSelect}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={handleToggleSidebar}
            width={sidebarWidth}
          />
          {/* Resize Handle */}
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-[var(--split-line)] transition-colors z-10"
            onMouseDown={handleResizeStart}
          />
        </div>
      )}

      {/* Collapsed Sidebar */}
      {isSidebarCollapsed && (
        <div className="w-[60px] bg-[var(--bg-primary)] border-r border-[var(--border-primary)] flex flex-col items-center">
          {/* Logo at top */}
          <div className="py-3 border-b border-[var(--border-primary)] w-full flex items-center justify-center">
            <img
              src="/Logo.svg"
              alt="MD Logo"
              className="h-[32px] w-auto"
            />
          </div>

          {/* Vertical Toggle */}
          <div className="py-3 flex-1">
            <ViewToggle currentMode={viewMode} onModeChange={setViewMode} vertical={true} />
          </div>

          {/* Expand Button - Fixed at bottom */}
          <div className="py-4">
            <button
              onClick={handleToggleSidebar}
              className="p-2 hover:bg-[var(--bg-secondary)] rounded transition-colors"
              aria-label="Show sidebar"
            >
              <img
                src="/hide_side_bar_icon.svg"
                alt="Show sidebar"
                className="h-4 w-4 rotate-180"
              />
            </button>
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tabs */}
        <Tabs
          onTabChange={(tabId) => console.log('Tab changed to:', tabId)}
          onTabClose={(tabId) => console.log('Tab closed:', tabId)}
          onNewTab={() => console.log('New tab requested')}
        />

        {/* Content Area - Based on view mode */}
        <div ref={splitContainerRef} className="flex-1 flex overflow-hidden relative">
          {/* Code Editor */}
          {(viewMode === 'code' || viewMode === 'split') && (
            <div
              className="flex flex-col overflow-hidden"
              style={{ width: viewMode === 'split' ? `${splitPosition}%` : '100%' }}
            >
              <Toolbar
                textareaRef={editorRef}
                value={markdown}
                onChange={setMarkdown}
              />
              <div className="flex-1 overflow-hidden">
                <CodeMirrorEditor
                  ref={editorRef}
                  value={markdown}
                  onChange={setMarkdown}
                  scrollToLine={scrollToLine}
                />
              </div>
            </div>
          )}

          {/* Split Resize Handle */}
          {viewMode === 'split' && (
            <div
              className="w-[5px] bg-[var(--split-line)] cursor-col-resize hover:bg-[var(--text-secondary)] active:bg-[var(--text-secondary)] transition-colors flex-shrink-0 flex flex-col items-center justify-center gap-[3px]"
              onMouseDown={handleSplitResizeStart}
            >
              <div className="w-[3px] h-[3px] rounded-full bg-[var(--bg-primary)]/60" />
              <div className="w-[3px] h-[3px] rounded-full bg-[var(--bg-primary)]/60" />
              <div className="w-[3px] h-[3px] rounded-full bg-[var(--bg-primary)]/60" />
            </div>
          )}

          {/* Preview */}
          {(viewMode === 'preview' || viewMode === 'split') && (
            <div
              className="overflow-hidden"
              style={{ width: viewMode === 'split' ? `calc(${100 - splitPosition}% - 5px)` : '100%' }}
            >
              <MarkdownPreview content={markdown} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
