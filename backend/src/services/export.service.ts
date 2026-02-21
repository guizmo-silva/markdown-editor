import { marked } from 'marked';
import { markedEmoji } from 'marked-emoji';
import archiver from 'archiver';
import fs from 'fs/promises';
import path from 'path';
import { resolveVolumePath } from './volume.service.js';
import { validatePath } from '../utils/security.js';
import { SUPPORTED_IMAGE_EXTENSIONS } from '../utils/imageFormats.js';

// Emoji map for common GitHub-style emoji shortcodes
import { emojis } from './emojis.js';

// Configure marked with GFM (GitHub Flavored Markdown)
marked.setOptions({
  gfm: true,
  breaks: true,
});

// Add emoji support
marked.use(markedEmoji({
  emojis,
  renderer: (token: { emoji: string }) => token.emoji,
}));

export const convertToHTML = async (markdown: string, title: string = 'Markdown Export'): Promise<string> => {
  // Convert markdown to HTML using marked
  const contentHtml = await marked.parse(markdown);

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
      max-width: 100%;
      height: auto;
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
  </style>
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
