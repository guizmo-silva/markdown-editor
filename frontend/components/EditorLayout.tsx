'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { CodeMirrorEditor, type CodeMirrorHandle } from './Editor';
import { MarkdownPreview } from './Preview';
import { AssetsSidebar } from './Sidebar';
import { ViewToggle, type ViewMode } from './ViewToggle';
import { Tabs } from './Tabs';
import { Toolbar } from './Toolbar';
import { useThemedIcon } from '@/utils/useThemedIcon';
import { useTheme } from './ThemeProvider';
import { readFile, saveFile, createFile, deleteFile, renameFile, exportToHtml } from '@/services/api';

const SIDEBAR_MIN_WIDTH = 230;
const SIDEBAR_MAX_WIDTH = 380;
const SPLIT_MIN_PERCENT = 20; // Minimum 20% for each panel
const SPLIT_MAX_PERCENT = 80; // Maximum 80% for each panel

export default function EditorLayout() {
  const { getIconPath } = useThemedIcon();
  const { theme: globalTheme } = useTheme();
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Independent theme state for each view
  const [editorTheme, setEditorTheme] = useState<'light' | 'dark'>('light');
  const [previewTheme, setPreviewTheme] = useState<'light' | 'dark'>('light');
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_MIN_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [splitPosition, setSplitPosition] = useState(50); // Percentage for code editor width
  const [isResizingSplit, setIsResizingSplit] = useState(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<CodeMirrorHandle>(null);
  const [markdown, setMarkdown] = useState('');

  const [scrollToLine, setScrollToLine] = useState<number | undefined>();
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fileRefreshTrigger, setFileRefreshTrigger] = useState(0);

  const handleNavigateToLine = (line: number) => {
    setScrollToLine(line);
    // Reset after navigation to allow re-navigation to same line
    setTimeout(() => setScrollToLine(undefined), 100);
  };

  const handleFileSelect = async (filePath: string) => {
    console.log('Selected file:', filePath);
    setIsLoading(true);
    try {
      const content = await readFile(filePath);
      setMarkdown(content);
      setCurrentFilePath(filePath);
    } catch (err) {
      console.error('Failed to load file:', err);
      alert(err instanceof Error ? err.message : 'Failed to load file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentFilePath) {
      alert('No file selected. Please select or create a file first.');
      return;
    }
    setIsSaving(true);
    try {
      await saveFile(currentFilePath, markdown);
      console.log('File saved:', currentFilePath);
    } catch (err) {
      console.error('Failed to save file:', err);
      alert(err instanceof Error ? err.message : 'Failed to save file');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateFile = async (fileName: string) => {
    try {
      await createFile(fileName, '# New File\n\nStart writing here...');
      setFileRefreshTrigger(prev => prev + 1);
      // Select the new file
      await handleFileSelect(fileName);
    } catch (err) {
      console.error('Failed to create file:', err);
      alert(err instanceof Error ? err.message : 'Failed to create file');
    }
  };

  const handleDeleteFile = async (filePath: string) => {
    if (!confirm(`Are you sure you want to delete ${filePath}?`)) {
      return;
    }
    try {
      await deleteFile(filePath);
      setFileRefreshTrigger(prev => prev + 1);
      // Clear editor if we deleted the current file
      if (currentFilePath === filePath) {
        setCurrentFilePath(null);
        setMarkdown('');
      }
    } catch (err) {
      console.error('Failed to delete file:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete file');
    }
  };

  const handleRenameFile = async (oldPath: string, newPath: string) => {
    try {
      await renameFile(oldPath, newPath);
      setFileRefreshTrigger(prev => prev + 1);
      // Update current file path if we renamed the current file
      if (currentFilePath === oldPath) {
        setCurrentFilePath(newPath);
      }
    } catch (err) {
      console.error('Failed to rename file:', err);
      alert(err instanceof Error ? err.message : 'Failed to rename file');
    }
  };

  const handleExport = async () => {
    try {
      const blob = await exportToHtml(markdown, currentFilePath || 'export');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentFilePath?.replace(/\.md$/, '') || 'export'}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export:', err);
      alert(err instanceof Error ? err.message : 'Failed to export');
    }
  };

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Sync view themes when global theme changes
  useEffect(() => {
    setEditorTheme(globalTheme);
    setPreviewTheme(globalTheme);
  }, [globalTheme]);

  // Toggle individual view themes
  const toggleEditorTheme = () => {
    setEditorTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const togglePreviewTheme = () => {
    setPreviewTheme(prev => prev === 'light' ? 'dark' : 'light');
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
            onExport={handleExport}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={handleToggleSidebar}
            width={sidebarWidth}
            fileRefreshTrigger={fileRefreshTrigger}
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
              src={getIconPath('Logo.svg')}
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
                src={getIconPath('hide_side_bar_icon.svg')}
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
                  viewTheme={editorTheme}
                  onToggleTheme={toggleEditorTheme}
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
              <div className="w-[3px] h-[3px] rounded-full bg-[var(--bg-secondary)]" />
              <div className="w-[3px] h-[3px] rounded-full bg-[var(--bg-secondary)]" />
              <div className="w-[3px] h-[3px] rounded-full bg-[var(--bg-secondary)]" />
            </div>
          )}

          {/* Preview */}
          {(viewMode === 'preview' || viewMode === 'split') && (
            <div
              className="overflow-hidden"
              style={{ width: viewMode === 'split' ? `calc(${100 - splitPosition}% - 5px)` : '100%' }}
            >
              <MarkdownPreview
                content={markdown}
                viewTheme={previewTheme}
                onToggleTheme={togglePreviewTheme}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
