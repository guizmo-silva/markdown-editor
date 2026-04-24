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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const deleteTrashItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!id || !UUID_RE.test(id)) {
      res.status(400).json({ error: 'Invalid id' });
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

    if (!id || !UUID_RE.test(id) || !destinationPath) {
      res.status(400).json({ error: 'Missing or invalid id or destinationPath' });
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
