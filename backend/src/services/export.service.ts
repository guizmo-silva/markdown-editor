import { marked } from 'marked';
import { markedEmoji } from 'marked-emoji';
import markedFootnote from 'marked-footnote';
import markedAlert from 'marked-alert';
import markedKatex from 'marked-katex-extension';
import archiver from 'archiver';
import fs from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { resolveVolumePath } from './volume.service.js';
import { validatePath } from '../utils/security.js';
import { SUPPORTED_IMAGE_EXTENSIONS } from '../utils/imageFormats.js';
import { PDF_CSS_VARS, PREVIEW_CSS, PRISM_CSS } from '../utils/pdfStyles.js';

// Emoji map for common GitHub-style emoji shortcodes
import { emojis } from './emojis.js';

// Configure marked with GFM (GitHub Flavored Markdown)
marked.setOptions({
  gfm: true,
  breaks: true,
});

// Add GFM alerts ([!NOTE], [!TIP], [!WARNING], etc.)
marked.use(markedAlert());

// Add footnote support
marked.use(markedFootnote());

// Add KaTeX math support ($$...$$  and $...$)
marked.use(markedKatex({ throwOnError: false, output: 'html' }));

// Add emoji support
marked.use(markedEmoji({
  emojis,
  renderer: (token: { emoji: string }) => token.emoji,
}));

export const convertToHTML = async (markdown: string, title: string = 'Markdown Export'): Promise<string> => {
  // Convert markdown to HTML using marked
  const contentHtml = injectImageCaptions(await marked.parse(markdown));

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHTML(title)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      color: #333;
    }
    h1, h2, h3, h4, h5, h6 {
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      font-weight: 600;
    }
    h1 { font-size: 2em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
    h3 { font-size: 1.25em; }
    p {
      margin: 1em 0;
    }
    pre {
      background: #f4f4f4;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 1rem;
      overflow-x: auto;
    }
    code {
      background: #f4f4f4;
      padding: 0.2rem 0.4rem;
      border-radius: 3px;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 0.9em;
    }
    pre code {
      background: none;
      padding: 0;
    }
    blockquote {
      border-left: 4px solid #ddd;
      margin: 1em 0;
      padding-left: 1rem;
      color: #666;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1rem 0;
    }
    table th, table td {
      border: 1px solid #ddd;
      padding: 0.5rem;
      text-align: left;
    }
    table th {
      background: #f4f4f4;
      font-weight: 600;
    }
    table tr:nth-child(even) {
      background: #f9f9f9;
    }
    ul, ol {
      margin: 1em 0;
      padding-left: 2em;
    }
    li {
      margin: 0.25em 0;
    }
    a {
      color: #0366d6;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    img {
      display: block;
      max-width: 100%;
      height: auto;
      margin: 24px auto;
    }
    figure.img-figure {
      margin: 24px 0;
      text-align: center;
    }
    figure.img-figure img {
      margin: 0 auto 8px;
    }
    figcaption {
      font-size: 0.85em;
      color: #555;
      font-style: italic;
    }
    hr {
      border: none;
      border-top: 1px solid #ddd;
      margin: 2em 0;
    }
    .task-list-item {
      list-style-type: none;
    }
    .task-list-item input {
      margin-right: 0.5em;
    }
    .footnotes {
      margin-top: 3em;
      padding-top: 1em;
      border-top: 1px solid #ddd;
      font-size: 0.9em;
      color: #555;
    }
    .footnotes ol { padding-left: 1.5em; }
    .footnotes li { margin: 0.5em 0; }
    /* GFM Alerts */
    .markdown-alert {
      padding: 0.75rem 1rem;
      margin: 1rem 0;
      border-left: 4px solid #888;
      border-radius: 0 4px 4px 0;
      background: #f6f8fa;
    }
    .markdown-alert-title {
      font-weight: 600;
      margin-bottom: 0.25rem;
    }
    .markdown-alert.markdown-alert-note   { border-color: #0969da; background: #ddf4ff; }
    .markdown-alert.markdown-alert-tip    { border-color: #1a7f37; background: #dafbe1; }
    .markdown-alert.markdown-alert-important { border-color: #8250df; background: #fbefff; }
    .markdown-alert.markdown-alert-warning { border-color: #9a6700; background: #fff8c5; }
    .markdown-alert.markdown-alert-caution { border-color: #cf222e; background: #ffebe9; }
  </style>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css">
</head>
<body>
  ${contentHtml}
</body>
</html>`;

  return html;
};

function escapeHTML(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Exports a document (possibly with images) as a zip archive.
 * documentPath: volume-prefixed path to the .md file, e.g. "workspace/artigos/doc/doc.md"
 * format: 'html' | 'md' | 'txt'
 * Returns a Buffer containing the zip.
 */
export const exportWithImages = async (
  documentPath: string,
  format: 'html' | 'md' | 'txt',
  title: string,
): Promise<Buffer> => {
  const { volume, relativePath: volRelativePath } = resolveVolumePath(documentPath);
  const safeMdPath = await validatePath(volRelativePath, volume.mountPath);
  const markdown = await fs.readFile(safeMdPath, 'utf-8');

  // Build exported document content
  let documentContent: string;
  let documentExt: string;
  if (format === 'html') {
    documentContent = await convertToHTML(markdown, title);
    documentExt = 'html';
  } else if (format === 'txt') {
    documentContent = markdown;
    documentExt = 'txt';
  } else {
    documentContent = markdown;
    documentExt = 'md';
  }

  const docFolder = path.dirname(safeMdPath);

  // Collect images from the same folder
  const siblings = await fs.readdir(docFolder, { withFileTypes: true });
  const imageFiles = siblings.filter(
    e => e.isFile() && SUPPORTED_IMAGE_EXTENSIONS.has(path.extname(e.name).toLowerCase())
  );

  // Build zip in memory
  const zip = archiver('zip', { zlib: { level: 6 } });
  const chunks: Buffer[] = [];

  await new Promise<void>((resolve, reject) => {
    zip.on('data', (chunk: Buffer) => chunks.push(chunk));
    zip.on('end', resolve);
    zip.on('error', reject);

    zip.append(Buffer.from(documentContent, 'utf-8'), { name: `${title}.${documentExt}` });

    for (const img of imageFiles) {
      zip.file(path.join(docFolder, img.name), { name: img.name });
    }

    zip.finalize();
  });

  return Buffer.concat(chunks);
};

/**
 * Wraps <img title="..."> elements in <figure class="img-figure"> + <figcaption>
 * so that the markdown image title (e.g. ![alt](url "caption")) is rendered
 * as a visible caption below the image in the PDF.
 * Chromium auto-corrects the invalid <figure> inside <p> by splitting the <p>,
 * which gives us the desired block layout: text paragraph → figure → caption.
 */
function injectImageCaptions(html: string): string {
  return html.replace(
    /<img\b([^>]*?\btitle="([^"]+)"[^>]*?)(?:\s*\/)?>/g,
    (_match, attrs, captionText) => {
      return `<figure class="img-figure"><img ${attrs}><figcaption>${captionText}</figcaption></figure>`;
    }
  );
}

/**
 * Converts <details>/<summary> elements to static equivalents for PDF export.
 * Since PDFs don't support interactivity, the accordion content would be hidden.
 * This replaces them with a styled <div>/<p> so all content is always visible.
 */
function expandDetailsForPDF(html: string): string {
  return html
    .replace(/<details[^>]*>/gi, '<div class="pdf-details">')
    .replace(/<\/details>/gi, '</div>')
    .replace(/<summary[^>]*>([\s\S]*?)<\/summary>/gi, '<p class="pdf-summary"><strong>$1</strong></p>');
}

function buildPDFHtml(renderedHtml: string, title: string): string {
  // Puppeteer runs inside the backend container, so relative image URLs
  // (e.g. /api/files/image?path=...) must resolve to localhost on the backend port.
  const backendPort = process.env.PORT || '3001';
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <base href="http://localhost:${backendPort}">
  <title>${escapeHTML(title)}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css">
  <style>
    :root { ${PDF_CSS_VARS} }
    @page { size: A4; margin: 2cm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px; line-height: 1.6; color: #24292e; background: #fff;
    }
    ${PREVIEW_CSS}
    ${PRISM_CSS}
    .pdf-details {
      border-left: 3px solid #ddd;
      padding-left: 1rem;
      margin: 0.75rem 0;
    }
    .pdf-summary {
      margin: 0 0 0.5rem 0;
    }
    @media print {
      pre { page-break-inside: avoid; }
      h1, h2, h3 { page-break-after: avoid; }
      table { page-break-inside: avoid; }
      .markdown-alert { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="markdown-preview">
    ${renderedHtml}
  </div>
</body>
</html>`;
}

// Singleton browser instance — reused across PDF exports to avoid spawning
// a new Chromium process on every request. Automatically recreated on disconnect.
let _browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

async function getBrowser() {
  if (_browser && _browser.connected) return _browser;
  const chromiumPath = process.env.CHROMIUM_PATH || '/usr/bin/chromium-browser';
  _browser = await puppeteer.launch({
    executablePath: chromiumPath,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    headless: true,
  });
  _browser.on('disconnected', () => { _browser = null; });
  return _browser;
}

export const convertToPDF = async (
  renderedHtml: string,
  title: string,
): Promise<Buffer> => {
  const html = buildPDFHtml(injectImageCaptions(expandDetailsForPDF(renderedHtml)), title);

  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    // Block requests to private/RFC1918 ranges to prevent SSRF.
    // data: and blob: URIs (inline images) are always allowed.
    // Localhost is allowed so the backend can serve its own API-hosted images.
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const url = req.url();
      if (url.startsWith('data:') || url.startsWith('blob:')) {
        req.continue();
        return;
      }
      try {
        const { hostname } = new URL(url);
        const isPrivate =
          /^10\./.test(hostname) ||
          /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
          /^192\.168\./.test(hostname);
        if (isPrivate) { req.abort('blockedbyclient'); return; }
      } catch { req.abort('blockedbyclient'); return; }
      req.continue();
    });

    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Wait for all images to fully load (networkidle0 alone is not enough when
    // images redirect or load in multiple steps — this causes layout shifts in
    // the PDF where images appear before their surrounding text).
    await page.evaluate(() =>
      Promise.all(
        Array.from(document.images)
          .filter(img => !img.complete)
          .map(img => new Promise<void>(resolve => {
            img.addEventListener('load', () => resolve());
            img.addEventListener('error', () => resolve());
          }))
      )
    );

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '2cm', right: '2cm', bottom: '2cm', left: '2cm' },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
  }
};
