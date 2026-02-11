'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { CodeMirrorEditor, type CodeMirrorHandle } from './Editor';
import { MarkdownPreview, type PreviewClickInfo } from './Preview';
import { AssetsSidebar } from './Sidebar';
import { ViewToggle, type ViewMode } from './ViewToggle';
import { Tabs } from './Tabs';
import { Toolbar } from './Toolbar';
import { WelcomeModal } from './WelcomeModal';
import { ExportModal } from './ExportModal';
import { useThemedIcon } from '@/utils/useThemedIcon';
import { useTheme } from './ThemeProvider';
import { readFile, saveFile, createFile, deleteFile, renameFile, exportToHtml, getVolumes } from '@/services/api';

const SIDEBAR_MIN_WIDTH = 230;
const SIDEBAR_MAX_WIDTH = 380;
const SPLIT_MIN_PERCENT = 20; // Minimum 20% for each panel
const SPLIT_MAX_PERCENT = 80; // Maximum 80% for each panel
const CODE_VIEW_MIN_WIDTH = 350; // Minimum width in pixels for code view

// Interface for tab data
interface TabData {
  id: string; // file path
  content: string;
  lastSavedContent: string;
  isAutoNamed: boolean;
  lastAutoRenamedTitle: string;
  saveStatus: 'saved' | 'saving' | 'unsaved' | 'error';
}

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
  const [columnWidth, setColumnWidth] = useState(100); // Column width percentage (50-100) for single-view modes
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<CodeMirrorHandle>(null);

  // Multi-tab state
  const [tabs, setTabs] = useState<TabData[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const [scrollToLine, setScrollToLine] = useState<number | undefined>();
  const [isScrollSynced, setIsScrollSynced] = useState(true);
  const isScrollSyncedRef = useRef(true);
  const previewScrollRef = useRef<HTMLDivElement>(null);
  const scrollOffsetRef = useRef(0);
  const lastEditorLineRef = useRef(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fileRefreshTrigger, setFileRefreshTrigger] = useState(0);
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const AUTOSAVE_DELAY = 1000; // 1 second debounce

  // Get active tab data
  const activeTab = tabs.find(t => t.id === activeTabId);
  const markdown = activeTab?.content ?? '';
  const saveStatus = activeTab?.saveStatus ?? 'saved';
  const isAutoNamed = activeTab?.isAutoNamed ?? false;
  const currentFilePath = activeTabId;

  // Helper function to update a specific tab
  const updateTab = useCallback((tabId: string, updates: Partial<TabData>) => {
    setTabs(prevTabs => prevTabs.map(tab =>
      tab.id === tabId ? { ...tab, ...updates } : tab
    ));
  }, []);

  // Helper function to update tab ID (when file is renamed)
  const updateTabId = useCallback((oldId: string, newId: string) => {
    setTabs(prevTabs => prevTabs.map(tab =>
      tab.id === oldId ? { ...tab, id: newId } : tab
    ));
    if (activeTabId === oldId) {
      setActiveTabId(newId);
    }
  }, [activeTabId]);

  // Update browser tab title with active document name
  useEffect(() => {
    if (activeTabId) {
      const fileName = activeTabId.split('/').pop() || activeTabId;
      document.title = `${fileName} - Markdown Editor`;
    } else {
      document.title = 'Markdown Editor';
    }
  }, [activeTabId]);

  // Set markdown content for active tab
  const setMarkdown = useCallback((content: string | ((prev: string) => string)) => {
    if (!activeTabId) return;
    setTabs(prevTabs => prevTabs.map(tab => {
      if (tab.id === activeTabId) {
        const newContent = typeof content === 'function' ? content(tab.content) : content;
        return { ...tab, content: newContent };
      }
      return tab;
    }));
  }, [activeTabId]);

  // Add a new tab or switch to existing
  const addOrSwitchToTab = useCallback((tabData: TabData) => {
    setTabs(prevTabs => {
      const existingTab = prevTabs.find(t => t.id === tabData.id);
      if (existingTab) {
        // Tab already exists, just switch to it
        return prevTabs;
      }
      // Add new tab
      return [...prevTabs, tabData];
    });
    setActiveTabId(tabData.id);
  }, []);

  // Close a tab
  const closeTab = useCallback((tabId: string) => {
    setTabs(prevTabs => {
      // Don't close if it's the last tab
      if (prevTabs.length <= 1) return prevTabs;

      const newTabs = prevTabs.filter(t => t.id !== tabId);

      // If we're closing the active tab, switch to another
      if (activeTabId === tabId && newTabs.length > 0) {
        const closedIndex = prevTabs.findIndex(t => t.id === tabId);
        const newActiveIndex = Math.min(closedIndex, newTabs.length - 1);
        setActiveTabId(newTabs[newActiveIndex].id);
      }

      return newTabs;
    });
  }, [activeTabId]);

  // Reorder tabs (drag and drop)
  const reorderTabs = useCallback((fromIndex: number, toIndex: number) => {
    setTabs(prevTabs => {
      const newTabs = [...prevTabs];
      const [movedTab] = newTabs.splice(fromIndex, 1);
      newTabs.splice(toIndex, 0, movedTab);
      return newTabs;
    });
  }, []);

  // Extract first heading from markdown
  const extractFirstHeading = useCallback((content: string): string | null => {
    const match = content.match(/^#\s+(.+)$/m);
    if (match && match[1]) {
      // Clean the heading: remove special characters, trim, limit length
      let heading = match[1].trim();
      // Remove markdown formatting like **bold** or *italic*
      heading = heading.replace(/\*+/g, '').replace(/_+/g, '');
      // Remove invalid filename characters
      heading = heading.replace(/[<>:"/\\|?*]/g, '');
      // Limit length
      heading = heading.substring(0, 50).trim();
      return heading || null;
    }
    return null;
  }, []);

  const handleNavigateToLine = (line: number) => {
    setScrollToLine(line);
    // Reset after navigation to allow re-navigation to same line
    setTimeout(() => setScrollToLine(undefined), 100);
  };

  const handleFileSelect = async (filePath: string) => {
    console.log('Selected file:', filePath);

    // Check if tab already exists
    const existingTab = tabs.find(t => t.id === filePath);
    if (existingTab) {
      setActiveTabId(filePath);
      return;
    }

    setIsLoading(true);
    try {
      const content = await readFile(filePath);
      const newTab: TabData = {
        id: filePath,
        content,
        lastSavedContent: content,
        isAutoNamed: false,
        lastAutoRenamedTitle: '',
        saveStatus: 'saved'
      };
      addOrSwitchToTab(newTab);
    } catch (err) {
      console.error('Failed to load file:', err);
      alert(err instanceof Error ? err.message : 'Failed to load file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = useCallback(async (tabId?: string, content?: string) => {
    const targetTabId = tabId ?? activeTabId;
    if (!targetTabId) return;

    const tab = tabs.find(t => t.id === targetTabId);
    if (!tab) return;

    const contentToSave = content ?? tab.content;

    // Skip if content hasn't changed
    if (contentToSave === tab.lastSavedContent) {
      return;
    }

    setIsSaving(true);
    updateTab(targetTabId, { saveStatus: 'saving' });
    try {
      await saveFile(targetTabId, contentToSave);
      updateTab(targetTabId, { lastSavedContent: contentToSave, saveStatus: 'saved' });
      console.log('File saved:', targetTabId);
    } catch (err) {
      console.error('Failed to save file:', err);
      updateTab(targetTabId, { saveStatus: 'error' });
    } finally {
      setIsSaving(false);
    }
  }, [activeTabId, tabs, updateTab]);

  const handleCreateFile = async (fileName: string, markAsAutoNamed: boolean = false): Promise<'ok' | 'exists' | 'error'> => {
    const initialContent = '# ';
    try {
      await createFile(fileName, initialContent);
      setFileRefreshTrigger(prev => prev + 1);

      // Create new tab for the file
      const newTab: TabData = {
        id: fileName,
        content: initialContent,
        lastSavedContent: initialContent,
        isAutoNamed: markAsAutoNamed,
        lastAutoRenamedTitle: '',
        saveStatus: 'saved'
      };
      addOrSwitchToTab(newTab);
      return 'ok';
    } catch (err) {
      console.error('Failed to create file:', err);
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('already exists') || msg.includes('File already exists')) {
        return 'exists';
      }
      return 'error';
    }
  };

  const handleDeleteFile = async (filePath: string) => {
    try {
      await deleteFile(filePath);
      setFileRefreshTrigger(prev => prev + 1);
      // Close tab if we deleted its file
      closeTab(filePath);
    } catch (err) {
      console.error('Failed to delete file:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete file');
    }
  };

  const handleRenameFile = async (oldPath: string, newPath: string) => {
    try {
      await renameFile(oldPath, newPath);
      setFileRefreshTrigger(prev => prev + 1);
      // Update tab ID if we renamed its file
      updateTabId(oldPath, newPath);
    } catch (err) {
      console.error('Failed to rename file:', err);
      alert(err instanceof Error ? err.message : 'Failed to rename file');
    }
  };

  const handleNewDocumentFromModal = async (folderPath: string = '/') => {
    const timestamp = new Date().toISOString().slice(0, 10);

    let basePath: string;
    if (folderPath === '/') {
      // Default: use first volume name as prefix
      try {
        const volumes = await getVolumes();
        basePath = volumes.length > 0 ? volumes[0].name + '/' : '';
      } catch {
        basePath = '';
      }
    } else {
      basePath = folderPath + '/';
    }

    let fileName = `${basePath}novo-documento-${timestamp}.md`;
    let counter = 1;

    // Try to create the file, if it fails (already exists), try with a counter
    // Mark as auto-named so it can be renamed based on first heading
    let result = await handleCreateFile(fileName, true);
    while (result === 'exists' && counter < 100) {
      fileName = `${basePath}novo-documento-${timestamp}-${counter}.md`;
      result = await handleCreateFile(fileName, true);
      counter++;
    }

    if (result === 'ok') {
      setShowWelcomeModal(false);
    } else if (result === 'error') {
      alert('Failed to create file. Check volume permissions.');
    }
  };

  const handleFileSelectFromModal = async (filePath: string) => {
    await handleFileSelect(filePath);
    setShowWelcomeModal(false);
  };

  // Handle tab rename (double-click on tab)
  const handleTabRename = async (tabId: string, newName: string) => {
    // Validate filename length (255 bytes max)
    const nameBytes = new TextEncoder().encode(newName).length;
    if (nameBytes > 255) {
      alert('Filename too long (max 255 bytes)');
      return;
    }

    // Get directory path from tab id (file path)
    const lastSlash = tabId.lastIndexOf('/');
    const directory = lastSlash > 0 ? tabId.substring(0, lastSlash + 1) : '';
    const newPath = directory + newName;

    // Don't rename if it's the same name
    if (newPath === tabId) return;

    try {
      await renameFile(tabId, newPath);
      // Update tab: change ID and disable auto-rename
      updateTabId(tabId, newPath);
      updateTab(newPath, { isAutoNamed: false, lastAutoRenamedTitle: '' });
      setFileRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Failed to rename file:', err);
      alert(err instanceof Error ? err.message : 'Failed to rename file');
    }
  };

  const handleExportClick = () => {
    setShowExportModal(true);
  };

  const handleExport = async (format: 'html' | 'md' | 'txt') => {
    const baseName = currentFilePath?.replace(/\.md$/, '').split('/').pop() || 'documento';
    const now = new Date();
    const timestamp = now.getFullYear().toString()
      + String(now.getMonth() + 1).padStart(2, '0')
      + String(now.getDate()).padStart(2, '0')
      + '_'
      + String(now.getHours()).padStart(2, '0')
      + String(now.getMinutes()).padStart(2, '0')
      + String(now.getSeconds()).padStart(2, '0');
    const filename = `${baseName}_${timestamp}`;

    try {
      let content: string;
      let mimeType: string;
      let extension: string;

      switch (format) {
        case 'html':
          const blob = await exportToHtml(markdown, filename);
          content = await blob.text();
          mimeType = 'text/html';
          extension = 'html';
          break;
        case 'md':
          content = markdown;
          mimeType = 'text/markdown';
          extension = 'md';
          break;
        case 'txt':
          content = markdown;
          mimeType = 'text/plain';
          extension = 'txt';
          break;
      }

      // Download using traditional method (works in all browsers)
      const downloadBlob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(downloadBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setShowExportModal(false);
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

  // Track content changes for autosave - use content string as dependency, not the whole tabs array
  const activeContent = activeTab?.content;
  const activeLastSaved = activeTab?.lastSavedContent;

  // Autosave with debounce - only triggered by content changes
  useEffect(() => {
    // Clear any existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Don't autosave if no active tab or content hasn't changed
    if (!activeTabId || activeContent === undefined || activeContent === activeLastSaved) {
      return;
    }

    // Mark as unsaved immediately when content changes
    setTabs(prevTabs => prevTabs.map(tab =>
      tab.id === activeTabId && tab.saveStatus !== 'unsaved'
        ? { ...tab, saveStatus: 'unsaved' }
        : tab
    ));

    // Set up debounced save
    const tabIdToSave = activeTabId;
    const contentToSave = activeContent;

    autoSaveTimeoutRef.current = setTimeout(async () => {
      setTabs(prevTabs => prevTabs.map(tab =>
        tab.id === tabIdToSave ? { ...tab, saveStatus: 'saving' } : tab
      ));

      try {
        await saveFile(tabIdToSave, contentToSave);
        setTabs(prevTabs => prevTabs.map(tab =>
          tab.id === tabIdToSave
            ? { ...tab, lastSavedContent: contentToSave, saveStatus: 'saved' }
            : tab
        ));
        console.log('Autosaved:', tabIdToSave);
      } catch (err) {
        console.error('Failed to autosave:', err);
        setTabs(prevTabs => prevTabs.map(tab =>
          tab.id === tabIdToSave ? { ...tab, saveStatus: 'error' } : tab
        ));
      }
    }, AUTOSAVE_DELAY);

    // Cleanup on unmount or when dependencies change
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [activeTabId, activeContent, activeLastSaved]);

  // Save before page unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Check if any tab has unsaved changes
      const unsavedTabs = tabs.filter(t => t.content !== t.lastSavedContent);
      if (unsavedTabs.length > 0) {
        // Try to save all unsaved tabs
        unsavedTabs.forEach(tab => {
          saveFile(tab.id, tab.content).catch(console.error);
        });
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [tabs]);

  // Auto-rename file based on first heading when file is auto-named
  const activeIsAutoNamed = activeTab?.isAutoNamed;
  const activeSaveStatus = activeTab?.saveStatus;
  const activeLastAutoRenamedTitle = activeTab?.lastAutoRenamedTitle;

  useEffect(() => {
    if (!activeTabId || !activeContent || !activeIsAutoNamed || activeSaveStatus === 'saving') return;

    const heading = extractFirstHeading(activeContent);
    if (!heading || heading === activeLastAutoRenamedTitle) return;

    // Truncate heading to fit filesystem limits (255 bytes max including .md extension)
    const MAX_FILENAME_BYTES = 255;
    const EXTENSION = '.md';
    let truncatedHeading = heading;
    while (new TextEncoder().encode(truncatedHeading + EXTENSION).length > MAX_FILENAME_BYTES) {
      truncatedHeading = truncatedHeading.slice(0, -1);
    }
    truncatedHeading = truncatedHeading.trimEnd();

    const newFileName = `${truncatedHeading}.md`;
    const lastSlash = activeTabId.lastIndexOf('/');
    const directory = lastSlash > 0 ? activeTabId.substring(0, lastSlash + 1) : '';
    const currentFileName = activeTabId.substring(lastSlash + 1);

    // Don't rename if it's already the same name
    if (newFileName === currentFileName) {
      setTabs(prevTabs => prevTabs.map(tab =>
        tab.id === activeTabId ? { ...tab, lastAutoRenamedTitle: heading } : tab
      ));
      return;
    }

    // Debounce the rename to avoid too many API calls
    const currentTabId = activeTabId;
    const contentToSave = activeContent;

    const renameTimeout = setTimeout(async () => {
      const newPath = directory + newFileName;

      try {
        // First save current content
        await saveFile(currentTabId, contentToSave);
        // Then rename
        await renameFile(currentTabId, newPath);
        // Update tab ID and state
        setTabs(prevTabs => prevTabs.map(tab =>
          tab.id === currentTabId
            ? {
                ...tab,
                id: newPath,
                lastSavedContent: contentToSave,
                lastAutoRenamedTitle: heading,
                saveStatus: 'saved' as const
              }
            : tab
        ));
        setActiveTabId(newPath);
        setFileRefreshTrigger(prev => prev + 1);
      } catch (err) {
        // If rename fails (e.g., file exists), just keep current name
        console.log('Auto-rename skipped:', err);
        setTabs(prevTabs => prevTabs.map(tab =>
          tab.id === currentTabId ? { ...tab, lastAutoRenamedTitle: heading } : tab
        ));
      }
    }, 1500); // Wait 1.5s after typing stops

    return () => clearTimeout(renameTimeout);
  }, [activeTabId, activeContent, activeIsAutoNamed, activeSaveStatus, activeLastAutoRenamedTitle, extractFirstHeading]);

  // Toggle individual view themes
  const toggleEditorTheme = () => {
    setEditorTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const togglePreviewTheme = () => {
    setPreviewTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Calculate the target scroll position in the preview for a given source line
  const calculateTargetScroll = useCallback((lineNumber: number) => {
    const container = previewScrollRef.current;
    if (!container) return 0;

    const elements = container.querySelectorAll('[data-source-line]');
    if (elements.length === 0) {
      // Fallback to fraction-based sync if no line markers
      const totalLines = (container.querySelector('.markdown-preview')?.textContent || '').split('\n').length || 1;
      const fraction = lineNumber / totalLines;
      return fraction * (container.scrollHeight - container.clientHeight);
    }

    // Build sorted anchor list: { line, top }
    const containerRect = container.getBoundingClientRect();
    const anchors: { line: number; top: number }[] = [];
    for (const el of elements) {
      const line = parseInt(el.getAttribute('data-source-line')!, 10);
      if (!isNaN(line)) {
        const rect = (el as HTMLElement).getBoundingClientRect();
        const top = rect.top - containerRect.top + container.scrollTop;
        anchors.push({ line, top });
      }
    }
    if (anchors.length === 0) return 0;
    anchors.sort((a, b) => a.line - b.line);

    // Find bracketing anchors
    let prev = anchors[0];
    let next = anchors[anchors.length - 1];

    for (let i = 0; i < anchors.length; i++) {
      if (anchors[i].line <= lineNumber) {
        prev = anchors[i];
        next = anchors[i + 1] || prev;
      } else {
        next = anchors[i];
        break;
      }
    }

    // Interpolate between bracketing anchors
    let targetTop: number;
    if (prev === next || prev.line === next.line) {
      targetTop = prev.top;
    } else {
      const t = (lineNumber - prev.line) / (next.line - prev.line);
      targetTop = prev.top + t * (next.top - prev.top);
    }

    return targetTop;
  }, []);

  // Scroll sync callback — line-based mapping with offset support
  const handleEditorScrollLineChange = useCallback((lineNumber: number) => {
    lastEditorLineRef.current = lineNumber;
    if (!isScrollSyncedRef.current) return;
    const container = previewScrollRef.current;
    if (!container) return;

    const targetTop = calculateTargetScroll(lineNumber);
    const maxScroll = container.scrollHeight - container.clientHeight;
    container.scrollTop = Math.max(0, Math.min(maxScroll, targetTop + scrollOffsetRef.current));
  }, [calculateTargetScroll]);

  const toggleScrollSync = useCallback(() => {
    setIsScrollSynced(prev => {
      const next = !prev;
      isScrollSyncedRef.current = next;
      if (next) {
        // Re-locking: calculate offset so preview continues from where it is
        const container = previewScrollRef.current;
        if (container) {
          const targetTop = calculateTargetScroll(lastEditorLineRef.current);
          scrollOffsetRef.current = container.scrollTop - targetTop;
        }
      }
      return next;
    });
  }, [calculateTargetScroll]);

  // Handle click on preview to navigate editor to source position
  const handlePreviewClickSource = useCallback((info: PreviewClickInfo) => {
    const editor = editorRef.current;
    if (!editor) return;

    // Always search within the full block range for correct occurrence matching
    const searchStart = info.blockStartOffset;
    const searchEnd = info.blockEndOffset;
    const slice = markdown.slice(searchStart, searchEnd);

    // Find the Nth occurrence of the word (N = wordOccurrenceIndex, 0-based)
    let idx = -1;
    let occurrence = 0;
    let searchPos = 0;

    while (searchPos < slice.length) {
      const found = slice.indexOf(info.word, searchPos);
      if (found === -1) break;
      if (occurrence === info.wordOccurrenceIndex) {
        idx = found;
        break;
      }
      occurrence++;
      searchPos = found + info.word.length;
    }

    if (idx === -1) {
      // Fallback: strip markdown syntax chars and search again
      const stripped = slice.replace(/[*_`~\[\]]/g, '');
      let strippedOccurrence = 0;
      let strippedSearchPos = 0;
      let strippedIdx = -1;

      while (strippedSearchPos < stripped.length) {
        const found = stripped.indexOf(info.word, strippedSearchPos);
        if (found === -1) break;
        if (strippedOccurrence === info.wordOccurrenceIndex) {
          strippedIdx = found;
          break;
        }
        strippedOccurrence++;
        strippedSearchPos = found + info.word.length;
      }

      if (strippedIdx !== -1) {
        // Map back to original: find the word by scanning original slice
        let origPos = 0;
        let strippedPos = 0;
        while (strippedPos < strippedIdx && origPos < slice.length) {
          if (!/[*_`~\[\]]/.test(slice[origPos])) {
            strippedPos++;
          }
          origPos++;
        }
        idx = origPos;
      }
    }

    if (idx !== -1) {
      editor.scrollToOffset(searchStart + idx);
    } else {
      // Fallback: navigate to block start
      editor.scrollToOffset(info.blockStartOffset);
    }
  }, [markdown]);

  // Reset preview scroll position and offset when switching tabs
  useEffect(() => {
    if (previewScrollRef.current) {
      previewScrollRef.current.scrollTop = 0;
    }
    scrollOffsetRef.current = 0;
  }, [activeTabId]);

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
    const containerWidth = containerRect.width;
    const relativeX = e.clientX - containerRect.left;
    const percentage = (relativeX / containerWidth) * 100;

    // Calculate minimum percentage based on pixel constraint
    const minPercentFromPixels = (CODE_VIEW_MIN_WIDTH / containerWidth) * 100;
    const effectiveMinPercent = Math.max(SPLIT_MIN_PERCENT, minPercentFromPixels);

    if (percentage >= effectiveMinPercent && percentage <= SPLIT_MAX_PERCENT) {
      setSplitPosition(percentage);
    } else if (percentage < effectiveMinPercent) {
      setSplitPosition(effectiveMinPercent);
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
      {/* Sidebar Container - Animated width (only when not resizing) */}
      <div
        className={`relative flex-shrink-0 ${isResizing ? '' : 'transition-[width] duration-300 ease-in-out'}`}
        style={{ width: isSidebarCollapsed ? 60 : sidebarWidth }}
      >
        {/* Expanded Sidebar */}
        <div
          className={`absolute inset-0 flex transition-opacity duration-300 ease-in-out ${
            isSidebarCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          style={{ width: sidebarWidth }}
        >
          <AssetsSidebar
            markdown={markdown}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onNavigateToLine={handleNavigateToLine}
            onFileSelect={handleFileSelect}
            onDeleteFile={handleDeleteFile}
            onRenameFolder={handleRenameFile}
            onExport={handleExportClick}
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

        {/* Collapsed Sidebar */}
        <div
          className={`absolute inset-0 w-[60px] bg-[var(--bg-primary)] border-r border-[var(--border-primary)] flex flex-col items-center transition-opacity duration-300 ease-in-out ${
            isSidebarCollapsed ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Logo at top */}
          <div className="py-3 w-full flex items-center justify-center">
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
              className="p-2 hover:ring-1 hover:ring-[var(--border-primary)] rounded transition-all"
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
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tabs */}
        <Tabs
          tabs={tabs.map(tab => ({
            id: tab.id,
            title: tab.id.split('/').pop() || 'Untitled',
            isUnsaved: tab.saveStatus === 'unsaved' || tab.saveStatus === 'saving'
          }))}
          activeTabId={activeTabId || ''}
          onTabChange={(tabId) => setActiveTabId(tabId)}
          onTabClose={(tabId) => closeTab(tabId)}
          onNewTab={() => setShowWelcomeModal(true)}
          onTabRename={handleTabRename}
          onTabReorder={reorderTabs}
        />

        {/* Content Area - Based on view mode */}
        <div ref={splitContainerRef} className="flex-1 flex overflow-hidden relative">
          {/* Code Editor */}
          {(viewMode === 'code' || viewMode === 'split') && (
            <div
              className="flex flex-col overflow-hidden"
              style={{
                width: viewMode === 'split' ? `${splitPosition}%` : '100%',
                minWidth: viewMode === 'split' ? `${CODE_VIEW_MIN_WIDTH}px` : undefined,
                ...(viewMode === 'code' ? { maxWidth: `${columnWidth}%`, margin: '0 auto' } : {})
              }}
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
                  saveStatus={saveStatus}
                  documentId={activeTabId}
                  onScrollLineChange={handleEditorScrollLineChange}
                  columnWidth={viewMode !== 'split' ? columnWidth : undefined}
                  onColumnWidthChange={viewMode !== 'split' ? setColumnWidth : undefined}
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
              style={{
                width: viewMode === 'split' ? `calc(${100 - splitPosition}% - 5px)` : '100%',
                ...(viewMode === 'preview' ? { maxWidth: `${columnWidth}%`, margin: '0 auto' } : {})
              }}
            >
              <MarkdownPreview
                content={markdown}
                viewTheme={previewTheme}
                onToggleTheme={togglePreviewTheme}
                previewScrollRef={previewScrollRef}
                isScrollSynced={isScrollSynced}
                onToggleScrollSync={viewMode === 'split' ? toggleScrollSync : undefined}
                onClickSourcePosition={viewMode === 'split' ? handlePreviewClickSource : undefined}
                columnWidth={viewMode !== 'split' ? columnWidth : undefined}
                onColumnWidthChange={viewMode !== 'split' ? setColumnWidth : undefined}
              />
            </div>
          )}
        </div>
      </div>

      {/* Welcome Modal */}
      <WelcomeModal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        onNewDocument={handleNewDocumentFromModal}
        onFileSelect={handleFileSelectFromModal}
        hasOpenFiles={tabs.length > 0}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
        filename={currentFilePath?.split('/').pop()?.replace(/\.md$/, '') || 'documento'}
      />
    </div>
  );
}
