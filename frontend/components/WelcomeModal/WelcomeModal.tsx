'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useThemedIcon } from '@/utils/useThemedIcon';
import { listFiles, type FileItem } from '@/services/api';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNewDocument: () => void;
  onFileSelect: (filePath: string) => void;
}

export default function WelcomeModal({
  isOpen,
  onClose,
  onNewDocument,
  onFileSelect
}: WelcomeModalProps) {
  const { t } = useTranslation();
  const { getIconPath } = useThemedIcon();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [folderContents, setFolderContents] = useState<Map<string, FileItem[]>>(new Map());

  const loadRecentFiles = useCallback(async () => {
    setIsLoading(true);
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

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
    onNewDocument();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div
        className="bg-[var(--dropdown-bg)] rounded-lg shadow-xl p-8 w-[700px] max-w-[90vw] flex gap-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Side: New Document Button */}
        <div className="flex-shrink-0">
          <button
            onClick={handleNewDocument}
            className="w-[160px] h-[160px] border-2 border-dashed border-[var(--border-primary)]
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
        <div className="flex-1 min-w-0">
          <h2
            className="text-[16px] font-bold text-[var(--text-primary)] mb-4"
            style={{ fontFamily: 'Roboto Mono, monospace' }}
          >
            {t('welcomeModal.recentDocuments', 'Documentos recentes:')}
          </h2>

          <div className="max-h-[280px] overflow-y-auto pr-2">
            {isLoading ? (
              <div className="text-[var(--text-secondary)] text-sm">
                {t('welcomeModal.loading', 'Carregando...')}
              </div>
            ) : files.length === 0 ? (
              <div className="text-[var(--text-secondary)] text-sm">
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

  return (
    <div>
      {sortedFiles.map((item) => (
        <FileTreeItem
          key={item.path}
          item={item}
          level={level}
          expandedFolders={expandedFolders}
          folderContents={folderContents}
          onFolderToggle={onFolderToggle}
          onFileClick={onFileClick}
          getIconPath={getIconPath}
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
}

function FileTreeItem({
  item,
  level,
  expandedFolders,
  folderContents,
  onFolderToggle,
  onFileClick,
  getIconPath
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
    <div>
      <div
        onClick={handleClick}
        className="flex items-center gap-2 py-1.5 px-2 hover:bg-[var(--hover-bg)]
                   cursor-pointer rounded transition-colors"
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {isFolder ? (
          <img
            src={getIconPath('folder_icon.svg')}
            alt="Folder"
            className="w-5 h-4 flex-shrink-0"
          />
        ) : (
          <span
            className="text-[var(--text-muted)] text-[12px] flex-shrink-0 w-5"
            style={{ fontFamily: 'Roboto Mono, monospace' }}
          >
            {level > 0 ? '└─' : ''}
          </span>
        )}

        <span
          className="text-[13px] text-[var(--text-primary)] truncate"
          style={{ fontFamily: 'Roboto Mono, monospace' }}
        >
          {item.name}
        </span>
      </div>

      {isFolder && isExpanded && children.length > 0 && (
        <FileTree
          files={children}
          expandedFolders={expandedFolders}
          folderContents={folderContents}
          onFolderToggle={onFolderToggle}
          onFileClick={onFileClick}
          getIconPath={getIconPath}
          level={level + 1}
        />
      )}
    </div>
  );
}
