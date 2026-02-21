import { Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import * as fileService from '../services/file.service.js';
import { getVolumes } from '../services/volume.service.js';
import { validateVolumePath } from '../utils/security.js';
import { SUPPORTED_IMAGE_EXTENSIONS, MIME_MAP } from '../utils/imageFormats.js';

export const upload = multer({ storage: multer.memoryStorage() });

export const listFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    const { path = '/' } = req.query;
    const files = await fileService.listDirectory(path as string);
    res.json({ files });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
};

export const readFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { path } = req.query;
    if (!path || typeof path !== 'string') {
      res.status(400).json({ error: 'Path is required' });
      return;
    }

    const content = await fileService.readFileContent(path);
    res.json({ content, path });
  } catch (error) {
    console.error('Error reading file:', error);
    res.status(500).json({ error: 'Failed to read file' });
  }
};

export const saveFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { path, content } = req.body;
    if (!path || content === undefined) {
      res.status(400).json({ error: 'Path and content are required' });
      return;
    }

    await fileService.writeFileContent(path, content);
    res.json({ success: true, path });
  } catch (error) {
    console.error('Error saving file:', error);
    res.status(500).json({ error: 'Failed to save file' });
  }
};

export const createFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { path, content = '' } = req.body;
    if (!path) {
      res.status(400).json({ error: 'Path is required' });
      return;
    }

    await fileService.createNewFile(path, content);
    res.json({ success: true, path });
  } catch (error: any) {
    console.error('Error creating file:', error);
    if (error.message === 'File already exists') {
      res.status(409).json({ error: 'File already exists' });
    } else if (error.message?.startsWith('Filename too long')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to create file' });
    }
  }
};

export const deleteFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { path } = req.query;
    if (!path || typeof path !== 'string') {
      res.status(400).json({ error: 'Path is required' });
      return;
    }

    await fileService.deleteFileOrDirectory(path);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
};

export const createFolder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { path } = req.body;
    if (!path) {
      res.status(400).json({ error: 'Path is required' });
      return;
    }

    await fileService.createFolder(path);
    res.json({ success: true, path });
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ error: 'Failed to create folder' });
  }
};

export const renameFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { oldPath, newPath } = req.body;
    if (!oldPath || !newPath) {
      res.status(400).json({ error: 'Old path and new path are required' });
      return;
    }

    await fileService.renameFileOrDirectory(oldPath, newPath);
    res.json({ success: true, newPath });
  } catch (error: any) {
    console.error('Error renaming file:', error);
    if (error.message === 'Cannot move files between different volumes' || error.message?.startsWith('Filename too long')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to rename file' });
    }
  }
};

export const listVolumes = async (_req: Request, res: Response): Promise<void> => {
  try {
    const volumes = getVolumes();
    res.json({ volumes: volumes.map(v => ({ name: v.name, path: v.mountPath })) });
  } catch (error) {
    console.error('Error listing volumes:', error);
    res.status(500).json({ error: 'Failed to list volumes' });
  }
};

export const serveImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { path: imagePath } = req.query;
    if (!imagePath || typeof imagePath !== 'string') {
      res.status(400).json({ error: 'Path is required' });
      return;
    }

    const ext = path.extname(imagePath).toLowerCase();
    if (!SUPPORTED_IMAGE_EXTENSIONS.has(ext)) {
      res.status(400).json({ error: 'Unsupported image format' });
      return;
    }

    const safePath = await validateVolumePath(imagePath);
    const buffer = await fs.readFile(safePath);
    const mimeType = MIME_MAP[ext] || 'application/octet-stream';

    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(buffer);
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(404).json({ error: 'Image not found' });
  }
};

export const importImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { documentPath } = req.body;
    const file = (req as Request & { file?: Express.Multer.File }).file;

    if (!file) {
      res.status(400).json({ error: 'Image file is required' });
      return;
    }
    if (!documentPath || typeof documentPath !== 'string') {
      res.status(400).json({ error: 'documentPath is required' });
      return;
    }

    const ext = path.extname(file.originalname).toLowerCase();
    if (!SUPPORTED_IMAGE_EXTENSIONS.has(ext)) {
      res.status(400).json({ error: 'Unsupported image format' });
      return;
    }

    // 1. Ensure document folder exists and move .md into it
    const newDocumentPath = await fileService.createDocumentFolder(documentPath);

    // 2. Copy image into the folder
    const imageName = await fileService.addImageToDocumentFolder(
      newDocumentPath,
      file.buffer,
      file.originalname,
    );

    res.json({ newDocumentPath, imageName });
  } catch (error) {
    console.error('Error importing image:', error);
    res.status(500).json({ error: 'Failed to import image' });
  }
};
