import { Request, Response } from 'express';
import * as fileService from '../services/file.service.js';

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
  } catch (error) {
    console.error('Error creating file:', error);
    res.status(500).json({ error: 'Failed to create file' });
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
  } catch (error) {
    console.error('Error renaming file:', error);
    res.status(500).json({ error: 'Failed to rename file' });
  }
};
