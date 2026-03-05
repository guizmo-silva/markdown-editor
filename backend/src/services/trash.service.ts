import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { getVolumes } from './volume.service.js';

export interface TrashItem {
  id: string;
  originalPath: string;  // volume-prefixed, e.g. "workspace/folder/file.md"
  originalName: string;  // just the filename, e.g. "file.md"
  deletedAt: string;     // ISO
  expiresAt: string;     // ISO (deletedAt + 30 days)
}

const TRASH_EXPIRY_DAYS = 30;

/**
 * Returns the .mkd_trash directory path inside the workspace volume mount.
 * Uses the volume named "workspace", or the first available volume as fallback.
 */
export function getTrashDir(): string {
  const volumes = getVolumes();
  const workspace = volumes.find(v => v.name === 'workspace') ?? volumes[0];
  return path.join(workspace.mountPath, '.mkd_trash');
}

function getFilesDir(): string {
  return path.join(getTrashDir(), 'files');
}

function getMetaDir(): string {
  return path.join(getTrashDir(), 'meta');
}

async function ensureTrashDirs(): Promise<void> {
  await fs.mkdir(getFilesDir(), { recursive: true });
  await fs.mkdir(getMetaDir(), { recursive: true });
}

/**
 * Moves a file (absolute path) to the trash.
 * relativePath is the volume-prefixed path used as originalPath in metadata.
 */
export async function moveToTrash(absolutePath: string, relativePath: string): Promise<TrashItem> {
  await ensureTrashDirs();

  const id = randomUUID();
  const originalName = path.basename(absolutePath);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TRASH_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const trashFileName = `${id}_${originalName}`;
  const destPath = path.join(getFilesDir(), trashFileName);

  // Try rename first (fast, same filesystem); fall back to recursive copy+delete
  try {
    await fs.rename(absolutePath, destPath);
  } catch (err: any) {
    if (err.code === 'EXDEV') {
      // Cross-device: copy (supports both files and directories) then delete
      await fs.cp(absolutePath, destPath, { recursive: true });
      await fs.rm(absolutePath, { recursive: true, force: true });
    } else {
      throw err;
    }
  }

  const item: TrashItem = {
    id,
    originalPath: relativePath,
    originalName,
    deletedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  await fs.writeFile(
    path.join(getMetaDir(), `${id}.json`),
    JSON.stringify(item, null, 2),
    'utf-8'
  );

  return item;
}

/**
 * Lists all non-expired trash items, sorted by deletedAt descending.
 * Automatically removes expired items found during listing.
 */
export async function listTrash(): Promise<TrashItem[]> {
  await ensureTrashDirs();

  let metaFiles: string[];
  try {
    metaFiles = await fs.readdir(getMetaDir());
  } catch {
    return [];
  }

  const now = new Date();
  const items: TrashItem[] = [];

  for (const file of metaFiles) {
    if (!file.endsWith('.json')) continue;
    try {
      const raw = await fs.readFile(path.join(getMetaDir(), file), 'utf-8');
      const item: TrashItem = JSON.parse(raw);

      if (new Date(item.expiresAt) < now) {
        // Expired — remove silently
        await permanentlyDelete(item.id);
      } else {
        items.push(item);
      }
    } catch {
      // Corrupt metadata — skip
    }
  }

  return items.sort((a, b) =>
    new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
  );
}

/**
 * Restore a trash item to the given destination absolute path.
 */
export async function restoreFromTrash(id: string, destinationAbsolutePath: string): Promise<void> {
  const metaPath = path.join(getMetaDir(), `${id}.json`);
  const raw = await fs.readFile(metaPath, 'utf-8');
  const item: TrashItem = JSON.parse(raw);

  const trashFileName = `${id}_${item.originalName}`;
  const srcPath = path.join(getFilesDir(), trashFileName);

  // Ensure destination directory exists
  await fs.mkdir(path.dirname(destinationAbsolutePath), { recursive: true });

  // Check for conflicts
  try {
    await fs.access(destinationAbsolutePath);
    throw new Error(`File already exists at destination: ${destinationAbsolutePath}`);
  } catch (err: any) {
    if (err.code !== 'ENOENT') throw err;
  }

  try {
    await fs.rename(srcPath, destinationAbsolutePath);
  } catch (err: any) {
    if (err.code === 'EXDEV') {
      // Cross-device: recursive copy (handles both files and directories) then delete
      await fs.cp(srcPath, destinationAbsolutePath, { recursive: true });
      await fs.rm(srcPath, { recursive: true, force: true });
    } else {
      throw err;
    }
  }

  await fs.unlink(metaPath);
}

/**
 * Permanently deletes a trash item (file + metadata).
 */
export async function permanentlyDelete(id: string): Promise<void> {
  const metaPath = path.join(getMetaDir(), `${id}.json`);

  let originalName: string | undefined;
  try {
    const raw = await fs.readFile(metaPath, 'utf-8');
    const item: TrashItem = JSON.parse(raw);
    originalName = item.originalName;
  } catch {
    // Metadata missing — try to clean up file anyway with glob pattern
  }

  if (originalName) {
    const trashFileName = `${id}_${originalName}`;
    try {
      await fs.rm(path.join(getFilesDir(), trashFileName), { recursive: true, force: true });
    } catch {
      // Already gone
    }
  } else {
    // Metadata missing — scan files dir for any entry starting with the id
    try {
      const filesInDir = await fs.readdir(getFilesDir());
      for (const f of filesInDir) {
        if (f.startsWith(`${id}_`)) {
          await fs.rm(path.join(getFilesDir(), f), { recursive: true, force: true }).catch(() => {});
        }
      }
    } catch {
      // Ignore
    }
  }

  try {
    await fs.unlink(metaPath);
  } catch {
    // Metadata already gone
  }
}

/**
 * Removes all trash items (empties the trash).
 */
export async function emptyTrash(): Promise<void> {
  await ensureTrashDirs();

  const [metaFiles, trashFiles] = await Promise.all([
    fs.readdir(getMetaDir()).catch(() => [] as string[]),
    fs.readdir(getFilesDir()).catch(() => [] as string[]),
  ]);

  await Promise.all([
    ...metaFiles.map(f => fs.unlink(path.join(getMetaDir(), f)).catch(() => {})),
    ...trashFiles.map(f => fs.rm(path.join(getFilesDir(), f), { recursive: true, force: true }).catch(() => {})),
  ]);
}

/**
 * Removes all expired trash items. Called on startup and periodically.
 */
export async function cleanupExpired(): Promise<void> {
  await ensureTrashDirs();

  let metaFiles: string[];
  try {
    metaFiles = await fs.readdir(getMetaDir());
  } catch {
    return;
  }

  const now = new Date();

  for (const file of metaFiles) {
    if (!file.endsWith('.json')) continue;
    try {
      const raw = await fs.readFile(path.join(getMetaDir(), file), 'utf-8');
      const item: TrashItem = JSON.parse(raw);
      if (new Date(item.expiresAt) < now) {
        await permanentlyDelete(item.id);
      }
    } catch {
      // Corrupt metadata — remove just the meta file
      await fs.unlink(path.join(getMetaDir(), file)).catch(() => {});
    }
  }
}
