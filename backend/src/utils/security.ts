import path from 'path';
import fs from 'fs/promises';

/**
 * Validates and sanitizes file paths to prevent path traversal attacks
 */
export const validatePath = async (
  relativePath: string,
  workspaceRoot: string
): Promise<string> => {
  // Normalize the path to prevent path traversal
  const normalizedPath = path.normalize(relativePath);

  // Prevent absolute paths and parent directory traversal
  if (path.isAbsolute(normalizedPath) || normalizedPath.startsWith('..')) {
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
 * Sanitizes HTML content to prevent XSS attacks
 */
export const sanitizeHTML = (html: string): string => {
  // Basic sanitization - will be enhanced with proper library (DOMPurify, sanitize-html)
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '');
};
