import fs from 'fs/promises';
import path from 'path';
import trash from 'trash';
import { validatePath, validateFileName } from '../utils/security.js';
import { getVolumes, resolveVolumePath } from './volume.service.js';

export interface FileInfo {
  name: string;
  path: string;
  type: 'file' | 'folder';
  extension?: string;
  size?: number;
  modifiedAt?: string;
  children?: FileInfo[];
}

const listVolumeDirectory = async (
  relativePath: string,
  volumeName: string,
  volumeMountPath: string,
  maxDepth: number
): Promise<FileInfo[]> => {
  const safePath = await validatePath(relativePath, volumeMountPath);
  const allEntries = await fs.readdir(safePath, { withFileTypes: true });
  const entries = allEntries.filter(entry => !entry.name.startsWith('.'));

  const fileInfos = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(safePath, entry.name);
      const stats = await fs.stat(fullPath);
      const relativeToVolume = path.relative(volumeMountPath, fullPath);
      // Prefix with volume name
      const entryPath = `${volumeName}/${relativeToVolume}`;

      const info: FileInfo = {
        name: entry.name,
        path: entryPath,
        type: entry.isDirectory() ? 'folder' : 'file',
        extension: entry.isFile() ? path.extname(entry.name) : undefined,
        size: stats.size,
        modifiedAt: stats.mtime.toISOString(),
      };

      // Recursively load children for folders if within depth limit
      if (entry.isDirectory() && maxDepth > 1) {
        info.children = await listVolumeDirectory(relativeToVolume, volumeName, volumeMountPath, maxDepth - 1);
      }

      return info;
    })
  );

  // Filter to show only .md files and folders
  const filtered = fileInfos.filter(
    (info) => info.type === 'folder' || info.extension === '.md'
  );

  // Sort: folders first (alphabetically), then files (alphabetically)
  return filtered.sort((a, b) => {
    if (a.type === 'folder' && b.type !== 'folder') return -1;
    if (a.type !== 'folder' && b.type === 'folder') return 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
};

export const listDirectory = async (relativePath: string, maxDepth: number = 3): Promise<FileInfo[]> => {
  const cleanPath = relativePath.trim();

  // Root listing: list all volumes as virtual folders with their children
  if (cleanPath === '/' || cleanPath === '' || cleanPath === '.') {
    const volumes = getVolumes();

    const volumeItems = await Promise.all(
      volumes.map(async (volume) => {
        const info: FileInfo = {
          name: volume.name,
          path: volume.name,
          type: 'folder',
        };

        if (maxDepth > 1) {
          try {
            info.children = await listVolumeDirectory('.', volume.name, volume.mountPath, maxDepth - 1);
          } catch {
            info.children = [];
          }
        }

        return info;
      })
    );

    // If only 1 volume, return its contents directly (keeps UI identical)
    if (volumeItems.length === 1) {
      return volumeItems[0].children ?? [];
    }

    return volumeItems;
  }

  // Specific volume path
  const { volume, relativePath: volRelativePath } = resolveVolumePath(cleanPath);
  return listVolumeDirectory(volRelativePath, volume.name, volume.mountPath, maxDepth);
};

export const readFileContent = async (relativePath: string): Promise<string> => {
  const { volume, relativePath: volRelativePath } = resolveVolumePath(relativePath);
  const safePath = await validatePath(volRelativePath, volume.mountPath);
  return await fs.readFile(safePath, 'utf-8');
};

export const writeFileContent = async (
  relativePath: string,
  content: string
): Promise<void> => {
  const { volume, relativePath: volRelativePath } = resolveVolumePath(relativePath);
  const safePath = await validatePath(volRelativePath, volume.mountPath);
  await fs.writeFile(safePath, content, 'utf-8');
};

export const createNewFile = async (
  relativePath: string,
  content: string = ''
): Promise<void> => {
  validateFileName(relativePath);
  const { volume, relativePath: volRelativePath } = resolveVolumePath(relativePath);
  const safePath = await validatePath(volRelativePath, volume.mountPath);

  // Check if file already exists
  try {
    await fs.access(safePath);
    throw new Error('File already exists');
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  // Ensure directory exists
  const dir = path.dirname(safePath);
  await fs.mkdir(dir, { recursive: true });

  await fs.writeFile(safePath, content, 'utf-8');
};

export const createFolder = async (relativePath: string): Promise<void> => {
  validateFileName(relativePath);
  const { volume, relativePath: volRelativePath } = resolveVolumePath(relativePath);
  const safePath = await validatePath(volRelativePath, volume.mountPath);

  // Check if folder already exists
  try {
    await fs.access(safePath);
    throw new Error('Folder already exists');
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  await fs.mkdir(safePath, { recursive: true });
};

export const deleteFileOrDirectory = async (relativePath: string): Promise<void> => {
  const { volume, relativePath: volRelativePath } = resolveVolumePath(relativePath);
  const safePath = await validatePath(volRelativePath, volume.mountPath);

  await trash(safePath);
};

export const renameFileOrDirectory = async (
  oldRelativePath: string,
  newRelativePath: string
): Promise<void> => {
  validateFileName(newRelativePath);
  const oldResolved = resolveVolumePath(oldRelativePath);
  const newResolved = resolveVolumePath(newRelativePath);

  // Reject cross-volume moves
  if (oldResolved.volume.name !== newResolved.volume.name) {
    throw new Error('Cannot move files between different volumes');
  }

  const oldSafePath = await validatePath(oldResolved.relativePath, oldResolved.volume.mountPath);
  const newSafePath = await validatePath(newResolved.relativePath, newResolved.volume.mountPath);

  await fs.rename(oldSafePath, newSafePath);
};
