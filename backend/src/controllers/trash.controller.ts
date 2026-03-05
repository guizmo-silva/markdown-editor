import { Request, Response } from 'express';
import { listTrash, permanentlyDelete, restoreFromTrash, emptyTrash } from '../services/trash.service.js';
import { resolveVolumePath } from '../services/volume.service.js';
import { validatePath } from '../utils/security.js';

export const getTrashItems = async (_req: Request, res: Response): Promise<void> => {
  try {
    const items = await listTrash();
    res.json({ items });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to list trash' });
  }
};

export const deleteTrashItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!id) {
      res.status(400).json({ error: 'Missing id' });
      return;
    }
    await permanentlyDelete(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete item' });
  }
};

export const restoreTrashItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { destinationPath } = req.body;

    if (!id || !destinationPath) {
      res.status(400).json({ error: 'Missing id or destinationPath' });
      return;
    }

    // Validate destination
    const { volume, relativePath } = resolveVolumePath(destinationPath);
    const safeDestPath = await validatePath(relativePath, volume.mountPath);

    await restoreFromTrash(id, safeDestPath);
    res.json({ success: true });
  } catch (err: any) {
    const status = err.message?.includes('already exists') ? 409 : 500;
    res.status(status).json({ error: err.message || 'Failed to restore item' });
  }
};

export const emptyTrashHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    await emptyTrash();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to empty trash' });
  }
};
