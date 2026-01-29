'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useThemedIcon } from '@/utils/useThemedIcon';
import { listFiles, type FileItem } from '@/services/api';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNewDocument: (folderPath?: string) => void;
  onFileSelect: (filePath: string) => void;
  hasOpenFiles?: boolean;
}

export default function WelcomeModal({
  isOpen,
  onClose,
  onNewDocument,
  onFileSelect,
  hasOpenFiles = false
}: WelcomeModalProps) {
  const { t } = useTranslation();
  const { getIconPath } = useThemedIcon();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [folderContents, setFolderContents] = useState<Map<string, FileItem[]>>(new Map());
  const [selectedFolder, setSelectedFolder] = useState<string>('/');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isWorkspaceExpanded, setIsWorkspaceExpanded] = useState(true);

  const loadRecentFiles = useCallback(async () => {
    setIsLoading(true);
    // Clear cached folder contents to force fresh data
    setFolderContents(new Map());
    try {
      const fileList = await listFiles('/');
      setFiles(fileList);
      // Auto-expand all folders initially
      const folders = fileList.filter(f => f.type === 'folder').map(f => f.path);
      setExpandedFolders(new Set(folders));
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadRecentFiles();
    }
  }, [isOpen, loadRecentFiles]);

  // Handle ESC key to close modal (only if there are open files)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && hasOpenFiles) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, hasOpenFiles]);

  const handleFolderToggle = async (path: string) => {
    const newExpanded = new Set(expandedFolders);

    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
      // Load folder contents if not already loaded
      if (!folderContents.has(path)) {
        try {
          const contents = await listFiles(path);
          setFolderContents(prev => new Map(prev).set(path, contents));
        } catch (error) {
          console.error('Failed to load folder contents:', error);
        }
      }
    }

    setExpandedFolders(newExpanded);
  };

  const handleFileClick = (filePath: string) => {
    onFileSelect(filePath);
  };

  const handleNewDocument = () => {
    onNewDocument(selectedFolder);
  };

  // Extract all folders from files and folderContents
  const getAllFolders = useCallback((): { path: string; name: string; level: number }[] => {
    const folders: { path: string; name: string; level: number }[] = [];

    const extractFolders = (items: FileItem[], level: number = 0) => {
      for (const item of items) {
        if (item.type === 'folder') {
          folders.push({
            path: item.path,
            name: item.name,
            level
          });
          // Check for loaded subfolder contents
          const subContents = folderContents.get(item.path);
          if (subContents) {
            extractFolders(subContents, level + 1);
          } else if (item.children) {
            extractFolders(item.children, level + 1);
          }
        }
      }
    };

    extractFolders(files);
    return folders;
  }, [files, folderContents]);

  const allFolders = getAllFolders();

  const handleBackdropClick = () => {
    if (hasOpenFiles) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-[var(--dropdown-bg)] rounded-lg shadow-xl p-8 w-[700px] h-[400px] max-w-[90vw] flex gap-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Side: Folder Selector + New Document Button */}
        <div className="flex-shrink-0 flex flex-col gap-3">
          {/* Folder Dropdown */}
          <div className="relative">
            <label
              className="text-[11px] text-[var(--text-secondary)] mb-1 block"
              style={{ fontFamily: 'Roboto Mono, monospace' }}
            >
              {t('welcomeModal.folder', 'Pasta:')}
            </label>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-[160px] h-[32px] px-3 border border-[var(--border-primary)]
                         rounded bg-[var(--bg-secondary)] flex items-center justify-between
                         hover:border-[var(--text-secondary)] transition-colors cursor-pointer"
              style={{ fontFamily: 'Roboto Mono, monospace' }}
            >
              <span className="text-[12px] text-[var(--text-primary)] truncate">
                {selectedFolder === '/' ? 'Workspace' : selectedFolder.split('/').pop()}
              </span>
              <img
                src={getIconPath('element_fold_icon.svg')}
                alt=""
                className={`w-3 h-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div
                className="absolute top-full left-0 w-[160px] mt-1 border border-[var(--border-primary)]
                           rounded bg-[var(--dropdown-bg)] shadow-lg z-10 max-h-[200px] overflow-y-auto"
              >
                {/* Workspace (root) option */}
                <button
                  onClick={() => {
                    setSelectedFolder('/');
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-[12px] hover:bg-[var(--hover-bg)] transition-colors
                             ${selectedFolder === '/' ? 'bg-[var(--hover-bg)]' : ''}`}
                  style={{ fontFamily: 'Roboto Mono, monospace' }}
                >
                  <span className="text-[var(--text-primary)]">Workspace</span>
                </button>

                {/* Folder options */}
                {allFolders.map((folder) => (
                  <button
                    key={folder.path}
                    onClick={() => {
                      setSelectedFolder(folder.path);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-[12px] hover:bg-[var(--hover-bg)] transition-colors
                               ${selectedFolder === folder.path ? 'bg-[var(--hover-bg)]' : ''}`}
                    style={{
                      fontFamily: 'Roboto Mono, monospace',
                      paddingLeft: `${12 + folder.level * 12}px`
                    }}
                  >
                    <span className="text-[var(--text-primary)] truncate block">
                      {folder.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* New Document Button */}
          <button
            onClick={handleNewDocument}
            className="w-[160px] h-[130px] border-2 border-dashed border-[var(--border-primary)]
                       rounded-lg flex flex-col items-center justify-center gap-3
                       hover:border-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]
                       transition-all cursor-pointer"
          >
            <img
              src={getIconPath('newDocument_icon.svg')}
              alt="New Document"
              className="w-14 h-auto"
            />
            <span
              className="text-[13px] text-[var(--text-primary)] font-medium"
              style={{ fontFamily: 'Roboto Mono, monospace' }}
            >
              {t('welcomeModal.newDocument', 'Novo Documento')}
            </span>
          </button>
        </div>

        {/* Right Side: Recent Documents */}
        <div className="flex-1 min-w-0 flex flex-col">
          <h2
            className="text-[16px] font-bold text-[var(--text-primary)] mb-4 flex-shrink-0"
            style={{ fontFamily: 'Roboto Mono, monospace' }}
          >
            {t('welcomeModal.recentDocuments', 'Documentos recentes:')}
          </h2>

          <div className="flex-1 overflow-y-auto pr-2 welcome-modal-tree">
            {isLoading ? (
              <div className="text-[var(--text-secondary)] text-sm">
                {t('welcomeModal.loading', 'Carregando...')}
              </div>
            ) : (
              <div>
                {/* Workspace root node */}
                <div
                  onClick={() => setIsWorkspaceExpanded(!isWorkspaceExpanded)}
                  className="flex items-center gap-2 py-1.5 pr-2 hover:bg-[var(--hover-bg)] cursor-pointer rounded transition-colors"
                >
                  <svg className="w-4 h-4 flex-shrink-0 text-[var(--text-secondary)]" fill="currentColor" viewBox="0 0 20 20">
                    {isWorkspaceExpanded ? (
                      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v1H4a2 2 0 00-2 2v4a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-1V6z" />
                    ) : (
                      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                    )}
                  </svg>
                  <span
                    className="text-[13px] font-bold text-[var(--text-primary)]"
                    style={{ fontFamily: 'Roboto Mono, monospace' }}
                  >
                    Workspace
                  </span>
                  <img
                    src={getIconPath('element_fold_icon.svg')}
                    alt=""
                    className={`w-3 h-3 transition-transform flex-shrink-0 ${isWorkspaceExpanded ? '' : '-rotate-90'}`}
                  />
                </div>

                {/* Workspace children */}
                {isWorkspaceExpanded && (
                  files.length === 0 ? (
                    <div className="pl-6 text-[var(--text-secondary)] text-sm py-2">
                      {t('welcomeModal.noFiles', 'Nenhum arquivo encontrado')}
                    </div>
                  ) : (
                    <FileTree
                      files={files}
                      expandedFolders={expandedFolders}
                      folderContents={folderContents}
                      onFolderToggle={handleFolderToggle}
                      onFileClick={handleFileClick}
                      getIconPath={getIconPath}
                    />
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface FileTreeProps {
  files: FileItem[];
  expandedFolders: Set<string>;
  folderContents: Map<string, FileItem[]>;
  onFolderToggle: (path: string) => void;
  onFileClick: (path: string) => void;
  getIconPath: (name: string) => string;
  level?: number;
  isLast?: boolean;
}

function FileTree({
  files,
  expandedFolders,
  folderContents,
  onFolderToggle,
  onFileClick,
  getIconPath,
  level = 0
}: FileTreeProps) {
  // Sort: folders first, then files, alphabetically
  const sortedFiles = [...files].sort((a, b) => {
    if (a.type === 'folder' && b.type === 'file') return -1;
    if (a.type === 'file' && b.type === 'folder') return 1;
    return a.name.localeCompare(b.name);
  });

  // Root level: wrap in a container with vertical line
  if (level === 0) {
    return (
      <div className="relative pl-[20px] overflow-hidden">
        {/* Vertical tree line for root level */}
        <div className="absolute left-[8px] top-0 bottom-[10px] w-[1px] bg-[var(--border-primary)] tree-line"></div>
        {sortedFiles.map((item, index) => (
          <FileTreeItem
            key={item.path}
            item={item}
            level={level}
            expandedFolders={expandedFolders}
            folderContents={folderContents}
            onFolderToggle={onFolderToggle}
            onFileClick={onFileClick}
            getIconPath={getIconPath}
            isLast={index === sortedFiles.length - 1}
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      {sortedFiles.map((item, index) => (
        <FileTreeItem
          key={item.path}
          item={item}
          level={level}
          expandedFolders={expandedFolders}
          folderContents={folderContents}
          onFolderToggle={onFolderToggle}
          onFileClick={onFileClick}
          getIconPath={getIconPath}
          isLast={index === sortedFiles.length - 1}
        />
      ))}
    </div>
  );
}

interface FileTreeItemProps {
  item: FileItem;
  level: number;
  expandedFolders: Set<string>;
  folderContents: Map<string, FileItem[]>;
  onFolderToggle: (path: string) => void;
  onFileClick: (path: string) => void;
  getIconPath: (name: string) => string;
  isLast?: boolean;
}

function FileTreeItem({
  item,
  level,
  expandedFolders,
  folderContents,
  onFolderToggle,
  onFileClick,
  getIconPath,
  isLast = false
}: FileTreeItemProps) {
  const isExpanded = expandedFolders.has(item.path);
  const isFolder = item.type === 'folder';
  const children = isFolder ? (folderContents.get(item.path) || item.children || []) : [];

  const handleClick = () => {
    if (isFolder) {
      onFolderToggle(item.path);
    } else {
      onFileClick(item.path);
    }
  };

  return (
    <div className={`relative ${isLast ? 'tree-last-item' : ''}`}>
      {/* Horizontal connector from vertical line to item */}
      <div className="absolute left-[-12px] top-[12px] w-3 h-[1px] bg-[var(--border-primary)]"></div>

      <div
        onClick={handleClick}
        className="flex items-center gap-2 py-1 pr-2 hover:bg-[var(--hover-bg)]
                   cursor-pointer rounded transition-colors"
        style={{ paddingLeft: '8px' }}
      >
        {/* Folder/File icon */}
        {isFolder ? (
          <svg className="w-4 h-4 flex-shrink-0 text-[var(--text-secondary)]" fill="currentColor" viewBox="0 0 20 20">
            {isExpanded ? (
              // Open folder icon
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v1H4a2 2 0 00-2 2v4a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-1V6z" />
            ) : (
              // Closed folder icon
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            )}
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5 flex-shrink-0 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}

        {/* Name */}
        <span
          className="text-[13px] text-[var(--text-primary)] truncate flex-1"
          style={{ fontFamily: 'Roboto Mono, monospace' }}
        >
          {item.name}
        </span>

        {/* Fold icon for folders */}
        {isFolder && (
          <img
            src={getIconPath('element_fold_icon.svg')}
            alt=""
            className={`w-3 h-3 transition-transform flex-shrink-0 ${isExpanded ? '' : '-rotate-90'}`}
          />
        )}
      </div>

      {/* Children with vertical tree line */}
      {isFolder && isExpanded && children.length > 0 && (
        <div className="relative pl-[20px] overflow-hidden">
          {/* Vertical tree line */}
          <div className="absolute left-[8px] top-0 bottom-[10px] w-[1px] bg-[var(--border-primary)] tree-line"></div>
          <FileTree
            files={children}
            expandedFolders={expandedFolders}
            folderContents={folderContents}
            onFolderToggle={onFolderToggle}
            onFileClick={onFileClick}
            getIconPath={getIconPath}
            level={level + 1}
          />
        </div>
      )}
    </div>
  );
}
