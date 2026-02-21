import fs from 'fs/promises';
import path from 'path';
import trash from 'trash';
import { validatePath, validateFileName } from '../utils/security.js';
import { getVolumes, resolveVolumePath } from './volume.service.js';
import { SUPPORTED_IMAGE_EXTENSIONS, slugify } from '../utils/imageFormats.js';

export interface FileInfo {
  name: string;
  path: string;
  type: 'file' | 'folder' | 'image';
  extension?: string;
  size?: number;
  modifiedAt?: string;
  children?: FileInfo[];
}

/**
 * Returns true if a directory is a "document folder":
 * it contains exactly one .md file whose basename (slugified) matches the folder name.
 */
const isDocumentFolder = async (dirPath: string, folderName: string): Promise<{ mdFile: string } | null> => {
  let entries;
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return null;
  }

  const mdFiles = entries.filter(e => e.isFile() && path.extname(e.name).toLowerCase() === '.md');
  if (mdFiles.length !== 1) return null;

  const mdBasename = path.basename(mdFiles[0].name, '.md');
  if (slugify(mdBasename) === slugify(folderName)) {
    return { mdFile: mdFiles[0].name };
  }
  return null;
};

const listVolumeDirectory = async (
  relativePath: string,
  volumeName: string,
  volumeMountPath: string,
  maxDepth: number
): Promise<FileInfo[]> => {
  const safePath = await validatePath(relativePath, volumeMountPath);
  const allEntries = await fs.readdir(safePath, { withFileTypes: true });
  const entries = allEntries.filter(entry => !entry.name.startsWith('.'));

  const fileInfos: FileInfo[] = [];

  for (const entry of entries) {
    const fullPath = path.join(safePath, entry.name);
    const stats = await fs.stat(fullPath);
    const relativeToVolume = path.relative(volumeMountPath, fullPath);
    const entryPath = `${volumeName}/${relativeToVolume}`;

    if (entry.isDirectory()) {
      // Check if this is a document folder
      const docInfo = await isDocumentFolder(fullPath, entry.name);
      if (docInfo) {
        // Expose the .md file at this level (not the folder)
        const mdFullPath = path.join(fullPath, docInfo.mdFile);
        const mdStats = await fs.stat(mdFullPath);
        const mdRelativeToVolume = path.relative(volumeMountPath, mdFullPath);
        const mdPath = `${volumeName}/${mdRelativeToVolume}`;

        // Collect image children
        const dirContents = await fs.readdir(fullPath, { withFileTypes: true });
        const imageChildren: FileInfo[] = [];
        for (const child of dirContents) {
          if (child.isFile() && SUPPORTED_IMAGE_EXTENSIONS.has(path.extname(child.name).toLowerCase())) {
            const imgFullPath = path.join(fullPath, child.name);
            const imgStats = await fs.stat(imgFullPath);
            const imgRelativeToVolume = path.relative(volumeMountPath, imgFullPath);
            imageChildren.push({
              name: child.name,
              path: `${volumeName}/${imgRelativeToVolume}`,
              type: 'image',
              extension: path.extname(child.name).toLowerCase(),
              size: imgStats.size,
              modifiedAt: imgStats.mtime.toISOString(),
            });
          }
        }
        imageChildren.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

        fileInfos.push({
          name: docInfo.mdFile,
          path: mdPath,
          type: 'file',
          extension: '.md',
          size: mdStats.size,
          modifiedAt: mdStats.mtime.toISOString(),
          children: imageChildren.length > 0 ? imageChildren : undefined,
        });
      } else if (maxDepth > 1) {
        // Regular folder
        const children = await listVolumeDirectory(relativeToVolume, volumeName, volumeMountPath, maxDepth - 1);
        fileInfos.push({
          name: entry.name,
          path: entryPath,
          type: 'folder',
          size: stats.size,
          modifiedAt: stats.mtime.toISOString(),
          children,
        });
      } else {
        fileInfos.push({
          name: entry.name,
          path: entryPath,
          type: 'folder',
          size: stats.size,
          modifiedAt: stats.mtime.toISOString(),
        });
      }
    } else if (path.extname(entry.name).toLowerCase() === '.md') {
      fileInfos.push({
        name: entry.name,
        path: entryPath,
        type: 'file',
        extension: '.md',
        size: stats.size,
        modifiedAt: stats.mtime.toISOString(),
      });
    }
    // Non-.md, non-image files are ignored at root listing
  }

  // Sort: folders first (alphabetically), then files (alphabetically)
  return fileInfos.sort((a, b) => {
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

  // If deleting a .md file that is alone inside its document folder,
  // trash the entire parent folder so no empty folder is left behind.
  if (path.extname(safePath).toLowerCase() === '.md') {
    const parentDir = path.dirname(safePath);
    const parentName = path.basename(parentDir);
    const mdBaseName = path.basename(safePath, '.md');

    if (slugify(parentName) === slugify(mdBaseName)) {
      try {
        const siblings = await fs.readdir(parentDir, { withFileTypes: true });
        const nonHidden = siblings.filter(e => !e.name.startsWith('.'));
        if (nonHidden.length === 1 && nonHidden[0].name === path.basename(safePath)) {
          // File is alone in its document folder — trash the whole folder
          await trash(parentDir);
          return;
        }
      } catch {
        // Fall through to normal deletion
      }
    }
  }

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

/**
 * Creates a document folder for a .md file if it doesn't already exist,
 * then moves the .md file into it.
 *
 * Example: workspace/artigos/meu-texto.md
 *   → creates workspace/artigos/meu-texto/
 *   → moves .md to workspace/artigos/meu-texto/meu-texto.md
 *
 * If the document folder already exists (idempotent), just returns new path.
 * Returns the new volume-prefixed path of the .md file.
 */
export const createDocumentFolder = async (documentPath: string): Promise<string> => {
  const { volume, relativePath: volRelativePath } = resolveVolumePath(documentPath);
  const safeMdPath = await validatePath(volRelativePath, volume.mountPath);

  const mdBasename = path.basename(safeMdPath); // e.g. "meu-texto.md"
  const mdNameWithoutExt = path.basename(safeMdPath, '.md'); // e.g. "meu-texto"
  const parentDir = path.dirname(safeMdPath); // e.g. /workspace/artigos
  const parentDirName = path.basename(parentDir); // e.g. "meu-texto" if already in folder

  // Detect if the .md is already inside its document folder
  if (slugify(parentDirName) === slugify(mdNameWithoutExt)) {
    // Already in the right place — return as-is
    const relativeToVolume = path.relative(volume.mountPath, safeMdPath);
    return `${volume.name}/${relativeToVolume}`;
  }

  const folderSlug = slugify(mdNameWithoutExt); // slug of the folder name
  const docFolderPath = path.join(parentDir, folderSlug);

  // Check if folder already exists (idempotent)
  let folderExists = false;
  try {
    const stat = await fs.stat(docFolderPath);
    folderExists = stat.isDirectory();
  } catch {
    // doesn't exist yet
  }

  if (!folderExists) {
    await fs.mkdir(docFolderPath, { recursive: true });
  }

  const newMdPath = path.join(docFolderPath, mdBasename);

  // Move the .md into the folder
  try {
    await fs.access(safeMdPath);
    await fs.rename(safeMdPath, newMdPath);
  } catch {
    // .md might already be at the new path — continue
  }

  // Return new volume-prefixed path
  const newRelativeToVolume = path.relative(volume.mountPath, newMdPath);
  return `${volume.name}/${newRelativeToVolume}`;
};

/**
 * Copies an image buffer into a document folder.
 * The document folder must already exist (call createDocumentFolder first).
 * Returns the final image name (may have a numeric suffix if a conflict exists).
 */
export const addImageToDocumentFolder = async (
  documentPath: string,
  imageBuffer: Buffer,
  imageName: string,
): Promise<string> => {
  const { volume, relativePath: volRelativePath } = resolveVolumePath(documentPath);
  const safeMdPath = await validatePath(volRelativePath, volume.mountPath);
  const docFolder = path.dirname(safeMdPath);

  // Sanitise image filename
  const safeName = path.basename(imageName).replace(/[^a-zA-Z0-9._-]/g, '_');
  const ext = path.extname(safeName);
  const base = path.basename(safeName, ext);

  // Avoid overwriting existing files
  let finalName = safeName;
  let counter = 1;
  while (true) {
    const candidate = path.join(docFolder, finalName);
    try {
      await fs.access(candidate);
      // file exists → try next suffix
      finalName = `${base}_${counter}${ext}`;
      counter++;
    } catch {
      break; // ENOENT → name is free
    }
  }

  await fs.writeFile(path.join(docFolder, finalName), imageBuffer);
  return finalName;
};
