// API service for backend communication

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

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
  const response = await fetch(`${API_BASE_URL}/files/list?path=${encodeURIComponent(path)}`);

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
  const response = await fetch(`${API_BASE_URL}/files/read?path=${encodeURIComponent(path)}`);

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
  const response = await fetch(`${API_BASE_URL}/files/save`, {
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
  const response = await fetch(`${API_BASE_URL}/files/create`, {
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
  const response = await fetch(`${API_BASE_URL}/files/create-folder`, {
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
  const response = await fetch(`${API_BASE_URL}/files/delete?path=${encodeURIComponent(path)}`, {
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
  const response = await fetch(`${API_BASE_URL}/files/rename`, {
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
  const response = await fetch(`${API_BASE_URL}/export/html`, {
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
