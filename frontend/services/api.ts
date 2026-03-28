// API service for backend communication

/**
 * Returns the API base path.
 * All requests go through the Next.js reverse proxy at /api,
 * so no port or hostname is needed — works from any origin.
 * Override with NEXT_PUBLIC_API_URL for non-proxy setups.
 */
function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return '/api';
}

export interface FileItem {
  name: string;
  type: 'file' | 'folder' | 'image';
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
 * Volume info
 */
export interface VolumeInfo {
  name: string;
  path: string;
}

/**
 * Get configured volumes
 */
export async function getVolumes(): Promise<VolumeInfo[]> {
  const response = await fetch(`${getApiBaseUrl()}/files/volumes`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to get volumes' }));
    throw new Error(error.error || 'Failed to get volumes');
  }

  const data = await response.json();
  return data.volumes;
}

// ─── Trash ────────────────────────────────────────────────────────────────────

export interface TrashItem {
  id: string;
  originalPath: string;
  originalName: string;
  deletedAt: string;
  expiresAt: string;
}

export async function getTrashItems(): Promise<TrashItem[]> {
  const response = await fetch(`${getApiBaseUrl()}/trash`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to list trash' }));
    throw new Error(error.error || 'Failed to list trash');
  }
  const data = await response.json();
  return data.items;
}

export async function getTrashCount(): Promise<number> {
  try {
    const items = await getTrashItems();
    return items.length;
  } catch {
    return 0;
  }
}

export async function restoreTrashItem(id: string, destinationPath: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/trash/${encodeURIComponent(id)}/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ destinationPath }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to restore item' }));
    throw new Error(error.error || 'Failed to restore item');
  }
}

export async function permanentlyDeleteTrashItem(id: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/trash/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete item' }));
    throw new Error(error.error || 'Failed to delete item');
  }
}

export async function emptyTrash(): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/trash`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to empty trash' }));
    throw new Error(error.error || 'Failed to empty trash');
  }
}

// ──────────────────────────────────────────────────────────────────────────────

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

/**
 * Export rendered HTML to PDF
 */
export async function exportToPdf(
  renderedHtml: string,
  title?: string,
): Promise<Blob> {
  const response = await fetch(`${getApiBaseUrl()}/export/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ renderedHtml, title }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to export PDF' }));
    throw new Error(error.error || 'Failed to export PDF');
  }
  return response.blob();
}

/**
 * Import an image into a document folder.
 * Returns the new document path (after folder creation) and the final image name.
 */
export async function importImage(
  documentPath: string,
  file: File,
): Promise<{ newDocumentPath: string; imageName: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('documentPath', documentPath);

  const response = await fetch(`${getApiBaseUrl()}/files/import-image`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to import image' }));
    throw new Error(error.error || 'Failed to import image');
  }

  return response.json();
}

/**
 * Returns the URL to serve an image file from the backend.
 */
export function getImageUrl(imagePath: string): string {
  return `${getApiBaseUrl()}/files/image?path=${encodeURIComponent(imagePath)}`;
}

/**
 * Import a .docx file and convert it to Markdown.
 * Returns the volume-prefixed path of the created .md file.
 */
export async function importDocx(
  file: File,
  destFolder: string,
): Promise<{ filePath: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('destFolder', destFolder);

  const response = await fetch(`${getApiBaseUrl()}/files/import-docx`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to import' }));
    throw new Error(error.error || 'Failed to import docx');
  }

  return response.json();
}

/**
 * Import a .zip file (markdown + images) and recreate a document folder.
 * Returns the volume-prefixed path of the created .md file.
 */
export async function importZip(
  file: File,
  destFolder: string,
): Promise<{ filePath: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('destFolder', destFolder);

  const response = await fetch(`${getApiBaseUrl()}/files/import-zip`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to import' }));
    throw new Error(error.error || 'Failed to import zip');
  }

  return response.json();
}

/**
 * Export markdown to DOCX (Word). Sends documentPath so the backend can embed images.
 */
export async function exportToDocx(
  content: string,
  title?: string,
  documentPath?: string,
): Promise<Blob> {
  const response = await fetch(`${getApiBaseUrl()}/export/docx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, title, documentPath }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to export DOCX' }));
    throw new Error(error.error || 'Failed to export DOCX');
  }

  return response.blob();
}

/**
 * Export a document with images as a zip archive.
 */
export async function exportWithImages(
  documentPath: string,
  format: 'html' | 'md' | 'txt',
  title: string,
): Promise<Blob> {
  const response = await fetch(`${getApiBaseUrl()}/export/with-images`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentPath, format, title }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to export with images' }));
    throw new Error(error.error || 'Failed to export with images');
  }

  return response.blob();
}
