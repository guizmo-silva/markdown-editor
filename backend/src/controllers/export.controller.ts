import { Request, Response } from 'express';
import * as exportService from '../services/export.service.js';
import { markdownToDocx } from '../services/docxExport.service.js';

// Build a Content-Disposition header value that supports UTF-8 filenames via RFC 5987.
// Returns a header string with both a safe ASCII fallback (filename="...") and
// the properly percent-encoded UTF-8 name (filename*=UTF-8''...).
function contentDispositionHeader(name: string, ext: string): string {
  const cleaned = name
    .replace(/[\x00-\x1f\x7f]/g, '')  // strip control chars (CR, LF, NUL…)
    .trim()
    .substring(0, 200) || 'document';

  // ASCII-only fallback: replace non-ASCII and filename-breaking chars with '_'
  const asciiName = cleaned.replace(/[^\x20-\x7e]/g, '_').replace(/["\\/]/g, '_');

  // RFC 5987 percent-encode: encode everything except unreserved chars
  const rfc5987Name = encodeURIComponent(cleaned + ext).replace(/['()!*]/g, c =>
    '%' + c.charCodeAt(0).toString(16).toUpperCase()
  );

  return `attachment; filename="${asciiName}${ext}"; filename*=UTF-8''${rfc5987Name}`;
}

export const exportToHTML = async (req: Request, res: Response): Promise<void> => {
  try {
    const { content, title = 'document' } = req.body;
    if (!content) {
      res.status(400).json({ error: 'Markdown content is required' });
      return;
    }

    const html = await exportService.convertToHTML(content, title);
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', contentDispositionHeader(title, '.html'));
    res.send(html);
  } catch (error) {
    console.error('Error exporting to HTML:', error);
    res.status(500).json({ error: 'Failed to export to HTML' });
  }
};

export const exportToPDF = async (req: Request, res: Response): Promise<void> => {
  try {
    const { renderedHtml, title = 'document' } = req.body;
    if (!renderedHtml) {
      res.status(400).json({ error: 'Rendered HTML is required' });
      return;
    }
    const pdfBuffer = await exportService.convertToPDF(renderedHtml, title);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', contentDispositionHeader(title, '.pdf'));
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    res.status(500).json({ error: 'Failed to export to PDF' });
  }
};

export const exportToDocx = async (req: Request, res: Response): Promise<void> => {
  try {
    const { content, documentPath, title = 'document' } = req.body;
    if (!content) {
      res.status(400).json({ error: 'Markdown content is required' });
      return;
    }

    const buffer = await markdownToDocx(content, title, documentPath);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', contentDispositionHeader(title, '.docx'));
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting to DOCX:', error);
    res.status(500).json({ error: 'Failed to export to DOCX' });
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
    res.setHeader('Content-Disposition', contentDispositionHeader(title, '.zip'));
    res.send(zipBuffer);
  } catch (error) {
    console.error('Error exporting with images:', error);
    res.status(500).json({ error: 'Failed to export document with images' });
  }
};
