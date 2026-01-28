'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useThemedIcon } from '@/utils/useThemedIcon';
import { listFiles, createFolder, type FileItem } from '@/services/api';

interface FileBrowserProps {
  onFileSelect?: (filePath: string) => void;
  onDeleteFile?: (filePath: string) => void;
  collapseAllTrigger?: number; // Increment to trigger collapse all
  refreshTrigger?: number; // Increment to trigger refresh
}

function DeleteConfirmModal({ fileName, onConfirm, onCancel }: { fileName: string; onConfirm: () => void; onCancel: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div
        className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[13px] text-[var(--text-primary)] mb-6 text-center" style={{ fontFamily: 'Roboto Mono, monospace' }}>
          {t('fileBrowser.deleteConfirm', 'Tem certeza que deseja apagar')} <strong>{fileName}</strong>?
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-[12px] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] rounded transition-colors"
            style={{ fontFamily: 'Roboto Mono, monospace' }}
          >
            {t('buttons.cancel', 'Cancelar')}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-[12px] bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            style={{ fontFamily: 'Roboto Mono, monospace' }}
          >
            {t('buttons.delete', 'Apagar')}
          </button>
        </div>
      </div>
    </div>
  );
}

interface FileTreeItemProps {
  item: FileItem;
  level: number;
  onSelect: (path: string) => void;
  onDelete?: (path: string) => void;
  collapseAllTrigger?: number;
  isLast?: boolean;
  creatingFolderIn: string | null;
  onStartCreateFolder: (parentPath: string) => void;
  onConfirmCreateFolder: (parentPath: string, folderName: string) => void;
  onCancelCreateFolder: () => void;
}

function FileTreeItem({ item, level, onSelect, onDelete, collapseAllTrigger, isLast, creatingFolderIn, onStartCreateFolder, onConfirmCreateFolder, onCancelCreateFolder }: FileTreeItemProps) {
  const { t } = useTranslation();
  const { getIconPath } = useThemedIcon();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const canCreateSubfolder = item.type === 'folder' && level < 2;
  const isCreatingHere = creatingFolderIn === item.path;

  // Auto-expand when creating a subfolder inside this folder
  useEffect(() => {
    if (isCreatingHere) {
      setIsExpanded(true);
    }
  }, [isCreatingHere]);

  // Collapse when trigger changes
  useEffect(() => {
    if (collapseAllTrigger !== undefined && collapseAllTrigger > 0) {
      setIsExpanded(false);
    }
  }, [collapseAllTrigger]);

  const handleClick = () => {
    if (item.type === 'folder') {
      setIsExpanded(!isExpanded);
    } else {
      onSelect(item.path);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    setShowDeleteModal(false);
    onDelete?.(item.path);
  };

  const handleAddFolderClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStartCreateFolder(item.path);
  };

  const handleInlineInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const name = e.currentTarget.value.trim();
      if (name) {
        onConfirmCreateFolder(item.path, name);
      } else {
        onCancelCreateFolder();
      }
    } else if (e.key === 'Escape') {
      onCancelCreateFolder();
    }
  };

  const handleInlineInputBlur = () => {
    onCancelCreateFolder();
  };

  return (
    <div className={`relative ${isLast && !isCreatingHere ? 'tree-last-item' : ''}`}>
      {/* Horizontal connector from vertical line to item */}
      {level > 0 && (
        <div className="absolute left-[-12px] top-[14px] w-3 h-[1px] bg-[var(--border-primary)]"></div>
      )}
      <div
        onClick={handleClick}
        className="relative overflow-hidden group flex items-center gap-1 py-1 pr-2 hover:bg-[var(--hover-bg)] cursor-pointer transition-colors"
        style={{ paddingLeft: '8px' }}
      >
        {/* File/Folder icon */}
        {item.type === 'folder' ? (
          <svg className="w-3 h-3 flex-shrink-0 text-[var(--text-secondary)]" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>
        ) : (
          <svg className="w-3 h-3 flex-shrink-0 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}

        {/* Name */}
        <span className="text-[11px] text-[var(--text-primary)] truncate" style={{ fontFamily: 'Roboto Mono, monospace' }}>
          {item.name}
        </span>

        {/* Folder expand/collapse icon (after name) */}
        {item.type === 'folder' && (
          <img
            src={getIconPath('element_fold_icon.svg')}
            alt={isExpanded ? 'Collapse' : 'Expand'}
            className={`w-3 h-3 transition-transform flex-shrink-0 ${isExpanded ? '' : '-rotate-90'}`}
          />
        )}

        {/* Action buttons with fade gradient */}
        {item.type === 'file' && onDelete && (
          <div
            className="absolute right-0 top-0 bottom-0 flex items-center pr-2 pl-6 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'linear-gradient(to right, transparent, var(--bg-primary) 40%)' }}
          >
            <button
              onClick={handleDeleteClick}
              className="p-0.5 hover:bg-[var(--bg-secondary)] rounded transition-colors"
              title="Delete file"
            >
              <svg className="w-3.5 h-3.5 text-[var(--text-secondary)] hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}

        {/* Create subfolder button with fade gradient (folders with level < 2) */}
        {canCreateSubfolder && (
          <div
            className="absolute right-0 top-0 bottom-0 flex items-center pr-2 pl-6 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'linear-gradient(to right, transparent, var(--bg-primary) 40%)' }}
          >
            <button
              onClick={handleAddFolderClick}
              className="p-0.5 hover:bg-[var(--bg-secondary)] rounded transition-colors"
              title={t('dialogs.newFolder', 'New folder')}
            >
              <svg className="w-3.5 h-3.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <DeleteConfirmModal
          fileName={item.name}
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      {/* Children (if folder is expanded) */}
      {item.type === 'folder' && isExpanded && (
        <div className="relative pl-[32px] overflow-hidden">
          {/* Vertical tree line */}
          <div className="absolute left-[20px] top-0 bottom-0 w-[1px] bg-[var(--border-primary)] tree-line"></div>
          {item.children && item.children.map((child, index) => (
            <FileTreeItem
              key={index}
              item={child}
              level={level + 1}
              onSelect={onSelect}
              onDelete={onDelete}
              collapseAllTrigger={collapseAllTrigger}
              isLast={index === item.children!.length - 1 && !isCreatingHere}
              creatingFolderIn={creatingFolderIn}
              onStartCreateFolder={onStartCreateFolder}
              onConfirmCreateFolder={onConfirmCreateFolder}
              onCancelCreateFolder={onCancelCreateFolder}
            />
          ))}

          {/* Inline input for creating a new folder */}
          {isCreatingHere && (
            <div className="relative tree-last-item">
              <div className="absolute left-[-12px] top-[14px] w-3 h-[1px] bg-[var(--border-primary)]"></div>
              <div className="flex items-center gap-1 py-1 pr-2" style={{ paddingLeft: '8px' }}>
                <svg className="w-3 h-3 flex-shrink-0 text-[var(--text-secondary)]" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
                <input
                  autoFocus
                  defaultValue={t('dialogs.newFolder', 'New folder')}
                  className="text-[11px] bg-transparent border-b border-[var(--text-primary)] outline-none text-[var(--text-primary)] w-full"
                  style={{ fontFamily: 'Roboto Mono, monospace' }}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={handleInlineInputKeyDown}
                  onBlur={handleInlineInputBlur}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function FileBrowser({ onFileSelect, onDeleteFile, collapseAllTrigger, refreshTrigger }: FileBrowserProps) {
  const { t } = useTranslation();
  const { getIconPath } = useThemedIcon();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isWorkspaceExpanded, setIsWorkspaceExpanded] = useState(true);
  const [creatingFolderIn, setCreatingFolderIn] = useState<string | null>(null);
  const [internalRefresh, setInternalRefresh] = useState(0);

  // Load files on mount and when refreshTrigger or internalRefresh changes
  useEffect(() => {
    const loadFiles = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fileList = await listFiles();
        setFiles(fileList);
      } catch (err) {
        console.error('Failed to load files:', err);
        setError(err instanceof Error ? err.message : 'Failed to load files');
      } finally {
        setIsLoading(false);
      }
    };

    loadFiles();
  }, [refreshTrigger, internalRefresh]);

  // Collapse workspace when collapseAllTrigger changes
  useEffect(() => {
    if (collapseAllTrigger !== undefined && collapseAllTrigger > 0) {
      setIsWorkspaceExpanded(false);
    }
  }, [collapseAllTrigger]);

  const handleFileSelect = (filePath: string) => {
    console.log('Selected file:', filePath);
    if (onFileSelect) {
      onFileSelect(filePath);
    }
  };

  const handleStartCreateFolder = (parentPath: string) => {
    setCreatingFolderIn(parentPath);
  };

  const handleConfirmCreateFolder = async (parentPath: string, folderName: string) => {
    const fullPath = parentPath ? `${parentPath}/${folderName}` : folderName;
    try {
      await createFolder(fullPath);
      setCreatingFolderIn(null);
      setInternalRefresh((prev) => prev + 1);
    } catch (err) {
      console.error('Failed to create folder:', err);
    }
  };

  const handleCancelCreateFolder = () => {
    setCreatingFolderIn(null);
  };

  const handleWorkspaceAddFolder = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsWorkspaceExpanded(true);
    setCreatingFolderIn('');
  };

  const handleWorkspaceInlineKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const name = e.currentTarget.value.trim();
      if (name) {
        handleConfirmCreateFolder('', name);
      } else {
        handleCancelCreateFolder();
      }
    } else if (e.key === 'Escape') {
      handleCancelCreateFolder();
    }
  };

  if (isLoading) {
    return (
      <div className="py-4 px-4 text-[11px] text-[var(--text-secondary)]" style={{ fontFamily: 'Roboto Mono, monospace' }}>
        {t('sidebar.loading', 'Loading...')}
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-4 px-4 text-[11px] text-red-500" style={{ fontFamily: 'Roboto Mono, monospace' }}>
        {error}
      </div>
    );
  }

  if (files.length === 0 && creatingFolderIn === null) {
    return (
      <div className="py-4 px-4 text-[11px] text-[var(--text-secondary)]" style={{ fontFamily: 'Roboto Mono, monospace' }}>
        {t('sidebar.noFiles', 'No files found')}
      </div>
    );
  }

  return (
    <div>
      {/* Workspace root node */}
      <div className="py-2">
        <div
          onClick={() => setIsWorkspaceExpanded(!isWorkspaceExpanded)}
          className="relative overflow-hidden group flex items-center justify-between pl-[20px] pr-3 py-2 hover:bg-[var(--hover-bg)] cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg className="w-[15px] h-[15px] flex-shrink-0 text-[var(--text-secondary)]" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
            <span className="text-[12px] font-bold text-[var(--text-primary)]" style={{ fontFamily: 'Roboto Mono, monospace' }}>
              Workspace
            </span>
            <img
              src={getIconPath('element_fold_icon.svg')}
              alt={isWorkspaceExpanded ? 'Collapse' : 'Expand'}
              className={`w-3 h-2 transition-transform flex-shrink-0 ${isWorkspaceExpanded ? '' : '-rotate-90'}`}
            />
          </div>

          {/* Create folder button on Workspace header */}
          <div
            className="absolute right-0 top-0 bottom-0 flex items-center pr-3 pl-6 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'linear-gradient(to right, transparent, var(--bg-primary) 40%)' }}
          >
            <button
              onClick={handleWorkspaceAddFolder}
              className="p-0.5 hover:bg-[var(--bg-secondary)] rounded transition-colors"
              title={t('dialogs.newFolder', 'New folder')}
            >
              <svg className="w-3.5 h-3.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Workspace children with tree lines */}
        {isWorkspaceExpanded && (
          <div className="relative pl-[32px] overflow-hidden">
            {/* Vertical tree line */}
            <div className="absolute left-[20px] top-0 bottom-0 w-[1px] bg-[var(--border-primary)] tree-line"></div>
            {files.map((item, index) => (
              <FileTreeItem
                key={index}
                item={item}
                level={1}
                onSelect={handleFileSelect}
                onDelete={onDeleteFile}
                collapseAllTrigger={collapseAllTrigger}
                isLast={index === files.length - 1 && creatingFolderIn !== ''}
                creatingFolderIn={creatingFolderIn}
                onStartCreateFolder={handleStartCreateFolder}
                onConfirmCreateFolder={handleConfirmCreateFolder}
                onCancelCreateFolder={handleCancelCreateFolder}
              />
            ))}

            {/* Inline input for creating a folder at workspace root */}
            {creatingFolderIn === '' && (
              <div className="relative tree-last-item">
                <div className="absolute left-[-12px] top-[14px] w-3 h-[1px] bg-[var(--border-primary)]"></div>
                <div className="flex items-center gap-1 py-1 pr-2" style={{ paddingLeft: '8px' }}>
                  <svg className="w-3 h-3 flex-shrink-0 text-[var(--text-secondary)]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                  </svg>
                  <input
                    autoFocus
                    defaultValue={t('dialogs.newFolder', 'New folder')}
                    className="text-[11px] bg-transparent border-b border-[var(--text-primary)] outline-none text-[var(--text-primary)] w-full"
                    style={{ fontFamily: 'Roboto Mono, monospace' }}
                    onFocus={(e) => e.target.select()}
                    onKeyDown={handleWorkspaceInlineKeyDown}
                    onBlur={handleCancelCreateFolder}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
