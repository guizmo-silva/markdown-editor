'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useThemedIcon } from '@/utils/useThemedIcon';
import { listFiles, createFolder, getVolumes, type FileItem, type VolumeInfo } from '@/services/api';

interface FileBrowserProps {
  onFileSelect?: (filePath: string) => void;
  onDeleteFile?: (filePath: string) => void;
  onRenameFolder?: (oldPath: string, newPath: string) => void;
  collapseAllTrigger?: number; // Increment to trigger collapse all
  refreshTrigger?: number; // Increment to trigger refresh
}

interface DragState {
  item: FileItem;
  initialX: number;
  initialY: number;
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
  onRenameItem?: (oldPath: string, newPath: string) => void;
  isLast?: boolean;
  creatingFolderIn: string | null;
  onStartCreateFolder: (parentPath: string) => void;
  onConfirmCreateFolder: (parentPath: string, folderName: string) => void;
  onCancelCreateFolder: () => void;
  editingItemPath: string | null;
  onStartEditItem: (path: string, currentName: string) => void;
  onConfirmEditItem: (oldPath: string, newName: string, isFolder: boolean) => void;
  onCancelEditItem: () => void;
  editItemValue: string;
  onEditItemValueChange: (value: string) => void;
  sidebarWidth?: number;
  expandedFolders: Set<string>;
  onToggleExpand: (path: string) => void;
  draggedItem?: FileItem | null;
  dragOverTarget?: string | null;
  onDragStart?: (item: FileItem, e: React.MouseEvent) => void;
  onDragOverFolder?: (folderPath: string | null) => void;
  getParentFolder?: (path: string) => string;
}

function FileTreeItem({ item, level, onSelect, onDelete, onRenameItem, isLast, creatingFolderIn, onStartCreateFolder, onConfirmCreateFolder, onCancelCreateFolder, editingItemPath, onStartEditItem, onConfirmEditItem, onCancelEditItem, editItemValue, onEditItemValueChange, sidebarWidth, expandedFolders, onToggleExpand, draggedItem, dragOverTarget, onDragStart, onDragOverFolder, getParentFolder }: FileTreeItemProps) {
  const { t } = useTranslation();
  const { getIconPath } = useThemedIcon();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isTextOverflowing, setIsTextOverflowing] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const isExpanded = expandedFolders.has(item.path);
  const canCreateSubfolder = item.type === 'folder' && level < 2;
  const isCreatingHere = creatingFolderIn === item.path;
  const isEditingThis = editingItemPath === item.path;
  const isEmptyFolder = item.type === 'folder' && (!item.children || item.children.length === 0);

  // Drag state calculations
  const isDraggingActive = draggedItem !== null && draggedItem !== undefined;
  const isDragSource = draggedItem?.path === item.path;
  // A folder is a drag target if it's the current dragOverTarget and it's a valid drop
  const isDragTarget = isDraggingActive && item.type === 'folder' && dragOverTarget === item.path &&
    getParentFolder && getParentFolder(draggedItem!.path) !== item.path;

  // Auto-expand when creating a subfolder inside this folder
  useEffect(() => {
    if (isCreatingHere && !isExpanded) {
      onToggleExpand(item.path);
    }
  }, [isCreatingHere, isExpanded, item.path, onToggleExpand]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingThis && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditingThis]);

  // Detect text overflow
  useEffect(() => {
    if (textRef.current) {
      setIsTextOverflowing(textRef.current.scrollWidth > textRef.current.clientWidth);
    }
  }, [item.name, sidebarWidth]);

  // Build tooltip with modified date for files
  const tooltip = (() => {
    const baseTooltip = t('tooltips.doubleClickRename', 'Duplo clique para renomear');
    if (item.type === 'file' && item.modifiedAt) {
      const date = new Date(item.modifiedAt);
      const formatted = date.toLocaleString();
      return `${item.name}\n${t('fileBrowser.modified', 'Modificado')}: ${formatted}\n\n${baseTooltip}`;
    }
    return baseTooltip;
  })();

  const handleClick = () => {
    if (isEditingThis) return;
    if (item.type === 'folder') {
      onToggleExpand(item.path);
    } else {
      onSelect(item.path);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (item.type === 'file' && onDragStart && !isEditingThis) {
      onDragStart(item, e);
    }
  };

  const handleMouseEnter = () => {
    if (onDragOverFolder && isDraggingActive) {
      // For folders, the target is the folder itself
      // For files, the target is the parent folder (or root if at level 1)
      if (item.type === 'folder') {
        onDragOverFolder(item.path);
      } else if (getParentFolder) {
        const parentPath = getParentFolder(item.path);
        onDragOverFolder(parentPath || '__workspace__');
      }
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // For files, remove .md extension for editing
    const editName = item.type === 'file' ? item.name.replace(/\.md$/, '') : item.name;
    onStartEditItem(item.path, editName);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newName = editItemValue.trim();
      const currentEditName = item.type === 'file' ? item.name.replace(/\.md$/, '') : item.name;
      if (newName && newName !== currentEditName) {
        onConfirmEditItem(item.path, newName, item.type === 'folder');
      } else {
        onCancelEditItem();
      }
    } else if (e.key === 'Escape') {
      onCancelEditItem();
    }
  };

  const handleEditBlur = () => {
    const newName = editItemValue.trim();
    const currentEditName = item.type === 'file' ? item.name.replace(/\.md$/, '') : item.name;
    if (newName && newName !== currentEditName) {
      onConfirmEditItem(item.path, newName, item.type === 'folder');
    } else {
      onCancelEditItem();
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
        onDoubleClick={handleDoubleClick}
        onMouseDown={handleMouseDown}
        onMouseEnter={handleMouseEnter}
        className={`relative overflow-hidden group flex items-center gap-1 py-1 pr-2 cursor-pointer transition-colors ${
          isDragSource ? 'opacity-50' : 'hover:bg-[var(--hover-bg)]'
        } ${isDragTarget ? 'bg-[var(--accent-color)]/20 ring-1 ring-[var(--accent-color)]' : ''}`}
        style={{ paddingLeft: '8px' }}
      >
        {/* File/Folder icon */}
        {item.type === 'folder' ? (
          <svg className="w-[14px] h-[14px] flex-shrink-0 text-[var(--text-secondary)]" fill="currentColor" viewBox="0 0 20 20">
            {isExpanded ? (
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v1H4a2 2 0 00-2 2v4a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-1V6z" />
            ) : (
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            )}
          </svg>
        ) : (
          <svg className="w-[14px] h-[14px] flex-shrink-0 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}

        {/* Name - with editing support for files and folders */}
        {isEditingThis ? (
          <input
            ref={editInputRef}
            type="text"
            value={editItemValue}
            onChange={(e) => onEditItemValueChange(e.target.value)}
            onKeyDown={handleEditKeyDown}
            onBlur={handleEditBlur}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            className="text-[11px] bg-transparent border-b border-[var(--text-primary)] outline-none text-[var(--text-primary)] flex-1 min-w-0"
            style={{ fontFamily: 'Roboto Mono, monospace' }}
          />
        ) : (
          <span
            ref={textRef}
            className="text-[11px] text-[var(--text-primary)] whitespace-nowrap overflow-hidden flex-1 min-w-0"
            style={{
              fontFamily: 'Roboto Mono, monospace',
              ...(isTextOverflowing ? {
                maskImage: 'linear-gradient(to right, black calc(100% - 16px), transparent)',
                WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 16px), transparent)',
              } : {}),
            }}
            title={tooltip}
          >
            {item.name}
          </span>
        )}

        {/* Folder expand/collapse icon (after name) */}
        {item.type === 'folder' && !isEditingThis && (
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
              title={t('buttons.delete', 'Delete')}
            >
              <svg className="w-3.5 h-3.5 text-[var(--text-secondary)] hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}

        {/* Folder action buttons */}
        {item.type === 'folder' && (
          <div
            className="absolute right-0 top-0 bottom-0 flex items-center gap-0.5 pr-2 pl-6 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'linear-gradient(to right, transparent, var(--bg-primary) 40%)' }}
          >
            {/* Create subfolder button (folders with level < 2) */}
            {canCreateSubfolder && (
              <button
                onClick={handleAddFolderClick}
                className="p-0.5 hover:bg-[var(--bg-secondary)] rounded transition-colors"
                title={t('dialogs.newFolder', 'New folder')}
              >
                <svg className="w-3.5 h-3.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
            {/* Delete empty folder button */}
            {isEmptyFolder && onDelete && (
              <button
                onClick={handleDeleteClick}
                className="p-0.5 hover:bg-[var(--bg-secondary)] rounded transition-colors"
                title={t('buttons.delete', 'Delete')}
              >
                <svg className="w-3.5 h-3.5 text-[var(--text-secondary)] hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
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

      {/* Children (if folder) with animation */}
      {item.type === 'folder' && (
        <div
          className="grid transition-[grid-template-rows] duration-200 ease-out"
          style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}
        >
          <div className="overflow-hidden">
            <div className="relative pl-[20px]">
              {/* Vertical tree line */}
              <div className="absolute left-[8px] top-0 bottom-0 w-[1px] bg-[var(--border-primary)] tree-line"></div>
              {item.children && item.children.map((child, index) => (
                <FileTreeItem
                  key={child.path}
                  item={child}
                  level={level + 1}
                  onSelect={onSelect}
                  onDelete={onDelete}
                  onRenameItem={onRenameItem}
                  isLast={index === item.children!.length - 1 && !isCreatingHere}
                  creatingFolderIn={creatingFolderIn}
                  onStartCreateFolder={onStartCreateFolder}
                  onConfirmCreateFolder={onConfirmCreateFolder}
                  onCancelCreateFolder={onCancelCreateFolder}
                  editingItemPath={editingItemPath}
                  onStartEditItem={onStartEditItem}
                  onConfirmEditItem={onConfirmEditItem}
                  onCancelEditItem={onCancelEditItem}
                  editItemValue={editItemValue}
                  onEditItemValueChange={onEditItemValueChange}
                  sidebarWidth={sidebarWidth}
                  expandedFolders={expandedFolders}
                  onToggleExpand={onToggleExpand}
                  draggedItem={draggedItem}
                  dragOverTarget={dragOverTarget}
                  onDragStart={onDragStart}
                  onDragOverFolder={onDragOverFolder}
                  getParentFolder={getParentFolder}
                />
              ))}

              {/* Inline input for creating a new folder */}
              {isCreatingHere && (
                <div className="relative tree-last-item">
                  <div className="absolute left-[-12px] top-[14px] w-3 h-[1px] bg-[var(--border-primary)]"></div>
                  <div className="flex items-center gap-1 py-1 pr-2" style={{ paddingLeft: '8px' }}>
                    <svg className="w-[14px] h-[14px] flex-shrink-0 text-[var(--text-secondary)]" fill="currentColor" viewBox="0 0 20 20">
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
          </div>
        </div>
      )}
    </div>
  );
}

export default function FileBrowser({ onFileSelect, onDeleteFile, onRenameFolder, collapseAllTrigger, refreshTrigger }: FileBrowserProps) {
  const { t } = useTranslation();
  const { getIconPath } = useThemedIcon();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [volumes, setVolumes] = useState<VolumeInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isWorkspaceExpanded, setIsWorkspaceExpanded] = useState(true);
  const [expandedVolumes, setExpandedVolumes] = useState<Set<string>>(new Set());
  const [creatingFolderIn, setCreatingFolderIn] = useState<string | null>(null);
  const [internalRefresh, setInternalRefresh] = useState(0);
  const [editingItemPath, setEditingItemPath] = useState<string | null>(null);
  const [editItemValue, setEditItemValue] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const isMultiVolume = volumes.length > 1;

  // Drag and drop states
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState<FileItem | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [ghostPosition, setGhostPosition] = useState<{ x: number; y: number } | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get parent folder path from a file path
  const getParentFolder = useCallback((filePath: string): string => {
    const lastSlash = filePath.lastIndexOf('/');
    return lastSlash > 0 ? filePath.substring(0, lastSlash) : '';
  }, []);

  // Get volume name from a path
  const getVolumeName = useCallback((filePath: string): string => {
    const slashIndex = filePath.indexOf('/');
    return slashIndex === -1 ? filePath : filePath.substring(0, slashIndex);
  }, []);

  // Check if dropping is valid (not same folder, same volume)
  const isValidDrop = useCallback((draggedPath: string, targetFolder: string): boolean => {
    const sourceFolder = getParentFolder(draggedPath);
    if (sourceFolder === targetFolder) return false;
    // Block cross-volume drops in multi-volume mode
    if (isMultiVolume) {
      const sourceVolume = getVolumeName(draggedPath);
      const targetVolume = getVolumeName(targetFolder);
      if (sourceVolume !== targetVolume) return false;
    }
    return true;
  }, [getParentFolder, getVolumeName, isMultiVolume]);

  // Handle drag start
  const handleDragStart = useCallback((item: FileItem, e: React.MouseEvent) => {
    e.preventDefault();
    dragStateRef.current = {
      item,
      initialX: e.clientX,
      initialY: e.clientY
    };
    setDraggedItem(item);
    setGhostPosition({ x: e.clientX, y: e.clientY });
    setIsDragging(true);
  }, []);

  // Handle drag move
  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragStateRef.current) return;
    setGhostPosition({ x: e.clientX, y: e.clientY });
  }, [isDragging]);

  // Handle drag end
  const handleDragEnd = useCallback(async () => {
    if (!isDragging || !draggedItem) {
      setIsDragging(false);
      setDraggedItem(null);
      setDragOverTarget(null);
      setGhostPosition(null);
      dragStateRef.current = null;
      return;
    }

    // Determine target folder
    // In single-volume mode, '__workspace__' maps to the volume name
    // In multi-volume mode, '__volumeName__' maps to the volume name
    let targetFolder: string | null = dragOverTarget;
    if (dragOverTarget?.startsWith('__') && dragOverTarget?.endsWith('__')) {
      const rootKey = dragOverTarget.slice(2, -2);
      if (rootKey === 'workspace' && !isMultiVolume && volumes.length === 1) {
        targetFolder = volumes[0].name;
      } else {
        targetFolder = rootKey;
      }
    }

    if (targetFolder !== null && isValidDrop(draggedItem.path, targetFolder)) {
      const fileName = draggedItem.name;
      const newPath = targetFolder ? `${targetFolder}/${fileName}` : fileName;

      if (onRenameFolder && newPath !== draggedItem.path) {
        try {
          await onRenameFolder(draggedItem.path, newPath);
          setInternalRefresh(prev => prev + 1);
        } catch (err) {
          console.error('Failed to move file:', err);
        }
      }
    }

    setIsDragging(false);
    setDraggedItem(null);
    setDragOverTarget(null);
    setGhostPosition(null);
    dragStateRef.current = null;
  }, [isDragging, draggedItem, dragOverTarget, isValidDrop, onRenameFolder]);

  // Handle drag over folder
  const handleDragOverFolder = useCallback((folderPath: string | null) => {
    if (isDragging) {
      setDragOverTarget(folderPath);
    }
  }, [isDragging]);

  // Global mouse event listeners for drag
  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => handleDragMove(e);
      const handleMouseUp = () => handleDragEnd();

      // Apply grabbing cursor globally during drag
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Load volumes and files on mount and when refreshTrigger or internalRefresh changes
  useEffect(() => {
    const loadFiles = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [volumeList, fileList] = await Promise.all([
          getVolumes(),
          listFiles()
        ]);
        setVolumes(volumeList);
        setFiles(fileList);
        // Auto-expand all volumes initially
        if (volumeList.length > 1) {
          setExpandedVolumes(new Set(volumeList.map(v => v.name)));
        }
      } catch (err) {
        console.error('Failed to load files:', err);
        setError(err instanceof Error ? err.message : 'Failed to load files');
      } finally {
        setIsLoading(false);
      }
    };

    loadFiles();
  }, [refreshTrigger, internalRefresh]);

  // Collapse workspace and all folders when collapseAllTrigger changes
  useEffect(() => {
    if (collapseAllTrigger !== undefined && collapseAllTrigger > 0) {
      setIsWorkspaceExpanded(false);
      setExpandedVolumes(new Set());
      setExpandedFolders(new Set());
    }
  }, [collapseAllTrigger]);

  // Toggle folder expansion
  const handleToggleExpand = (path: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

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
      // Keep parent folder expanded after creation
      if (parentPath) {
        setExpandedFolders(prev => new Set(prev).add(parentPath));
      }
      setCreatingFolderIn(null);
      setInternalRefresh((prev) => prev + 1);
    } catch (err) {
      console.error('Failed to create folder:', err);
    }
  };

  const handleCancelCreateFolder = () => {
    setCreatingFolderIn(null);
  };

  const handleStartEditItem = (path: string, currentName: string) => {
    setEditingItemPath(path);
    setEditItemValue(currentName);
  };

  const handleConfirmEditItem = async (oldPath: string, newName: string, isFolder: boolean) => {
    // Calculate new path
    const lastSlash = oldPath.lastIndexOf('/');
    const parentPath = lastSlash > 0 ? oldPath.substring(0, lastSlash) : '';

    // Clean the name
    let cleanName = newName.replace(/[<>:"/\\|?*]/g, '');
    if (!cleanName) {
      setEditingItemPath(null);
      setEditItemValue('');
      return;
    }

    // For files, ensure .md extension
    if (!isFolder && !cleanName.endsWith('.md')) {
      cleanName += '.md';
    }

    const finalNewPath = parentPath ? `${parentPath}/${cleanName}` : cleanName;

    try {
      if (onRenameFolder) {
        await onRenameFolder(oldPath, finalNewPath);
      }
      // Update expanded folders if it's a folder: replace old path with new path
      if (isFolder) {
        setExpandedFolders(prev => {
          const newSet = new Set(prev);
          if (newSet.has(oldPath)) {
            newSet.delete(oldPath);
            newSet.add(finalNewPath);
          }
          // Also update any child paths that were expanded
          prev.forEach(path => {
            if (path.startsWith(oldPath + '/')) {
              newSet.delete(path);
              newSet.add(path.replace(oldPath, finalNewPath));
            }
          });
          return newSet;
        });
      }
      setInternalRefresh((prev) => prev + 1);
    } catch (err) {
      console.error('Failed to rename item:', err);
    } finally {
      setEditingItemPath(null);
      setEditItemValue('');
    }
  };

  const handleCancelEditItem = () => {
    setEditingItemPath(null);
    setEditItemValue('');
  };

  const handleWorkspaceAddFolder = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsWorkspaceExpanded(true);
    // In single volume mode, create at volume root; in multi, create at workspace root
    if (!isMultiVolume && volumes.length === 1) {
      setCreatingFolderIn(volumes[0].name);
      setExpandedVolumes(prev => new Set(prev).add(volumes[0].name));
    } else {
      setCreatingFolderIn('');
    }
  };

  const handleVolumeAddFolder = (e: React.MouseEvent, volumeName: string) => {
    e.stopPropagation();
    setExpandedVolumes(prev => new Set(prev).add(volumeName));
    setCreatingFolderIn(volumeName);
  };

  const handleWorkspaceInlineKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, volumePrefix?: string) => {
    if (e.key === 'Enter') {
      const name = e.currentTarget.value.trim();
      if (name) {
        const parentPath = volumePrefix ?? '';
        handleConfirmCreateFolder(parentPath, name);
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

  // Handler for workspace/volume drop zone (root level)
  const handleRootMouseEnter = (rootKey: string) => {
    if (isDragging) {
      setDragOverTarget(rootKey);
    }
  };

  const handleRootMouseLeave = (rootKey: string) => {
    if (isDragging && dragOverTarget === rootKey) {
      setDragOverTarget(null);
    }
  };

  // Toggle volume expansion (for multi-volume mode)
  const toggleVolumeExpanded = (volumeName: string) => {
    setExpandedVolumes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(volumeName)) {
        newSet.delete(volumeName);
      } else {
        newSet.add(volumeName);
      }
      return newSet;
    });
  };

  // Helper: render the file tree items for a given list of files
  const renderFileItems = (fileList: FileItem[], rootKey: string) => (
    <>
      {fileList.map((item, index) => (
        <FileTreeItem
          key={item.path}
          item={item}
          level={1}
          onSelect={handleFileSelect}
          onDelete={onDeleteFile}
          onRenameItem={onRenameFolder}
          isLast={index === fileList.length - 1 && creatingFolderIn !== rootKey}
          creatingFolderIn={creatingFolderIn}
          onStartCreateFolder={handleStartCreateFolder}
          onConfirmCreateFolder={handleConfirmCreateFolder}
          onCancelCreateFolder={handleCancelCreateFolder}
          editingItemPath={editingItemPath}
          onStartEditItem={handleStartEditItem}
          onConfirmEditItem={handleConfirmEditItem}
          onCancelEditItem={handleCancelEditItem}
          editItemValue={editItemValue}
          onEditItemValueChange={setEditItemValue}
          expandedFolders={expandedFolders}
          onToggleExpand={handleToggleExpand}
          draggedItem={draggedItem}
          dragOverTarget={dragOverTarget}
          onDragStart={handleDragStart}
          onDragOverFolder={handleDragOverFolder}
          getParentFolder={getParentFolder}
        />
      ))}

      {/* Inline input for creating a folder at this root */}
      {creatingFolderIn === rootKey && (
        <div className="relative tree-last-item">
          <div className="absolute left-[-12px] top-[14px] w-3 h-[1px] bg-[var(--border-primary)]"></div>
          <div className="flex items-center gap-1 py-1 pr-2" style={{ paddingLeft: '8px' }}>
            <svg className="w-[14px] h-[14px] flex-shrink-0 text-[var(--text-secondary)]" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
            <input
              autoFocus
              defaultValue={t('dialogs.newFolder', 'New folder')}
              className="text-[11px] bg-transparent border-b border-[var(--text-primary)] outline-none text-[var(--text-primary)] w-full"
              style={{ fontFamily: 'Roboto Mono, monospace' }}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => handleWorkspaceInlineKeyDown(e, rootKey)}
              onBlur={handleCancelCreateFolder}
            />
          </div>
        </div>
      )}
    </>
  );

  // Helper: render a single root node (Workspace or Volume)
  const renderRootNode = (label: string, rootKey: string, isExpanded: boolean, onToggle: () => void, fileList: FileItem[], onAddFolder: (e: React.MouseEvent) => void) => {
    const isDragTarget = isDragging && draggedItem && dragOverTarget === `__${rootKey}__` && isValidDrop(draggedItem.path, rootKey === 'workspace' && !isMultiVolume ? '' : rootKey);

    return (
      <div key={rootKey}>
        <div
          onClick={onToggle}
          onMouseEnter={() => handleRootMouseEnter(`__${rootKey}__`)}
          onMouseLeave={() => handleRootMouseLeave(`__${rootKey}__`)}
          className={`relative overflow-hidden group flex items-center justify-between pl-[20px] pr-3 py-2 cursor-pointer transition-colors ${
            isDragTarget ? 'bg-[var(--accent-color)]/20 ring-1 ring-[var(--accent-color)]' : 'hover:bg-[var(--hover-bg)]'
          }`}
        >
          <div className="flex items-center gap-2">
            <svg className="w-[17px] h-[17px] flex-shrink-0 text-[var(--text-secondary)]" fill="currentColor" viewBox="0 0 20 20">
              {isExpanded ? (
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v1H4a2 2 0 00-2 2v4a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-1V6z" />
              ) : (
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              )}
            </svg>
            <span className="text-[12px] font-bold text-[var(--text-primary)]" style={{ fontFamily: 'Roboto Mono, monospace' }}>
              {label}
            </span>
            <img
              src={getIconPath('element_fold_icon.svg')}
              alt={isExpanded ? 'Collapse' : 'Expand'}
              className={`w-3 h-2 transition-transform flex-shrink-0 ${isExpanded ? '' : '-rotate-90'}`}
            />
          </div>

          {/* Create folder button on header */}
          <div
            className="absolute right-0 top-0 bottom-0 flex items-center pr-3 pl-6 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'linear-gradient(to right, transparent, var(--bg-primary) 40%)' }}
          >
            <button
              onClick={onAddFolder}
              className="p-0.5 hover:bg-[var(--bg-secondary)] rounded transition-colors"
              title={t('dialogs.newFolder', 'New folder')}
            >
              <svg className="w-3.5 h-3.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Children with tree lines and animation */}
        <div
          className="grid transition-[grid-template-rows] duration-200 ease-out"
          style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}
        >
          <div className="overflow-hidden">
            <div className="relative pl-[32px]">
              {/* Vertical tree line */}
              <div className="absolute left-[20px] top-0 bottom-0 w-[1px] bg-[var(--border-primary)] tree-line"></div>
              {renderFileItems(fileList, rootKey === 'workspace' && !isMultiVolume ? volumes[0]?.name ?? '' : rootKey)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div ref={containerRef}>
      {/* Ghost element for drag preview */}
      {isDragging && ghostPosition && draggedItem && (
        <div
          className="fixed pointer-events-none z-50 px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded shadow-lg flex items-center gap-1"
          style={{
            left: ghostPosition.x + 10,
            top: ghostPosition.y + 10,
            fontFamily: 'Roboto Mono, monospace',
          }}
        >
          <svg className="w-[14px] h-[14px] flex-shrink-0 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-[11px] text-[var(--text-primary)]">{draggedItem.name}</span>
        </div>
      )}

      <div className="py-2">
        {!isMultiVolume ? (
          /* Single volume mode: render as "Workspace" (identical to current behavior) */
          renderRootNode(
            'Workspace',
            'workspace',
            isWorkspaceExpanded,
            () => setIsWorkspaceExpanded(!isWorkspaceExpanded),
            files,
            handleWorkspaceAddFolder
          )
        ) : (
          /* Multi-volume mode: render one root node per volume */
          files.map((volumeItem) => {
            const isExpanded = expandedVolumes.has(volumeItem.name);
            return renderRootNode(
              volumeItem.name,
              volumeItem.name,
              isExpanded,
              () => toggleVolumeExpanded(volumeItem.name),
              volumeItem.children ?? [],
              (e) => handleVolumeAddFolder(e, volumeItem.name)
            );
          })
        )}
      </div>
    </div>
  );
}
