'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useThemedIcon } from '@/utils/useThemedIcon';
import {
  getTrashItems,
  restoreTrashItem,
  permanentlyDeleteTrashItem,
  emptyTrash,
  listFiles,
  getVolumes,
  type TrashItem,
  type FileItem,
  type VolumeInfo,
} from '@/services/api';

interface TrashModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChanged: () => void; // called after any mutation (restore, delete, empty)
  onImageRestored?: () => void; // called when an image file is restored
}

// Mirrors backend slugify for document-folder detection
function slugify(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

// ─── Folder Selector ─────────────────────────────────────────────────────────

interface FolderSelectorProps {
  selectedFolder: string;
  onSelect: (path: string) => void;
  files: FileItem[];
  volumes: VolumeInfo[];
  folderContents: Map<string, FileItem[]>;
}

function FolderSelector({ selectedFolder, onSelect, files, volumes, folderContents }: FolderSelectorProps) {
  const { getIconPath } = useThemedIcon();
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isMultiVolume = volumes.length > 1;

  const getAllFolders = useCallback((): { path: string; name: string; level: number }[] => {
    const folders: { path: string; name: string; level: number }[] = [];
    const seen = new Set<string>();

    const add = (path: string, name: string, level: number) => {
      if (!seen.has(path)) { seen.add(path); folders.push({ path, name, level }); }
    };

    const extractFolders = (items: FileItem[], level: number = 0) => {
      for (const item of items) {
        if (item.type === 'folder') {
          add(item.path, item.name, level);
          const subContents = folderContents.get(item.path);
          if (subContents) extractFolders(subContents, level + 1);
          else if (item.children) extractFolders(item.children, level + 1);
        } else if (item.type === 'file') {
          // Detect document folder: parent dir name slug matches file basename slug
          const lastSlash = item.path.lastIndexOf('/');
          if (lastSlash > 0) {
            const parentPath = item.path.substring(0, lastSlash);
            const parentName = parentPath.split('/').pop() || '';
            const fileBase = item.name.endsWith('.md') ? item.name.slice(0, -3) : item.name;
            if (slugify(parentName) === slugify(fileBase)) {
              add(parentPath, parentName, level);
            }
          }
        }
      }
    };

    if (isMultiVolume) {
      for (const item of files) {
        if (item.type === 'folder') {
          add(item.name, item.name, 0);
          if (item.children) extractFolders(item.children, 1);
        }
      }
    } else {
      extractFolders(files);
    }

    return folders;
  }, [files, folderContents, isMultiVolume]);

  const allFolders = getAllFolders();

  const displayName = selectedFolder === '/'
    ? 'Workspace'
    : (isMultiVolume && volumes.some(v => v.name === selectedFolder)
        ? selectedFolder
        : selectedFolder.split('/').pop());

  const handleToggle = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
    setIsOpen(!isOpen);
  };

  // Close when clicking outside (check both button and portal dropdown)
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const insideButton = buttonRef.current?.contains(e.target as Node);
      const insideDropdown = dropdownRef.current?.contains(e.target as Node);
      if (!insideButton && !insideDropdown) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const dropdown = isOpen ? (
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className="border border-[var(--border-primary)] rounded bg-[var(--dropdown-bg)] shadow-lg z-[200] max-h-[160px] overflow-y-auto"
    >
      {!isMultiVolume && (
        <button
          onClick={() => { onSelect('/'); setIsOpen(false); }}
          className={`w-full px-3 py-1.5 text-left text-[11px] hover:bg-[var(--hover-bg)] transition-colors
                     ${selectedFolder === '/' ? 'bg-[var(--hover-bg)]' : ''}`}
          style={{ fontFamily: 'Roboto Mono, monospace' }}
        >
          <span className="text-[var(--text-primary)]">Workspace</span>
        </button>
      )}
      {allFolders.map((folder) => (
        <button
          key={folder.path}
          onClick={() => { onSelect(folder.path); setIsOpen(false); }}
          className={`w-full px-3 py-1.5 text-left text-[11px] hover:bg-[var(--hover-bg)] transition-colors
                     ${selectedFolder === folder.path ? 'bg-[var(--hover-bg)]' : ''}`}
          style={{ fontFamily: 'Roboto Mono, monospace', paddingLeft: `${12 + folder.level * 12}px` }}
        >
          <span className="text-[var(--text-primary)] truncate block">{folder.name}</span>
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div className="relative mt-2">
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="w-full h-[28px] px-2 border border-[var(--border-primary)]
                   rounded bg-[var(--bg-secondary)] flex items-center justify-between
                   hover:border-[var(--text-secondary)] transition-colors cursor-pointer"
        style={{ fontFamily: 'Roboto Mono, monospace' }}
      >
        <span className="text-[11px] text-[var(--text-primary)] truncate">
          {displayName}
        </span>
        <img
          src={getIconPath('element_fold_icon.svg')}
          alt=""
          className={`w-3 h-3 transition-transform flex-shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {typeof document !== 'undefined' && dropdown && createPortal(dropdown, document.body)}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysUntil(isoDate: string): number {
  const diff = new Date(isoDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

// Build the destination path for restore: folder + originalName
function buildDestinationPath(folder: string, originalName: string): string {
  if (folder === '/') return `workspace/${originalName}`;
  return `${folder}/${originalName}`;
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico', '.tiff', '.tif', '.avif']);

export default function TrashModal({ isOpen, onClose, onChanged, onImageRestored }: TrashModalProps) {
  const { t } = useTranslation();

  const [shouldRender, setShouldRender] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [exitDirection, setExitDirection] = useState(false);

  const [items, setItems] = useState<TrashItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Folder selector state (loaded once when modal opens)
  const [files, setFiles] = useState<FileItem[]>([]);
  const [volumes, setVolumes] = useState<VolumeInfo[]>([]);
  const [folderContents] = useState<Map<string, FileItem[]>>(new Map());

  // Per-item state: restore expanded / delete confirm / folder selection
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [restoreFolder, setRestoreFolder] = useState<string>('/');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Animation: open
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setExitDirection(false);
      const t = setTimeout(() => setAnimateIn(true), 20);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Animation: close
  useEffect(() => {
    if (!isOpen && shouldRender) {
      setAnimateIn(false);
      setExitDirection(true);
      const t = setTimeout(() => {
        setShouldRender(false);
        setExitDirection(false);
      }, 150);
      return () => clearTimeout(t);
    }
  }, [isOpen, shouldRender]);

  // ESC key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Load trash items + folder tree when modal opens
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [trashItems, volumeList, fileList] = await Promise.all([
        getTrashItems(),
        getVolumes(),
        listFiles('/'),
      ]);
      setItems(trashItems);
      setVolumes(volumeList);
      setFiles(fileList);
      if (volumeList.length > 1) {
        setRestoreFolder(volumeList[0].name);
      } else {
        setRestoreFolder('/');
      }
    } catch (err) {
      console.error('Failed to load trash:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadData();
      setRestoringId(null);
      setConfirmDeleteId(null);
      setConfirmEmpty(false);
    }
  }, [isOpen, loadData]);

  const handleRestore = async (item: TrashItem) => {
    setBusyId(item.id);
    try {
      const dest = buildDestinationPath(restoreFolder, item.originalName);
      await restoreTrashItem(item.id, dest);
      setRestoringId(null);
      onChanged();
      const ext = item.originalName.includes('.')
        ? '.' + item.originalName.split('.').pop()!.toLowerCase()
        : '';
      if (IMAGE_EXTENSIONS.has(ext)) {
        onImageRestored?.();
      }
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to restore');
    } finally {
      setBusyId(null);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    setBusyId(id);
    try {
      await permanentlyDeleteTrashItem(id);
      setConfirmDeleteId(null);
      onChanged();
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setBusyId(null);
    }
  };

  const handleEmptyTrash = async () => {
    setBusyId('empty');
    try {
      await emptyTrash();
      setConfirmEmpty(false);
      setItems([]);
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to empty trash');
    } finally {
      setBusyId(null);
    }
  };

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center z-[100] transition-all duration-150 ease-out
        ${animateIn ? 'bg-black/50' : 'bg-black/0'}`}
      onClick={onClose}
    >
      <div
        className={`bg-[var(--dropdown-bg)] rounded-lg shadow-xl flex flex-col
          w-[520px] max-w-[95vw] max-h-[80vh]
          transition-all duration-150 ease-out
          ${animateIn ? 'opacity-100 translate-y-0' : exitDirection ? 'opacity-0 translate-y-2' : 'opacity-0 -translate-y-2'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[var(--border-primary)] flex-shrink-0">
          <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
          <h2
            className="text-[14px] font-bold text-[var(--text-primary)]"
            style={{ fontFamily: 'Roboto Mono, monospace' }}
          >
            {t('trash.title', 'Lixeira')}
          </h2>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-5 py-3 max-h-[400px]">
          {isLoading ? (
            <p className="text-[12px] text-[var(--text-secondary)] py-4 text-center"
               style={{ fontFamily: 'Roboto Mono, monospace' }}>
              {t('welcomeModal.loading', 'Carregando...')}
            </p>
          ) : items.length === 0 ? (
            <p className="text-[12px] text-[var(--text-secondary)] py-4 text-center"
               style={{ fontFamily: 'Roboto Mono, monospace' }}>
              {t('trash.empty', 'Lixeira vazia')}
            </p>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => {
                const days = daysUntil(item.expiresAt);
                const isRestoring = restoringId === item.id;
                const isConfirmingDelete = confirmDeleteId === item.id;
                const busy = busyId === item.id;

                return (
                  <li
                    key={item.id}
                    className="border border-[var(--border-primary)] rounded-md px-3 py-2.5 bg-[var(--bg-secondary)]"
                  >
                    {/* Row 1: name + actions */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-[12px] font-medium text-[var(--text-primary)] truncate"
                          style={{ fontFamily: 'Roboto Mono, monospace' }}
                        >
                          {item.originalName}
                        </p>
                        <p
                          className="text-[10px] text-[var(--text-muted)] truncate"
                          style={{ fontFamily: 'Roboto Mono, monospace' }}
                          title={item.originalPath}
                        >
                          {item.originalPath}
                        </p>
                      </div>

                      {/* Restore button */}
                      {!isConfirmingDelete && (
                        <button
                          onClick={() => {
                            if (isRestoring) {
                              setRestoringId(null);
                            } else {
                              setRestoringId(item.id);
                              setConfirmDeleteId(null);
                            }
                          }}
                          disabled={busy}
                          className="p-1.5 rounded hover:bg-[var(--hover-bg)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex-shrink-0"
                          title={t('trash.restore', 'Restaurar')}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round"
                              d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                          </svg>
                        </button>
                      )}

                      {/* Delete button */}
                      {!isRestoring && (
                        <button
                          onClick={() => {
                            if (isConfirmingDelete) {
                              setConfirmDeleteId(null);
                            } else {
                              setConfirmDeleteId(item.id);
                              setRestoringId(null);
                            }
                          }}
                          disabled={busy}
                          className="p-1.5 rounded hover:bg-red-500/10 transition-colors text-[var(--text-muted)] hover:text-red-500 flex-shrink-0"
                          title={t('trash.deleteForever', 'Deletar definitivamente')}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round"
                              d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Row 2: dates */}
                    <div className="flex items-center gap-3 mt-1">
                      <span
                        className="text-[10px] text-[var(--text-muted)]"
                        style={{ fontFamily: 'Roboto Mono, monospace' }}
                      >
                        {t('trash.deletedOn', 'Deletado em')} {formatDate(item.deletedAt)}
                      </span>
                      <span
                        className={`text-[10px] ${days <= 3 ? 'text-red-500' : 'text-[var(--text-muted)]'}`}
                        style={{ fontFamily: 'Roboto Mono, monospace' }}
                      >
                        {t('trash.expiresIn', 'Expira em {{days}} dias', { days })}
                      </span>
                    </div>

                    {/* Restore sub-panel */}
                    {isRestoring && (
                      <div className="mt-2 pt-2 border-t border-[var(--border-primary)]">
                        <p className="text-[10px] text-[var(--text-secondary)] mb-1"
                           style={{ fontFamily: 'Roboto Mono, monospace' }}>
                          {t('trash.restoreTo', 'Restaurar para...')}
                        </p>
                        <FolderSelector
                          selectedFolder={restoreFolder}
                          onSelect={setRestoreFolder}
                          files={files}
                          volumes={volumes}
                          folderContents={folderContents}
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => setRestoringId(null)}
                            className="px-3 py-1 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded transition-colors"
                            style={{ fontFamily: 'Roboto Mono, monospace' }}
                          >
                            {t('buttons.cancel', 'Cancelar')}
                          </button>
                          <button
                            onClick={() => handleRestore(item)}
                            disabled={busy}
                            className="px-3 py-1 bg-[var(--button-bg)] text-[var(--text-button)] text-[11px] font-medium rounded hover:bg-[var(--button-hover)] transition-colors disabled:opacity-50"
                            style={{ fontFamily: 'Roboto Mono, monospace' }}
                          >
                            {busy ? '...' : t('trash.restore', 'Restaurar')}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Permanent delete confirm */}
                    {isConfirmingDelete && (
                      <div className="mt-2 pt-2 border-t border-[var(--border-primary)]">
                        <p className="text-[11px] text-[var(--text-primary)] mb-2"
                           style={{ fontFamily: 'Roboto Mono, monospace' }}>
                          {t('trash.deleteForever', 'Deletar definitivamente')}?
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-3 py-1 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded transition-colors"
                            style={{ fontFamily: 'Roboto Mono, monospace' }}
                          >
                            {t('buttons.cancel', 'Cancelar')}
                          </button>
                          <button
                            onClick={() => handlePermanentDelete(item.id)}
                            disabled={busy}
                            className="px-3 py-1 bg-red-600 text-white text-[11px] font-medium rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                            style={{ fontFamily: 'Roboto Mono, monospace' }}
                          >
                            {busy ? '...' : t('trash.deleteForever', 'Deletar definitivamente')}
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 py-3 border-t border-[var(--border-primary)] flex items-center justify-between gap-3">
          {items.length > 0 && !confirmEmpty && (
            <button
              onClick={() => setConfirmEmpty(true)}
              className="text-[11px] text-[var(--text-muted)] hover:text-red-500 transition-colors"
              style={{ fontFamily: 'Roboto Mono, monospace' }}
            >
              {t('trash.emptyTrash', 'Esvaziar lixeira')}
            </button>
          )}

          {confirmEmpty && (
            <div className="flex items-center gap-2 flex-1">
              <span className="text-[11px] text-[var(--text-primary)]"
                    style={{ fontFamily: 'Roboto Mono, monospace' }}>
                {t('trash.confirmEmpty', 'Esvaziar a lixeira permanentemente?')}
              </span>
              <button
                onClick={() => setConfirmEmpty(false)}
                className="px-2 py-0.5 text-[11px] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] rounded transition-colors"
                style={{ fontFamily: 'Roboto Mono, monospace' }}
              >
                {t('buttons.cancel', 'Cancelar')}
              </button>
              <button
                onClick={handleEmptyTrash}
                disabled={busyId === 'empty'}
                className="px-2 py-0.5 bg-red-600 text-white text-[11px] rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                style={{ fontFamily: 'Roboto Mono, monospace' }}
              >
                {busyId === 'empty' ? '...' : t('trash.emptyTrash', 'Esvaziar')}
              </button>
            </div>
          )}

          {items.length === 0 && <div className="flex-1" />}

          <button
            onClick={onClose}
            className="ml-auto px-4 py-1.5 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] rounded transition-colors"
            style={{ fontFamily: 'Roboto Mono, monospace' }}
          >
            {t('buttons.close', 'Fechar')}
          </button>
        </div>
      </div>
    </div>
  );
}
