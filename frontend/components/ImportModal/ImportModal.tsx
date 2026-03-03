'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useThemedIcon } from '@/utils/useThemedIcon';
import { listFiles, getVolumes, type FileItem, type VolumeInfo } from '@/services/api';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (destinationFolder: string) => void;
}

export default function ImportModal({ isOpen, onClose, onConfirm }: ImportModalProps) {
  const { t } = useTranslation();
  const { getIconPath } = useThemedIcon();

  const [files, setFiles] = useState<FileItem[]>([]);
  const [volumes, setVolumes] = useState<VolumeInfo[]>([]);
  const [folderContents, setFolderContents] = useState<Map<string, FileItem[]>>(new Map());
  const [selectedFolder, setSelectedFolder] = useState<string>('/');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const isMultiVolume = volumes.length > 1;

  // Animation state
  const [shouldRender, setShouldRender] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [exitDirection, setExitDirection] = useState(false);

  // Handle open
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setExitDirection(false);
      const timeout = setTimeout(() => setAnimateIn(true), 20);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  // Handle close
  useEffect(() => {
    if (!isOpen && shouldRender) {
      setAnimateIn(false);
      setExitDirection(true);
      const timeout = setTimeout(() => {
        setShouldRender(false);
        setExitDirection(false);
      }, 150);
      return () => clearTimeout(timeout);
    }
  }, [isOpen, shouldRender]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Load volumes and folders when modal opens
  const loadFolders = useCallback(async () => {
    setFolderContents(new Map());
    try {
      const [volumeList, fileList] = await Promise.all([getVolumes(), listFiles('/')]);
      setVolumes(volumeList);
      setFiles(fileList);
      if (volumeList.length > 1) {
        setSelectedFolder(volumeList[0].name);
      } else {
        setSelectedFolder('/');
      }
    } catch (error) {
      console.error('Failed to load folders:', error);
    }
  }, []);

  useEffect(() => {
    if (isOpen) loadFolders();
  }, [isOpen, loadFolders]);

  // Extract all folders recursively
  const getAllFolders = useCallback((): { path: string; name: string; level: number }[] => {
    const folders: { path: string; name: string; level: number }[] = [];

    const extractFolders = (items: FileItem[], level: number = 0) => {
      for (const item of items) {
        if (item.type === 'folder') {
          folders.push({ path: item.path, name: item.name, level });
          const subContents = folderContents.get(item.path);
          if (subContents) {
            extractFolders(subContents, level + 1);
          } else if (item.children) {
            extractFolders(item.children, level + 1);
          }
        }
      }
    };

    if (isMultiVolume) {
      for (const item of files) {
        if (item.type === 'folder') {
          folders.push({ path: item.name, name: item.name, level: 0 });
          if (item.children) {
            extractFolders(item.children, 1);
          }
        }
      }
    } else {
      extractFolders(files);
    }

    return folders;
  }, [files, folderContents, isMultiVolume]);

  const allFolders = getAllFolders();

  const handleConfirm = () => {
    onConfirm(selectedFolder);
    onClose();
  };

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center z-[100] transition-all duration-150 ease-out
        ${animateIn ? 'bg-black/50' : 'bg-black/0'}`}
      onClick={onClose}
    >
      <div
        className={`bg-[var(--dropdown-bg)] rounded-lg shadow-xl p-6 w-[360px] max-w-[90vw]
          transition-all duration-150 ease-out
          ${animateIn ? 'opacity-100 translate-y-0' : exitDirection ? 'opacity-0 translate-y-2' : 'opacity-0 -translate-y-2'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <h2
          className="text-[16px] font-bold text-[var(--text-primary)] mb-4"
          style={{ fontFamily: 'Roboto Mono, monospace' }}
        >
          {t('importModal.title', 'Importar arquivo')}
        </h2>

        {/* Folder selector */}
        <div className="mb-5">
          <label
            className="text-[11px] text-[var(--text-secondary)] mb-1 block"
            style={{ fontFamily: 'Roboto Mono, monospace' }}
          >
            {t('importModal.destination', 'Pasta de destino:')}
          </label>
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full h-[32px] px-3 border border-[var(--border-primary)]
                         rounded bg-[var(--bg-secondary)] flex items-center justify-between
                         hover:border-[var(--text-secondary)] transition-colors cursor-pointer"
              style={{ fontFamily: 'Roboto Mono, monospace' }}
            >
              <span className="text-[12px] text-[var(--text-primary)] truncate">
                {selectedFolder === '/' ? 'Workspace' : (
                  isMultiVolume && volumes.some(v => v.name === selectedFolder)
                    ? selectedFolder
                    : selectedFolder.split('/').pop()
                )}
              </span>
              <img
                src={getIconPath('element_fold_icon.svg')}
                alt=""
                className={`w-3 h-3 transition-transform flex-shrink-0 ml-2 ${isDropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div
                className="absolute top-full left-0 w-full mt-1 border border-[var(--border-primary)]
                           rounded bg-[var(--dropdown-bg)] shadow-lg z-10 max-h-[200px] overflow-y-auto"
              >
                {/* Root option - only in single volume mode */}
                {!isMultiVolume && (
                  <button
                    onClick={() => { setSelectedFolder('/'); setIsDropdownOpen(false); }}
                    className={`w-full px-3 py-2 text-left text-[12px] hover:bg-[var(--hover-bg)] transition-colors
                               ${selectedFolder === '/' ? 'bg-[var(--hover-bg)]' : ''}`}
                    style={{ fontFamily: 'Roboto Mono, monospace' }}
                  >
                    <span className="text-[var(--text-primary)]">Workspace</span>
                  </button>
                )}

                {/* Folder options */}
                {allFolders.map((folder) => (
                  <button
                    key={folder.path}
                    onClick={() => { setSelectedFolder(folder.path); setIsDropdownOpen(false); }}
                    className={`w-full px-3 py-2 text-left text-[12px] hover:bg-[var(--hover-bg)] transition-colors
                               ${selectedFolder === folder.path ? 'bg-[var(--hover-bg)]' : ''}`}
                    style={{
                      fontFamily: 'Roboto Mono, monospace',
                      paddingLeft: `${12 + folder.level * 12}px`
                    }}
                  >
                    <span className="text-[var(--text-primary)] truncate block">{folder.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]
                       hover:bg-[var(--bg-secondary)] rounded transition-colors"
            style={{ fontFamily: 'Roboto Mono, monospace' }}
          >
            {t('buttons.cancel', 'Cancelar')}
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-[var(--button-bg)] text-[var(--text-button)] text-[12px] font-medium rounded
                       hover:bg-[var(--button-hover)] transition-colors"
            style={{ fontFamily: 'Roboto Mono, monospace' }}
          >
            {t('importModal.chooseFile', 'Escolher arquivo')}
          </button>
        </div>
      </div>
    </div>
  );
}
