import path from 'path';

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
