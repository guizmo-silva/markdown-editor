import path from 'path';
import sanitizeHtml from 'sanitize-html';

/**
 * Validates and sanitizes file paths to prevent path traversal attacks
 */
export const validatePath = async (
  relativePath: string,
  workspaceRoot: string
): Promise<string> => {
  // Treat "/" or empty string as workspace root
  let cleanPath = relativePath.trim();
  if (cleanPath === '/' || cleanPath === '') {
    cleanPath = '.';
  } else if (cleanPath.startsWith('/')) {
    // Remove leading slash to make it relative
    cleanPath = cleanPath.slice(1);
  }

  // Normalize the path to prevent path traversal
  const normalizedPath = path.normalize(cleanPath);

  // Prevent parent directory traversal
  if (normalizedPath.startsWith('..') || normalizedPath.includes('/..') || normalizedPath.includes('\\..')) {
    throw new Error('Invalid path: Path traversal detected');
  }

  // Resolve to absolute path within workspace
  const absolutePath = path.resolve(workspaceRoot, normalizedPath);

  // Ensure the resolved path is still within workspace root
  if (!absolutePath.startsWith(path.resolve(workspaceRoot))) {
    throw new Error('Invalid path: Path outside workspace');
  }

  return absolutePath;
};

/**
 * Sanitizes HTML content to prevent XSS attacks
 */
export const sanitizeHTML = (html: string): string => {
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'pre', 'code', 'span', 'div', 'table', 'thead', 'tbody',
      'tr', 'th', 'td', 'hr', 'br', 'del', 'sup', 'sub',
      'input', 'details', 'summary'
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      'img': ['src', 'alt', 'title', 'width', 'height'],
      'a': ['href', 'title', 'target', 'rel'],
      'code': ['class'],
      'span': ['class', 'style'],
      'div': ['class', 'style'],
      'pre': ['class'],
      'td': ['align', 'valign'],
      'th': ['align', 'valign'],
      'input': ['type', 'checked', 'disabled'],
      '*': ['id', 'class']
    },
    allowedSchemes: ['http', 'https', 'mailto', 'data'],
    allowedSchemesByTag: {
      img: ['http', 'https', 'data']
    },
    selfClosing: ['img', 'br', 'hr', 'input'],
    transformTags: {
      'a': (tagName, attribs) => {
        // Add security attributes to external links
        if (attribs.href && !attribs.href.startsWith('#') && !attribs.href.startsWith('/')) {
          return {
            tagName: 'a',
            attribs: {
              ...attribs,
              target: '_blank',
              rel: 'noopener noreferrer'
            }
          };
        }
        return { tagName, attribs };
      }
    }
  });
};
