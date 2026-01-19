import fs from 'fs/promises';
import path from 'path';
import { validatePath } from '../utils/security.js';

// Use getter to ensure env is loaded when accessed
const getWorkspaceRoot = () => process.env.WORKSPACE_ROOT || '/workspace';

export interface FileInfo {
  name: string;
  path: string;
  type: 'file' | 'folder';
  extension?: string;
  size?: number;
  modifiedAt?: string;
}

export const listDirectory = async (relativePath: string): Promise<FileInfo[]> => {
  const safePath = await validatePath(relativePath, getWorkspaceRoot());

  const entries = await fs.readdir(safePath, { withFileTypes: true });

  const fileInfos = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(safePath, entry.name);
      const stats = await fs.stat(fullPath);

      return {
        name: entry.name,
        path: path.relative(getWorkspaceRoot(), fullPath),
        type: entry.isDirectory() ? 'folder' : 'file',
        extension: entry.isFile() ? path.extname(entry.name) : undefined,
        size: stats.size,
        modifiedAt: stats.mtime.toISOString(),
      } as FileInfo;
    })
  );

  // Filter to show only .md files and folders
  return fileInfos.filter(
    (info) => info.type === 'folder' || info.extension === '.md'
  );
};

export const readFileContent = async (relativePath: string): Promise<string> => {
  const safePath = await validatePath(relativePath, getWorkspaceRoot());
  return await fs.readFile(safePath, 'utf-8');
};

export const writeFileContent = async (
  relativePath: string,
  content: string
): Promise<void> => {
  const safePath = await validatePath(relativePath, getWorkspaceRoot());
  await fs.writeFile(safePath, content, 'utf-8');
};

export const createNewFile = async (
  relativePath: string,
  content: string = ''
): Promise<void> => {
  const safePath = await validatePath(relativePath, getWorkspaceRoot());

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

export const deleteFileOrDirectory = async (relativePath: string): Promise<void> => {
  const safePath = await validatePath(relativePath, getWorkspaceRoot());

  const stats = await fs.stat(safePath);
  if (stats.isDirectory()) {
    await fs.rm(safePath, { recursive: true });
  } else {
    await fs.unlink(safePath);
  }
};

export const renameFileOrDirectory = async (
  oldRelativePath: string,
  newRelativePath: string
): Promise<void> => {
  const oldSafePath = await validatePath(oldRelativePath, getWorkspaceRoot());
  const newSafePath = await validatePath(newRelativePath, getWorkspaceRoot());

  await fs.rename(oldSafePath, newSafePath);
};
