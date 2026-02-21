import { Request, Response } from 'express';
import * as exportService from '../services/export.service.js';

export const exportToHTML = async (req: Request, res: Response): Promise<void> => {
  try {
    const { content, title = 'document' } = req.body;
    if (!content) {
      res.status(400).json({ error: 'Markdown content is required' });
      return;
    }

    const html = await exportService.convertToHTML(content, title);
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="${title}.html"`);
    res.send(html);
  } catch (error) {
    console.error('Error exporting to HTML:', error);
    res.status(500).json({ error: 'Failed to export to HTML' });
  }
};

export const exportToPDF = async (req: Request, res: Response): Promise<void> => {
  try {
    const { content } = req.body;
    if (!content) {
      res.status(400).json({ error: 'Markdown content is required' });
      return;
    }

    // TODO: Implement PDF export in Phase 2
    res.status(501).json({ error: 'PDF export not yet implemented' });
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    res.status(500).json({ error: 'Failed to export to PDF' });
  }
};

export const exportDocumentWithImages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { documentPath, format = 'html', title = 'document' } = req.body;
    if (!documentPath) {
      res.status(400).json({ error: 'documentPath is required' });
      return;
    }
    if (!['html', 'md', 'txt'].includes(format)) {
      res.status(400).json({ error: 'format must be html, md, or txt' });
      return;
    }

    const zipBuffer = await exportService.exportWithImages(documentPath, format as 'html' | 'md' | 'txt', title);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${title}.zip"`);
    res.send(zipBuffer);
  } catch (error) {
    console.error('Error exporting with images:', error);
    res.status(500).json({ error: 'Failed to export document with images' });
  }
};
