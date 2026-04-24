import express, { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { getVolumes } from '../services/volume.service.js';

const router = express.Router();

// Reads the defaults cheat-sheet, trying several candidate paths (Docker + local dev)
async function readDefaultsContent(): Promise<string> {
  const candidates = [
    '/app/defaults/markdown-cheat-sheet.md',                              // Docker production
    path.resolve(process.cwd(), '../defaults/markdown-cheat-sheet.md'),   // dev: cwd = backend/
    path.resolve(process.cwd(), '../../defaults/markdown-cheat-sheet.md'),// dev: cwd = project root
  ];
  for (const p of candidates) {
    try {
      return await fs.readFile(p, 'utf-8');
    } catch {
      // try next candidate
    }
  }
  throw new Error('defaults/markdown-cheat-sheet.md not found in any expected location');
}

// GET /api/defaults/cheat-sheet/status
// Returns whether markdown-cheat-sheet.md exists in the primary workspace root
router.get('/cheat-sheet/status', async (_req: Request, res: Response) => {
  try {
    const volumes = getVolumes();
    const workspaceRoot = volumes[0]?.mountPath ?? (process.env.WORKSPACE_ROOT || '/workspace');
    const filePath = path.join(workspaceRoot, 'markdown-cheat-sheet.md');
    await fs.access(filePath);
    res.json({ existsInWorkspace: true });
  } catch {
    res.json({ existsInWorkspace: false });
  }
});

// POST /api/defaults/cheat-sheet/restore
// Copies markdown-cheat-sheet.md from defaults to the primary workspace root
router.post('/cheat-sheet/restore', async (_req: Request, res: Response) => {
  try {
    const volumes = getVolumes();
    const workspaceRoot = volumes[0]?.mountPath ?? (process.env.WORKSPACE_ROOT || '/workspace');
    const destPath = path.join(workspaceRoot, 'markdown-cheat-sheet.md');

    // Return 409 if already exists
    try {
      await fs.access(destPath);
      res.status(409).json({ error: 'File already exists' });
      return;
    } catch {
      // File doesn't exist — proceed
    }

    const content = await readDefaultsContent();
    await fs.writeFile(destPath, content, 'utf-8');

    // Build the logical path (volume name + filename) for the frontend
    const volumeName = volumes[0]?.name ?? 'workspace';
    res.json({ path: `${volumeName}/markdown-cheat-sheet.md` });
  } catch (err) {
    console.error('Failed to restore cheat-sheet:', err);
    res.status(500).json({ error: 'Failed to restore cheat-sheet' });
  }
});

export default router;
