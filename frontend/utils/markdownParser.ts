// Utility functions to parse markdown and extract elements

export interface HeadingElement {
  line: number;
  level: number; // 1-6 for H1-H6
  text: string;
  raw: string;
}

export interface ImageElement {
  line: number;
  alt: string;
  url: string;
  raw: string;
}

export interface LinkElement {
  line: number;
  text: string;
  url: string;
  isExternal: boolean;
  raw: string;
}

export interface AlertElement {
  line: number;
  type: 'NOTE' | 'TIP' | 'IMPORTANT' | 'WARNING' | 'CAUTION';
  content: string;
  raw: string;
}

export interface FootnoteElement {
  line: number;
  id: string;
  definition?: string;
  raw: string;
}

export interface TableElement {
  line: number;
  header: string;
  rows: number;
  cols: number;
  raw: string;
}

export function parseHeadings(markdown: string): HeadingElement[] {
  const lines = markdown.split('\n');
  const headings: HeadingElement[] = [];

  lines.forEach((line, index) => {
    // Match ATX-style headings: # Heading
    const atxMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (atxMatch) {
      headings.push({
        line: index + 1,
        level: atxMatch[1].length,
        text: atxMatch[2].trim(),
        raw: line,
      });
    }
  });

  return headings;
}

export function parseImages(markdown: string): ImageElement[] {
  const lines = markdown.split('\n');
  const images: ImageElement[] = [];

  lines.forEach((line, index) => {
    // Create regex inside loop to reset lastIndex for each line
    const imageRegex = /!\[(.*?)\]\((.*?)\)/g;
    let match;
    while ((match = imageRegex.exec(line)) !== null) {
      images.push({
        line: index + 1,
        alt: match[1] || 'No alt text',
        url: match[2],
        raw: match[0],
      });
    }
  });

  return images;
}

export function parseLinks(markdown: string): LinkElement[] {
  const lines = markdown.split('\n');
  const links: LinkElement[] = [];

  lines.forEach((line, index) => {
    // Create regex inside loop to reset lastIndex for each line
    // Match links but not images (negative lookbehind for !)
    const linkRegex = /(?<!!)\[(.*?)\]\((.*?)\)/g;
    let match;
    while ((match = linkRegex.exec(line)) !== null) {
      const url = match[2];
      const isExternal = url.startsWith('http://') || url.startsWith('https://');

      links.push({
        line: index + 1,
        text: match[1] || 'No text',
        url: url,
        isExternal,
        raw: match[0],
      });
    }
  });

  return links;
}

export function parseAlerts(markdown: string): AlertElement[] {
  const lines = markdown.split('\n');
  const alerts: AlertElement[] = [];
  const alertTypes = ['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION'];

  lines.forEach((line, index) => {
    alertTypes.forEach(type => {
      if (line.includes(`[!${type}]`)) {
        // Get content from subsequent blockquote lines
        let content = '';
        let nextIndex = index + 1;

        // Collect content from following lines that start with >
        while (nextIndex < lines.length) {
          const nextLine = lines[nextIndex];
          // Check if line continues the blockquote
          if (nextLine.match(/^>\s*/)) {
            const lineContent = nextLine.replace(/^>\s*/, '').trim();
            // Stop if we hit another alert marker
            if (alertTypes.some(t => lineContent.includes(`[!${t}]`))) {
              break;
            }
            if (lineContent) {
              content += (content ? ' ' : '') + lineContent;
            }
            nextIndex++;
          } else {
            break;
          }
        }

        alerts.push({
          line: index + 1,
          type: type as AlertElement['type'],
          content: content || `${type} alert`,
          raw: line,
        });
      }
    });
  });

  return alerts;
}

export function parseFootnotes(markdown: string): FootnoteElement[] {
  const lines = markdown.split('\n');
  const footnoteMap = new Map<string, FootnoteElement>();

  // First pass: find all footnote references and definitions
  lines.forEach((line, index) => {
    // Match footnote references [^1] - create regex inside loop
    const refRegex = /\[\^(\w+)\]/g;
    let match;
    while ((match = refRegex.exec(line)) !== null) {
      const id = match[1];
      if (!footnoteMap.has(id)) {
        footnoteMap.set(id, {
          line: index + 1,
          id: id,
          raw: match[0],
        });
      }
    }

    // Match footnote definitions [^1]: text
    const defRegex = /^\[\^(\w+)\]:\s*(.+)/;
    const defMatch = line.match(defRegex);
    if (defMatch) {
      const id = defMatch[1];
      const definition = defMatch[2];
      if (footnoteMap.has(id)) {
        footnoteMap.get(id)!.definition = definition;
      } else {
        footnoteMap.set(id, {
          line: index + 1,
          id: id,
          definition: definition,
          raw: line,
        });
      }
    }
  });

  return Array.from(footnoteMap.values());
}

export function parseTables(markdown: string): TableElement[] {
  const lines = markdown.split('\n');
  const tables: TableElement[] = [];
  let inTable = false;
  let tableStart = -1;
  let tableRows = 0;
  let tableCols = 0;
  let tableHeader = '';

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Check if line is a table row
    if (trimmed.includes('|')) {
      if (!inTable) {
        // Start of a new table
        inTable = true;
        tableStart = index + 1;
        tableHeader = trimmed.replace(/^\||\|$/g, '').split('|')[0].trim();
        tableCols = trimmed.split('|').length - 1;
        tableRows = 1;
      } else {
        tableRows++;
      }
    } else if (inTable && trimmed === '') {
      // End of table (empty line)
      tables.push({
        line: tableStart,
        header: tableHeader || 'Table',
        rows: tableRows - 1, // Subtract separator row
        cols: tableCols,
        raw: `Table at line ${tableStart}`,
      });
      inTable = false;
    }
  });

  // Handle table at end of document
  if (inTable) {
    tables.push({
      line: tableStart,
      header: tableHeader || 'Table',
      rows: tableRows - 1,
      cols: tableCols,
      raw: `Table at line ${tableStart}`,
    });
  }

  return tables;
}

export interface MarkdownAssets {
  headings: HeadingElement[];
  images: ImageElement[];
  links: LinkElement[];
  alerts: AlertElement[];
  footnotes: FootnoteElement[];
  tables: TableElement[];
}

export function parseMarkdownAssets(markdown: string): MarkdownAssets {
  return {
    headings: parseHeadings(markdown),
    images: parseImages(markdown),
    links: parseLinks(markdown),
    alerts: parseAlerts(markdown),
    footnotes: parseFootnotes(markdown),
    tables: parseTables(markdown),
  };
}
