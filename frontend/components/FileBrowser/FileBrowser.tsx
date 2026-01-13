'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface FileItem {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileItem[];
}

interface FileBrowserProps {
  onFileSelect?: (filePath: string) => void;
}

// Mock data - will be replaced with real API calls
const mockFiles: FileItem[] = [
  {
    name: 'Documents',
    type: 'folder',
    path: '/documents',
    children: [
      { name: 'README.md', type: 'file', path: '/documents/README.md' },
      { name: 'Notes.md', type: 'file', path: '/documents/Notes.md' },
    ],
  },
  {
    name: 'Projects',
    type: 'folder',
    path: '/projects',
    children: [
      { name: 'Project1.md', type: 'file', path: '/projects/Project1.md' },
      { name: 'Project2.md', type: 'file', path: '/projects/Project2.md' },
    ],
  },
  { name: 'Welcome.md', type: 'file', path: '/Welcome.md' },
  { name: 'TODO.md', type: 'file', path: '/TODO.md' },
];

function FileTreeItem({ item, level, onSelect }: { item: FileItem; level: number; onSelect: (path: string) => void }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClick = () => {
    if (item.type === 'folder') {
      setIsExpanded(!isExpanded);
    } else {
      onSelect(item.path);
    }
  };

  return (
    <div>
      <div
        onClick={handleClick}
        className="flex items-center gap-1 px-2 py-1 hover:bg-[#F0F0F0] cursor-pointer transition-colors"
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {/* Folder expand/collapse icon */}
        {item.type === 'folder' && (
          <svg
            className={`w-3 h-3 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}

        {/* File/Folder icon */}
        {item.type === 'folder' ? (
          <svg className="w-3 h-3 flex-shrink-0 text-[#666666]" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>
        ) : (
          <svg className="w-3 h-3 flex-shrink-0 text-[#666666]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}

        {/* Name */}
        <span className="text-[11px] text-[#000] truncate" style={{ fontFamily: 'Roboto Mono, monospace' }}>
          {item.name}
        </span>
      </div>

      {/* Children (if folder is expanded) */}
      {item.type === 'folder' && isExpanded && item.children && (
        <div>
          {item.children.map((child, index) => (
            <FileTreeItem key={index} item={child} level={level + 1} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileBrowser({ onFileSelect }: FileBrowserProps) {
  const { t } = useTranslation();

  const handleFileSelect = (filePath: string) => {
    console.log('Selected file:', filePath);
    if (onFileSelect) {
      onFileSelect(filePath);
    }
  };

  return (
    <div>
      {/* File Tree */}
      <div className="py-2">
        {mockFiles.map((item, index) => (
          <FileTreeItem key={index} item={item} level={0} onSelect={handleFileSelect} />
        ))}
      </div>
    </div>
  );
}
