import path from 'path';
import { resolveVolumePath } from '../services/volume.service.js';

// Max filename length in bytes (ext4/NTFS/HFS+/APFS all use 255)
const MAX_FILENAME_BYTES = 255;

/**
 * Validates that a filename does not exceed OS filesystem limits.
 * Checks the basename (last segment) of the path.
 * Throws if the filename exceeds 255 bytes (UTF-8).
 */
export const validateFileName = (filePath: string): void => {
  const basename = path.basename(filePath);
  if (!basename) return;

  const byteLength = Buffer.byteLength(basename, 'utf-8');
  if (byteLength > MAX_FILENAME_BYTES) {
    throw new Error(`Filename too long: ${byteLength} bytes exceeds the ${MAX_FILENAME_BYTES}-byte limit`);
  }
};

/**
 * Validates and sanitizes file paths to prevent path traversal attacks
 */
export const validatePath = async (
  relativePath: string,
  workspaceRoot: string
): Promise<string> => {
  // Treat "/" or empty string as workspace root
  let cleanPath = relativePath.trim();
  if (cleanPath === '/' || cleanPath === '') {
    cleanPath = '.';
  } else if (cleanPath.startsWith('/')) {
    // Remove leading slash to make it relative
    cleanPath = cleanPath.slice(1);
  }

  // Normalize the path to prevent path traversal
  const normalizedPath = path.normalize(cleanPath);

  // Prevent parent directory traversal
  if (normalizedPath.startsWith('..') || normalizedPath.includes('/..') || normalizedPath.includes('\\..')) {
    throw new Error('Invalid path: Path traversal detected');
  }

  // Resolve to absolute path within workspace
  const absolutePath = path.resolve(workspaceRoot, normalizedPath);

  // Ensure the resolved path is still within workspace root
  if (!absolutePath.startsWith(path.resolve(workspaceRoot))) {
    throw new Error('Invalid path: Path outside workspace');
  }

  return absolutePath;
};

/**
 * Validates a volume-prefixed path (e.g., "workspace/folder/file.md")
 * Resolves the volume and validates the relative path within it
 */
export const validateVolumePath = async (volumePath: string): Promise<string> => {
  const { volume, relativePath } = resolveVolumePath(volumePath);
  return validatePath(relativePath, volume.mountPath);
};
