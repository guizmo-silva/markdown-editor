'use client';

import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CodeMirrorEditor, type CodeMirrorHandle } from './Editor';
import { MarkdownPreview, type PreviewClickInfo } from './Preview';
import { AssetsSidebar } from './Sidebar';
import LogoMenu from './Sidebar/LogoMenu';
import { ViewToggle, type ViewMode } from './ViewToggle';
import { Tabs } from './Tabs';
import { Toolbar } from './Toolbar';
import { WelcomeModal } from './WelcomeModal';
import { ExportModal } from './ExportModal';
import { ImportModal } from './ImportModal';
import { TrashModal } from './TrashModal';
import { useThemedIcon } from '@/utils/useThemedIcon';
import { useTheme } from './ThemeProvider';
import { readFile, saveFile, createFile, deleteFile, renameFile, exportToHtml, exportWithImages, exportToPdf, exportToDocx, importDocx, importZip, getVolumes, listFiles, getTrashCount } from '@/services/api';

const SIDEBAR_MIN_WIDTH = 230;
const SIDEBAR_MAX_WIDTH = 380;
const SPLIT_MIN_PERCENT = 20; // Minimum 20% for each panel
const SPLIT_MAX_PERCENT = 80; // Maximum 80% for each panel
const CODE_VIEW_MIN_WIDTH = 350; // Minimum width in pixels for code view

// Interface for tab data
interface TabData {
  id: string; // file path
  stableKey: number; // stable numeric key — never changes, even when id (path) changes
  content: string;
  lastSavedContent: string;
  isAutoNamed: boolean;
  lastAutoRenamedTitle: string;
  saveStatus: 'saved' | 'saving' | 'unsaved' | 'error';
}

export default function EditorLayout() {
  const { getIconPath } = useThemedIcon();
  const { theme: globalTheme } = useTheme();
  const { t } = useTranslation();
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
  const toolbarWrapperRef = useRef<HTMLDivElement>(null);
  const [sidebarBorderTop, setSidebarBorderTop] = useState(75);
  const editorRef = useRef<CodeMirrorHandle>(null);
  const tabKeyCounter = useRef(0);

  // Multi-tab state
  const [tabs, setTabs] = useState<TabData[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const [scrollToLine, setScrollToLine] = useState<number | undefined>();
  const [isScrollSynced, setIsScrollSynced] = useState(true);
  const isScrollSyncedRef = useRef(true);
  const previewScrollRef = useRef<HTMLDivElement>(null);
  const scrollOffsetRef = useRef(0);
  const lastEditorLineRef = useRef(1);
  // Track which side initiated scroll to prevent infinite loops
  const scrollingFromRef = useRef<'editor' | 'preview' | null>(null);
  const scrollResetTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Suppress both sync directions during content re-renders (prevents scroll tremor while typing)
  const suppressPreviewSyncRef = useRef(false);
  const suppressEditorSyncRef = useRef(false);
  const suppressSyncTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Track preview scroll direction for monotonic editor sync
  const lastPreviewScrollTopRef = useRef(0);
  // Scroll memory: save scroll positions when switching view modes
  const editorScrollMemory = useRef(0);
  const previewScrollMemory = useRef(0);
  // Pending navigation: set in preview-only mode, applied when editor becomes visible
  const pendingCursorOffset = useRef<number | null>(null);
  const pendingScrollLine = useRef<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fileRefreshTrigger, setFileRefreshTrigger] = useState(0);
  // Track which open tabs belong to a document folder (have images)
  const [tabsWithImages, setTabsWithImages] = useState<Set<string>>(new Set());
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showTrashModal, setShowTrashModal] = useState(false);
  const [trashCount, setTrashCount] = useState(0);
  const [imageRevision, setImageRevision] = useState(0);
  const importDestFolderRef = useRef<string>('/');
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const AUTOSAVE_DELAY = 1000; // 1 second debounce
  const [showDividerTooltip, setShowDividerTooltip] = useState(false);
  const dividerTooltipTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Get active tab data
  const activeTab = tabs.find(t => t.id === activeTabId);
  const markdown = activeTab?.content ?? '';
  const markdownRef = useRef(markdown);
  markdownRef.current = markdown;
  const saveStatus = activeTab?.saveStatus ?? 'saved';
  const isAutoNamed = activeTab?.isAutoNamed ?? false;
  const currentFilePath = activeTabId;

  // Debounced content for preview — prevents per-keystroke ReactMarkdown re-renders,
  // which destroy and recreate <img> elements on every keystroke causing layout shifts.
  const [previewContent, setPreviewContent] = useState(markdown);
  useEffect(() => {
    const timer = setTimeout(() => setPreviewContent(markdown), 150);
    return () => clearTimeout(timer);
  }, [markdown]);

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

  // Load trash count on mount
  useEffect(() => {
    getTrashCount().then(setTrashCount).catch(() => {});
  }, []);

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

  // onChange handler for CodeMirrorEditor: sets suppress flags synchronously, BEFORE any
  // rAFs from CodeMirror (cursor-visibility scroll adjustment) can fire handleEditorScrollLineChange.
  // The useLayoutEffect below only fires after React re-renders, which is too late — by that time
  // the CodeMirror rAF has already run and set a wrong scrollTop (causing the visible "jump").
  const handleEditorChange = useCallback((content: string | ((prev: string) => string)) => {
    suppressEditorSyncRef.current = true;
    suppressPreviewSyncRef.current = true;
    clearTimeout(suppressSyncTimerRef.current);
    suppressSyncTimerRef.current = setTimeout(() => {
      suppressEditorSyncRef.current = false;
      suppressPreviewSyncRef.current = false;
    }, 150);
    setMarkdown(content);
  }, [setMarkdown]);

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
      const newTabs = prevTabs.filter(t => t.id !== tabId);

      if (newTabs.length === 0) {
        // Last tab closed — show welcome modal
        setActiveTabId('');
        setShowWelcomeModal(true);
        return newTabs;
      }

      // If we're closing the active tab, switch to another
      if (activeTabId === tabId) {
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

  // Extract a document title from markdown content.
  // First tries any heading level; falls back to the first meaningful text line,
  // skipping pure image lines and stripping all inline markdown formatting.
  const extractFirstHeading = useCallback((content: string): string | null => {
    const MAX_LENGTH = 50;

    const clean = (text: string): string =>
      text
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')       // remove images
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')    // links → text only
        .replace(/\*{1,3}([^*\n]*)\*{1,3}/g, '$1') // bold/italic (asterisks)
        .replace(/_{1,3}([^_\n]*)_{1,3}/g, '$1')   // bold/italic (underscores)
        .replace(/`[^`\n]+`/g, '')                  // inline code
        .replace(/[<>:"/\\|?*]/g, '')               // invalid filename chars
        .trim();

    // Try any heading level first (# to ######)
    const headingMatch = content.match(/^#{1,6}\s+(.+)$/m);
    if (headingMatch) {
      const title = clean(headingMatch[1]).substring(0, MAX_LENGTH).trim();
      return title || null;
    }

    // Fallback: find first non-empty, non-image text line
    for (const rawLine of content.split('\n')) {
      let line = rawLine.trim();
      if (!line) continue;
      if (/^!\[/.test(line)) continue;        // pure image line
      if (/^(```|~~~)/.test(line)) continue;  // code fence
      if (/^<!--/.test(line)) continue;       // HTML comment
      if (/^---+$/.test(line)) continue;      // hr / frontmatter separator

      // Strip block-level markers before cleaning
      line = line
        .replace(/^#{1,6}\s+/, '')
        .replace(/^>\s*/, '')
        .replace(/^[-*+]\s+/, '')
        .replace(/^\d+\.\s+/, '');

      const title = clean(line).substring(0, MAX_LENGTH).trim();
      if (title) return title;
    }

    return null;
  }, []);

  const handleNavigateToLine = (line: number) => {
    if (viewMode === 'preview') {
      // In preview-only mode, scroll the preview directly
      const container = previewScrollRef.current;
      if (container) {
        const targetTop = calculateTargetScroll(line);
        const maxScroll = container.scrollHeight - container.clientHeight;
        container.scrollTop = Math.max(0, Math.min(maxScroll, targetTop));
      }
      // Save line so the editor scrolls to match when it becomes visible
      pendingScrollLine.current = line;
    } else {
      setScrollToLine(line);
      // Reset after navigation to allow re-navigation to same line
      setTimeout(() => setScrollToLine(undefined), 100);
    }
  };

  const handleFileSelect = async (filePath: string) => {
    // Skip image files — they're not editable in the text editor
    const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico', '.tiff', '.tif', '.avif']);
    const ext = filePath.includes('.') ? '.' + filePath.split('.').pop()!.toLowerCase() : '';
    if (imageExtensions.has(ext)) return;

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
        stableKey: ++tabKeyCounter.current,
        content,
        lastSavedContent: content,
        isAutoNamed: false,
        lastAutoRenamedTitle: '',
        saveStatus: 'saved'
      };
      addOrSwitchToTab(newTab);

      // Check if the file is inside a document folder with local images
      const pathParts = filePath.split('/');
      const fileNameWithoutExt = pathParts[pathParts.length - 1].replace(/\.md$/, '');
      const parentDirName = pathParts.length >= 2 ? pathParts[pathParts.length - 2] : '';
      if (parentDirName && parentDirName === fileNameWithoutExt) {
        const parentDirPath = pathParts.slice(0, -1).join('/');
        try {
          const siblings = await listFiles(parentDirPath);
          if (siblings.some(f => f.type === 'image')) {
            setTabsWithImages(prev => {
              const next = new Set(prev);
              next.add(filePath);
              return next;
            });
          }
        } catch {
          // non-critical
        }
      }
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
    const initialContent = '';
    try {
      await createFile(fileName, initialContent);
      setFileRefreshTrigger(prev => prev + 1);

      // Create new tab for the file
      const newTab: TabData = {
        id: fileName,
        stableKey: ++tabKeyCounter.current,
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
      // If an image was deleted, bust the preview cache so it disappears immediately
      const imageExts = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico', '.tiff', '.tif', '.avif']);
      const ext = filePath.includes('.') ? '.' + filePath.split('.').pop()!.toLowerCase() : '';
      if (imageExts.has(ext)) {
        setImageRevision(prev => prev + 1);
      }
      // Close tab if we deleted its file
      closeTab(filePath);
      // Refresh trash count
      getTrashCount().then(setTrashCount).catch(() => {});
    } catch (err) {
      console.error('Failed to delete file:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete file');
    }
  };

  const handleRenameFile = async (oldPath: string, newPath: string) => {
    try {
      await renameFile(oldPath, newPath);
      setFileRefreshTrigger(prev => prev + 1);
      // If an image was moved, bust the preview cache so linked images reload
      const imageExts = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico', '.tiff', '.tif', '.avif']);
      const ext = oldPath.includes('.') ? '.' + oldPath.split('.').pop()!.toLowerCase() : '';
      if (imageExts.has(ext)) {
        setImageRevision(prev => prev + 1);
      }
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

  const handleImportConfirm = useCallback((destFolder: string) => {
    importDestFolderRef.current = destFolder;
    importFileInputRef.current?.click();
  }, []);

  const handleImportFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (file.name.toLowerCase().endsWith('.docx')) {
      const destFolder = importDestFolderRef.current;
      try {
        const { filePath } = await importDocx(file, destFolder);
        await handleFileSelect(filePath);
        setFileRefreshTrigger(t => t + 1);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Erro ao importar .docx');
      }
      return;
    }

    if (file.name.toLowerCase().endsWith('.zip')) {
      const destFolder = importDestFolderRef.current;
      try {
        const { filePath } = await importZip(file, destFolder);
        await handleFileSelect(filePath);
        setFileRefreshTrigger(t => t + 1);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Erro ao importar .zip');
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const content = ev.target?.result as string;
      const destFolder = importDestFolderRef.current;
      // Convert .txt to .md — backend only indexes .md files
      const rawName = file.name;
      const baseName = rawName.endsWith('.txt')
        ? rawName.slice(0, -4) + '.md'
        : rawName;
      const stem = baseName.endsWith('.md') ? baseName.slice(0, -3) : baseName;
      const ext = baseName.endsWith('.md') ? '.md' : '';

      let finalPath = '';
      let counter = 0;
      while (true) {
        const candidateName = counter === 0 ? baseName : `${stem} (${counter})${ext}`;
        finalPath = destFolder === '/' ? candidateName : `${destFolder}/${candidateName}`;
        try {
          await createFile(finalPath, content);
          break;
        } catch (err) {
          const msg = err instanceof Error ? err.message : '';
          if (msg.toLowerCase().includes('already exists')) {
            counter++;
          } else {
            alert(msg || 'Erro ao importar arquivo');
            return;
          }
        }
      }

      await handleFileSelect(finalPath);
      setFileRefreshTrigger(t => t + 1);
    };
    reader.readAsText(file, 'UTF-8');
  }, [handleFileSelect]);

  const handleImageImported = useCallback((newDocPath: string, _imageName: string) => {
    if (!activeTabId) return;
    const oldTabId = activeTabId;

    // Mark this document as having images
    setTabsWithImages(prev => {
      const next = new Set(prev);
      next.add(newDocPath);
      return next;
    });

    // If the .md was moved into a document folder, update the tab ID in place.
    // The content is preserved — insertText already modified CodeMirror before this
    // callback fires, so re-reading the disk would lose the just-inserted image tag.
    if (newDocPath !== oldTabId) {
      updateTabId(oldTabId, newDocPath);
    }

    // Refresh file tree
    setFileRefreshTrigger(t => t + 1);
  }, [activeTabId, updateTabId]);

  const handleExport = async (format: 'html' | 'md' | 'txt' | 'pdf' | 'docx') => {
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
      if (format === 'docx') {
        const blob = await exportToDocx(markdown, filename, currentFilePath ?? undefined);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setShowExportModal(false);
        return;
      }

      if (format === 'pdf') {
        const previewEl = document.querySelector('.markdown-preview') as HTMLElement | null;
        if (!previewEl) {
          alert('Alterne para o modo Split ou Preview para exportar em PDF.');
          return;
        }

        // Clonar para não modificar o DOM original
        const clone = previewEl.cloneNode(true) as HTMLElement;

        // Converter imagens para base64 (inline data URIs)
        const imgs = Array.from(clone.querySelectorAll('img'));
        await Promise.all(imgs.map(async (img) => {
          const src = img.getAttribute('src');
          if (!src || src.startsWith('data:')) return;
          try {
            const resp = await fetch(src);
            const blob = await resp.blob();
            const b64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            img.setAttribute('src', b64);
          } catch {
            // Manter src original se falhar
          }
        }));

        const blob = await exportToPdf(clone.innerHTML, filename);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setShowExportModal(false);
        return;
      }

      const hasImages = currentFilePath ? tabsWithImages.has(currentFilePath) : false;

      if (hasImages && currentFilePath) {
        // Export as zip with images
        const zipBlob = await exportWithImages(currentFilePath, format, filename);
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
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
        const downloadBlob = new Blob([content!], { type: mimeType! });
        const url = URL.createObjectURL(downloadBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.${extension!}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

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
    // Return same reference if nothing changed to avoid unnecessary re-renders
    setTabs(prevTabs => {
      const needsUpdate = prevTabs.some(tab =>
        tab.id === activeTabId && tab.saveStatus !== 'unsaved'
      );
      if (!needsUpdate) return prevTabs;
      return prevTabs.map(tab =>
        tab.id === activeTabId && tab.saveStatus !== 'unsaved'
          ? { ...tab, saveStatus: 'unsaved' }
          : tab
      );
    });

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

    // Don't rename if it's already the same name — but mark as done
    if (newFileName === currentFileName) {
      setTabs(prevTabs => prevTabs.map(tab =>
        tab.id === activeTabId ? { ...tab, isAutoNamed: false, lastAutoRenamedTitle: heading } : tab
      ));
      return;
    }

    // Debounce the rename to avoid too many API calls
    const currentTabId = activeTabId;
    const contentToSave = activeContent;

    const renameTimeout = setTimeout(async () => {
      // Resolve a unique name to avoid conflicts with existing files or open tabs
      let uniqueFileName = newFileName;
      try {
        const dirPath = directory || '/';
        const existingFiles = await listFiles(dirPath);
        const existingNames = new Set(existingFiles.map(f => f.name));

        // Also include names from other open tabs in the same directory
        tabs.forEach(tab => {
          if (tab.id !== currentTabId) {
            const lastSlash = tab.id.lastIndexOf('/');
            const tabDir = lastSlash > 0 ? tab.id.substring(0, lastSlash + 1) : '';
            if (tabDir === directory) {
              existingNames.add(tab.id.substring(lastSlash + 1));
            }
          }
        });

        // Remove current file from the set (it will be renamed, not a conflict)
        existingNames.delete(currentFileName);

        if (existingNames.has(newFileName)) {
          let counter = 1;
          while (existingNames.has(`${truncatedHeading} (${counter}).md`)) counter++;
          uniqueFileName = `${truncatedHeading} (${counter}).md`;
        }
      } catch {
        // If listing fails, proceed with the original name
      }

      const newPath = directory + uniqueFileName;

      try {
        // First save current content
        await saveFile(currentTabId, contentToSave);
        // Then rename
        await renameFile(currentTabId, newPath);
        // Update tab ID and state — disable auto-rename after first successful rename
        setTabs(prevTabs => prevTabs.map(tab =>
          tab.id === currentTabId
            ? {
                ...tab,
                id: newPath,
                isAutoNamed: false,
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
  }, [activeTabId, activeContent, activeIsAutoNamed, activeSaveStatus, activeLastAutoRenamedTitle, extractFirstHeading, tabs]);

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

  // Scroll sync callback — editor scrolls → preview follows
  const handleEditorScrollLineChange = useCallback((lineNumber: number) => {
    lastEditorLineRef.current = lineNumber;
    if (!isScrollSyncedRef.current) return;
    if (suppressEditorSyncRef.current) return;
    if (scrollingFromRef.current === 'preview') {
      // Restart timer — programmatic scroll events are still arriving
      clearTimeout(scrollResetTimerRef.current);
      scrollResetTimerRef.current = setTimeout(() => { scrollingFromRef.current = null; }, 150);
      return;
    }

    scrollingFromRef.current = 'editor';
    clearTimeout(scrollResetTimerRef.current);
    scrollResetTimerRef.current = setTimeout(() => { scrollingFromRef.current = null; }, 100);

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

  // Scroll sync callback — preview scrolls → editor follows
  // Uses fraction-based mapping to avoid CodeMirror's virtualization issues
  // (estimated heights for off-screen lines cause wrong scroll positions)
  const handlePreviewScroll = useCallback(() => {
    if (!isScrollSyncedRef.current) return;
    if (scrollingFromRef.current === 'editor') return;

    scrollingFromRef.current = 'preview';
    clearTimeout(scrollResetTimerRef.current);
    scrollResetTimerRef.current = setTimeout(() => { scrollingFromRef.current = null; }, 150);

    const container = previewScrollRef.current;
    if (!container) return;

    const previewMaxScroll = container.scrollHeight - container.clientHeight;
    if (previewMaxScroll <= 0) return;

    // Detect scroll direction
    const isScrollingDown = container.scrollTop >= lastPreviewScrollTopRef.current;
    lastPreviewScrollTopRef.current = container.scrollTop;

    const fraction = container.scrollTop / previewMaxScroll;
    editorRef.current?.scrollToFraction(fraction, isScrollingDown);
  }, []);

  // When content changes, suppress both sync directions for 150ms (trailing debounce).
  // This prevents tremor caused by:
  // - Browser scroll anchoring firing 'scroll' on the preview after DOM height changes
  //   (which would incorrectly trigger preview→editor sync)
  // - CodeMirror firing scroll events per-keystroke (cursor visibility maintenance)
  //   (which would incorrectly trigger editor→preview sync with stale DOM positions)
  // 2 rAF frames (~32ms) is insufficient because CodeMirror measures line heights lazily
  // over multiple frames for large documents, firing scroll adjustments well after the
  // initial keystroke. A 150ms trailing debounce covers all lazy measurement frames.
  // We intentionally do NOT do a forced re-sync after the window: calculateTargetScroll
  // reads getBoundingClientRect() which changes on every keystroke due to text reflow,
  // and forcing a scrollTop update would cause the visible tremor in lines below the cursor.
  // The browser's scroll anchoring already keeps the viewport visually stable.
  // useLayoutEffect fires before paint (before any rAF scroll handlers), so the flags
  // are always set before handlePreviewScroll / handleEditorScrollLineChange can run.
  // Suppress scroll sync WHEN THE PREVIEW ACTUALLY RE-RENDERS (previewContent changes),
  // not when markdown changes. With the debounce, previewContent lags markdown by 150ms.
  // If we suppress on [markdown], the 150ms window expires before previewContent updates,
  // leaving scroll anchoring events from the debounced re-render unsuppressed.
  useLayoutEffect(() => {
    if (viewMode !== 'split') return;
    suppressPreviewSyncRef.current = true;
    suppressEditorSyncRef.current = true;
    clearTimeout(suppressSyncTimerRef.current);
    suppressSyncTimerRef.current = setTimeout(() => {
      suppressPreviewSyncRef.current = false;
      suppressEditorSyncRef.current = false;
    }, 150);
    return () => clearTimeout(suppressSyncTimerRef.current);
  }, [previewContent, viewMode]);

  // Attach scroll listener to preview container for bidirectional sync.
  // KEY: only sync when the user actually scrolled (wheel/touch event preceded the scroll).
  // Scroll anchoring fires 'scroll' events but NOT 'wheel' events, so this gate
  // eliminates the entire class of spurious syncs caused by scroll anchoring adjustments
  // during React re-renders — no timing heuristics needed, works in all browsers.
  useEffect(() => {
    const container = previewScrollRef.current;
    if (!container || viewMode !== 'split') return;

    let userScrolling = false;
    let userScrollTimeout = 0;
    let rafId = 0;

    const markUserScroll = () => {
      userScrolling = true;
      clearTimeout(userScrollTimeout);
      userScrollTimeout = window.setTimeout(() => { userScrolling = false; }, 300);
    };

    const onScroll = () => {
      if (!userScrolling) return; // skip scroll anchoring and programmatic scrollTop changes
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        handlePreviewScroll();
      });
    };

    container.addEventListener('wheel', markUserScroll, { passive: true });
    container.addEventListener('touchstart', markUserScroll, { passive: true });
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      container.removeEventListener('wheel', markUserScroll);
      container.removeEventListener('touchstart', markUserScroll);
      container.removeEventListener('scroll', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
      clearTimeout(userScrollTimeout);
    };
  }, [viewMode, handlePreviewScroll]);

  // Resolve clicked word to a source offset in the markdown string.
  // Uses markdownRef (not markdown state) so the callback is stable and never
  // causes MarkdownPreview to re-render per-keystroke.
  const resolvePreviewClickOffset = useCallback((info: PreviewClickInfo): number => {
    const md = markdownRef.current;
    const searchStart = info.blockStartOffset;
    const slice = md.slice(searchStart, info.blockEndOffset);

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

    return idx !== -1 ? searchStart + idx : info.blockStartOffset;
  }, []); // stable — reads markdown via ref, no reactive deps

  // Handle click on preview to navigate editor to source position
  const handlePreviewClickSource = useCallback((info: PreviewClickInfo) => {
    const offset = resolvePreviewClickOffset(info);
    const editor = editorRef.current;

    if (editor && (viewMode === 'split' || viewMode === 'code')) {
      // Editor is visible — navigate immediately
      editor.scrollToOffset(offset);
    } else {
      // Preview-only mode — store offset for when editor becomes visible
      pendingCursorOffset.current = offset;
    }
  }, [resolvePreviewClickOffset, viewMode]);

  // Reset preview scroll position and offset when switching tabs
  useEffect(() => {
    if (previewScrollRef.current) {
      previewScrollRef.current.scrollTop = 0;
    }
    scrollOffsetRef.current = 0;
  }, [activeTabId]);

  // Wrapper: save scroll positions BEFORE switching, then restore after render
  const handleViewModeChange = useCallback((next: ViewMode) => {
    const prev = viewMode;
    if (prev === next) return;

    // Save scroll from views currently visible (components still mounted here)
    if (prev === 'code' || prev === 'split') {
      editorScrollMemory.current = editorRef.current?.getScrollTop() ?? 0;
    }
    if (prev === 'preview' || prev === 'split') {
      previewScrollMemory.current = previewScrollRef.current?.scrollTop ?? 0;
    }

    setViewMode(next);

    // Restore after React renders the new view
    requestAnimationFrame(() => {
      if (next === 'code' || next === 'split') {
        if (pendingCursorOffset.current !== null) {
          // Word-click from preview: scroll editor to exact offset
          editorRef.current?.scrollToOffset(pendingCursorOffset.current);
          pendingCursorOffset.current = null;
          pendingScrollLine.current = null;
        } else if (pendingScrollLine.current !== null) {
          // Sidebar navigation from preview: scroll editor to that line
          setScrollToLine(pendingScrollLine.current);
          setTimeout(() => setScrollToLine(undefined), 100);
          pendingScrollLine.current = null;
        } else {
          editorRef.current?.setScrollTop(editorScrollMemory.current);
        }
      }
      if (next === 'preview' || next === 'split') {
        if (previewScrollRef.current) {
          previewScrollRef.current.scrollTop = previewScrollMemory.current;
        }
      }
    });
  }, [viewMode]);

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

  const handleDividerMouseEnter = useCallback(() => {
    dividerTooltipTimerRef.current = setTimeout(() => setShowDividerTooltip(true), 600);
  }, []);

  const handleDividerMouseLeave = useCallback(() => {
    clearTimeout(dividerTooltipTimerRef.current);
    setShowDividerTooltip(false);
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

  // Measure toolbar bottom position to align sidebar border dynamically.
  // Re-runs when viewMode changes (toolbar appears/disappears) and on window resize (browser zoom).
  useEffect(() => {
    const update = () => {
      const toolbar = toolbarWrapperRef.current;
      if (toolbar) {
        setSidebarBorderTop(toolbar.getBoundingClientRect().bottom - 1);
      } else {
        const content = splitContainerRef.current;
        if (content) setSidebarBorderTop(content.getBoundingClientRect().top);
      }
    };
    update();
    window.addEventListener('resize', update);
    const el = toolbarWrapperRef.current;
    const observer = el ? new ResizeObserver(update) : null;
    observer?.observe(el!);
    return () => {
      window.removeEventListener('resize', update);
      observer?.disconnect();
    };
  }, [viewMode]);

  return (
    <div className="h-screen w-screen flex flex-row bg-[var(--bg-primary)]"
      style={{ '--sidebar-border-top': `${sidebarBorderTop}px` } as React.CSSProperties}
    >
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
            onViewModeChange={handleViewModeChange}
            onNavigateToLine={handleNavigateToLine}
            onFileSelect={handleFileSelect}
            onDeleteFile={handleDeleteFile}
            onRenameFolder={handleRenameFile}
            onExport={handleExportClick}
            onImportClick={() => setShowImportModal(true)}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={handleToggleSidebar}
            width={sidebarWidth}
            fileRefreshTrigger={fileRefreshTrigger}
            trashCount={trashCount}
            onOpenTrash={() => setShowTrashModal(true)}
          />
          {/* Resize Handle */}
          <div
            className="absolute top-0 right-0 w-3 h-full cursor-col-resize z-10 flex items-stretch justify-center group"
            onMouseDown={handleResizeStart}
          >
            <div className="w-px h-full bg-transparent group-hover:bg-[var(--split-line)] transition-colors" />
          </div>
        </div>

        {/* Collapsed Sidebar */}
        <div
          className={`absolute inset-0 w-[60px] bg-[var(--bg-primary)] flex flex-col items-center transition-opacity duration-300 ease-in-out ${
            isSidebarCollapsed ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Logo with Menu at top */}
          <div className="py-3 w-full flex items-center justify-center">
            <LogoMenu onImportClick={() => setShowImportModal(true)} />
          </div>

          {/* Vertical Toggle */}
          <div className="py-3 flex-1">
            <ViewToggle currentMode={viewMode} onModeChange={handleViewModeChange} vertical={true} />
          </div>

          {/* Trash button (collapsed, only when trash has items) */}
          {trashCount > 0 && (
            <div className="pb-2">
              <button
                onClick={() => setShowTrashModal(true)}
                className="p-2 hover:ring-1 hover:ring-[var(--border-primary)] rounded transition-all text-[var(--text-secondary)]"
                title={`Lixeira (${trashCount})`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            </div>
          )}

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
              className={`flex flex-col ${viewMode === 'split' ? 'overflow-hidden' : 'min-h-0'}`}
              style={{
                width: viewMode === 'split' ? `${splitPosition}%` : '100%',
                minWidth: viewMode === 'split' ? `${CODE_VIEW_MIN_WIDTH}px` : undefined,
                ...(viewMode === 'code' ? { maxWidth: `${columnWidth}%`, margin: '0 auto' } : {})
              }}
            >
              <div ref={toolbarWrapperRef}>
                <Toolbar
                  textareaRef={editorRef}
                  value={markdown}
                  onChange={setMarkdown}
                  currentFilePath={currentFilePath ?? undefined}
                  onImageImported={handleImageImported}
                />
              </div>
              <div className={`flex-1 ${viewMode === 'split' ? 'overflow-hidden' : 'min-h-0'}`}>
                <CodeMirrorEditor
                  ref={editorRef}
                  value={markdown}
                  onChange={handleEditorChange}
                  scrollToLine={scrollToLine}
                  viewTheme={editorTheme}
                  onToggleTheme={toggleEditorTheme}
                  saveStatus={saveStatus}
                  documentId={activeTab ? String(activeTab.stableKey) : null}
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
              className="relative w-[5px] bg-[var(--split-line)] cursor-col-resize hover:bg-[var(--text-secondary)] active:bg-[var(--text-secondary)] transition-colors flex-shrink-0 flex flex-col items-center justify-center gap-[3px]"
              onMouseDown={handleSplitResizeStart}
              onDoubleClick={() => setSplitPosition(50)}
              onMouseEnter={handleDividerMouseEnter}
              onMouseLeave={handleDividerMouseLeave}
            >
              <div className="w-[3px] h-[3px] rounded-full bg-[var(--bg-secondary)]" />
              <div className="w-[3px] h-[3px] rounded-full bg-[var(--bg-secondary)]" />
              <div className="w-[3px] h-[3px] rounded-full bg-[var(--bg-secondary)]" />
              {showDividerTooltip && (
                <div className="absolute top-1/2 -translate-y-1/2 left-[calc(100%+8px)] z-50 whitespace-nowrap bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-xs px-2 py-1 rounded shadow-md pointer-events-none border border-[var(--split-line)]">
                  {t('tooltips.splitResizer')}
                </div>
              )}
            </div>
          )}

          {/* Preview */}
          {(viewMode === 'preview' || viewMode === 'split') && (
            <div
              className={viewMode === 'split' ? 'overflow-hidden' : 'min-h-0'}
              style={{
                width: viewMode === 'split' ? `calc(${100 - splitPosition}% - 5px)` : '100%',
                ...(viewMode === 'preview' ? { maxWidth: `${columnWidth}%`, margin: '0 auto' } : {})
              }}
            >
              <MarkdownPreview
                content={previewContent}
                viewTheme={previewTheme}
                onToggleTheme={togglePreviewTheme}
                previewScrollRef={previewScrollRef}
                isScrollSynced={isScrollSynced}
                onToggleScrollSync={viewMode === 'split' ? toggleScrollSync : undefined}
                onClickSourcePosition={handlePreviewClickSource}
                columnWidth={viewMode !== 'split' ? columnWidth : undefined}
                onColumnWidthChange={viewMode !== 'split' ? setColumnWidth : undefined}
                filePath={currentFilePath ?? undefined}
                imageRevision={imageRevision}
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
        hasImages={currentFilePath ? tabsWithImages.has(currentFilePath) : false}
      />

      {/* Hidden input for file import */}
      <input
        ref={importFileInputRef}
        type="file"
        accept=".md,.txt,.docx,.zip"
        className="hidden"
        onChange={handleImportFileChange}
      />

      {/* Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onConfirm={handleImportConfirm}
      />

      {/* Trash Modal */}
      <TrashModal
        isOpen={showTrashModal}
        onClose={() => setShowTrashModal(false)}
        onChanged={() => {
          getTrashCount().then(setTrashCount).catch(() => {});
          setFileRefreshTrigger(prev => prev + 1);
        }}
        onImageRestored={() => setImageRevision(prev => prev + 1)}
      />
    </div>
  );
}
