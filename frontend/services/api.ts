// API service for backend communication

// Cache for API base URL (evaluated lazily on first use in browser)
let cachedApiBaseUrl: string | null = null;

/**
 * Get the API base URL dynamically based on the current host
 * This allows the app to work regardless of what IP/hostname is used to access it
 */
function getApiBaseUrl(): string {
  // Return cached value if available
  if (cachedApiBaseUrl) {
    return cachedApiBaseUrl;
  }

  // If explicitly set, use that
  if (process.env.NEXT_PUBLIC_API_URL) {
    cachedApiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
    return cachedApiBaseUrl;
  }

  // In browser, detect the host dynamically
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const apiPort = '3001';
    cachedApiBaseUrl = `${protocol}//${hostname}:${apiPort}/api`;
    return cachedApiBaseUrl;
  }

  // Fallback for SSR (not cached as it may change)
  return 'http://localhost:3001/api';
}

export interface FileItem {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileItem[];
  modifiedAt?: string;
  size?: number;
}

/**
 * List files in a directory
 */
export async function listFiles(path: string = '/'): Promise<FileItem[]> {
  const response = await fetch(`${getApiBaseUrl()}/files/list?path=${encodeURIComponent(path)}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to list files' }));
    throw new Error(error.error || 'Failed to list files');
  }

  const data = await response.json();
  return data.files;
}

/**
 * Read file content
 */
export async function readFile(path: string): Promise<string> {
  const response = await fetch(`${getApiBaseUrl()}/files/read?path=${encodeURIComponent(path)}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to read file' }));
    throw new Error(error.error || 'Failed to read file');
  }

  const data = await response.json();
  return data.content;
}

/**
 * Save file content
 */
export async function saveFile(path: string, content: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/files/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path, content }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to save file' }));
    throw new Error(error.error || 'Failed to save file');
  }
}

/**
 * Create a new file
 */
export async function createFile(path: string, content: string = ''): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/files/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path, content }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create file' }));
    throw new Error(error.error || 'Failed to create file');
  }
}

/**
 * Create a folder
 */
export async function createFolder(path: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/files/create-folder`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create folder' }));
    throw new Error(error.error || 'Failed to create folder');
  }
}

/**
 * Delete a file
 */
export async function deleteFile(path: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/files/delete?path=${encodeURIComponent(path)}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete file' }));
    throw new Error(error.error || 'Failed to delete file');
  }
}

/**
 * Rename a file
 */
export async function renameFile(oldPath: string, newPath: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/files/rename`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ oldPath, newPath }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to rename file' }));
    throw new Error(error.error || 'Failed to rename file');
  }
}

/**
 * Export markdown to HTML
 */
export async function exportToHtml(content: string, title?: string): Promise<Blob> {
  const response = await fetch(`${getApiBaseUrl()}/export/html`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content, title }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to export HTML' }));
    throw new Error(error.error || 'Failed to export HTML');
  }

  return response.blob();
}
