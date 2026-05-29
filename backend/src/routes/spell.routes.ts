import express, { Request, Response } from 'express';
import { suggestWord } from '../services/spell.service.js';

const router = express.Router();

router.post('/suggest', async (req: Request, res: Response) => {
  const { word, language } = req.body as { word?: string; language?: string };

  if (!word || typeof word !== 'string' || word.length > 100) {
    res.status(400).json({ error: 'Invalid word' });
    return;
  }

  const lang = typeof language === 'string' ? language : 'en-US';
  try {
    const result = await suggestWord(word.trim(), lang);
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
