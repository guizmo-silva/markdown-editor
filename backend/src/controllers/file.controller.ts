import { Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import * as fileService from '../services/file.service.js';
import { getVolumes } from '../services/volume.service.js';
import { validateVolumePath } from '../utils/security.js';
import { SUPPORTED_IMAGE_EXTENSIONS, MIME_MAP } from '../utils/imageFormats.js';
import { docxToMarkdown } from '../services/docxImport.service.js';
import { extractZip } from '../services/zipImport.service.js';

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

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
    res.json({ volumes: volumes.map(v => ({ name: v.name })) });
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

export const importDocx = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = (req as Request & { file?: Express.Multer.File }).file;
    const { destFolder } = req.body;

    if (!file) {
      res.status(400).json({ error: 'File is required' });
      return;
    }
    if (!destFolder || typeof destFolder !== 'string') {
      res.status(400).json({ error: 'destFolder is required' });
      return;
    }

    const baseName = path.basename(file.originalname, path.extname(file.originalname));
    const mdFilename = `${baseName}.md`;
    const stem = baseName;

    const { markdown, images } = await docxToMarkdown(file.buffer);

    // Find a free path, avoiding conflicts
    let finalPath = '';
    let counter = 0;
    while (true) {
      const candidateName = counter === 0 ? mdFilename : `${stem} (${counter}).md`;
      const candidatePath = destFolder === '/' ? candidateName : `${destFolder}/${candidateName}`;
      try {
        await fileService.createNewFile(candidatePath, markdown);
        finalPath = candidatePath;
        break;
      } catch (err: any) {
        if (err.message === 'File already exists') {
          counter++;
        } else {
          throw err;
        }
      }
    }

    if (images.length > 0) {
      // Create document folder and move .md into it, then add images
      const newDocPath = await fileService.createDocumentFolder(finalPath);
      for (const img of images) {
        await fileService.addImageToDocumentFolder(newDocPath, img.buffer, img.name);
      }
      // Rewrite the file at the new location (createDocumentFolder moved it)
      await fileService.writeFileContent(newDocPath, markdown);
      res.json({ filePath: newDocPath });
    } else {
      res.json({ filePath: finalPath });
    }
  } catch (error) {
    console.error('Error importing docx:', error);
    res.status(500).json({ error: 'Failed to import docx' });
  }
};

export const importZip = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = (req as Request & { file?: Express.Multer.File }).file;
    const { destFolder } = req.body;

    if (!file) { res.status(400).json({ error: 'File is required' }); return; }
    if (!destFolder || typeof destFolder !== 'string') {
      res.status(400).json({ error: 'destFolder is required' }); return;
    }

    const { mdFilename, mdContent, images } = await extractZip(file.buffer);

    const stem = path.basename(mdFilename, '.md');

    let finalPath = '';
    let counter = 0;
    while (true) {
      const candidateStem = counter === 0 ? stem : `${stem} (${counter})`;
      const candidateName = `${candidateStem}.md`;
      const candidatePath = destFolder === '/' ? candidateName : `${destFolder}/${candidateName}`;
      const candidateFolderPath = destFolder === '/' ? candidateStem : `${destFolder}/${candidateStem}`;

      // Check if document folder already exists (a previously imported document occupies that name)
      try {
        const folderAbsPath = await validateVolumePath(candidateFolderPath);
        await fs.access(folderAbsPath);
        counter++;
        continue;
      } catch {
        // folder doesn't exist — proceed
      }

      try {
        await fileService.createNewFile(candidatePath, mdContent);
        finalPath = candidatePath;
        break;
      } catch (err: any) {
        if (err.message === 'File already exists') { counter++; } else { throw err; }
      }
    }

    const newDocPath = await fileService.createDocumentFolder(finalPath);
    for (const img of images) {
      await fileService.addImageToDocumentFolder(newDocPath, img.buffer, img.name);
    }
    await fileService.writeFileContent(newDocPath, mdContent);

    res.json({ filePath: newDocPath });
  } catch (error: any) {
    console.error('Error importing zip:', error);
    const msg = error?.message || 'Failed to import zip';
    const status = msg.includes('ZIP') || msg.includes('suportado') || msg.includes('excede') ? 422 : 500;
    res.status(status).json({ error: msg });
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
