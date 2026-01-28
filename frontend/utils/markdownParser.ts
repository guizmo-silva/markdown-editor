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

export interface QuoteElement {
  line: number;
  content: string;
  raw: string;
}

export interface OrderedListElement {
  line: number;
  items: string[];
  raw: string;
}

export interface UnorderedListElement {
  line: number;
  items: string[];
  raw: string;
}

export interface CodeBlockElement {
  line: number;
  language: string;
  content: string;
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
      return;
    }

    // Match Setext-style headings:
    // H1: Text followed by a line of === (at least 1)
    // H2: Text followed by a line of --- (at least 3)
    if (index > 0) {
      const prevLine = lines[index - 1];
      const prevLineTrimmed = prevLine.trim();

      // Check if current line is a setext underline
      // H1: line of only = characters (at least 1)
      const isH1Underline = /^=+\s*$/.test(line);
      // H2: line of only - characters (at least 3)
      const isH2Underline = /^-{3,}\s*$/.test(line);

      if ((isH1Underline || isH2Underline) && prevLineTrimmed.length > 0) {
        // Make sure the previous line is not empty and not a special markdown element
        // (not starting with #, >, -, *, |, etc.)
        const isValidTextLine = !prevLineTrimmed.match(/^(#{1,6}\s|>\s*|[-*+]\s|\d+\.\s|\|)/);

        if (isValidTextLine) {
          headings.push({
            line: index, // Line number of the text (1-indexed, so index is correct since prev line is index-1+1=index)
            level: isH1Underline ? 1 : 2,
            text: prevLineTrimmed,
            raw: prevLine + '\n' + line,
          });
        }
      }
    }
  });

  // Sort by line number since setext headings might be detected out of order
  headings.sort((a, b) => a.line - b.line);

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

export function parseQuotes(markdown: string): QuoteElement[] {
  const lines = markdown.split('\n');
  const quotes: QuoteElement[] = [];
  const alertTypes = ['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION'];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // Match blockquotes that start with > (but not GitHub alerts)
    if (line.match(/^>\s*/)) {
      // Check if this is a GitHub alert (skip it)
      const isAlert = alertTypes.some(type => line.includes(`[!${type}]`));
      if (isAlert) {
        // Skip the alert marker line and all its content lines
        i++;
        while (i < lines.length && lines[i].match(/^>\s*/)) {
          const lineContent = lines[i].replace(/^>\s*/, '').trim();
          // Stop if we hit a new alert marker at the top level (will be handled by outer loop)
          if (alertTypes.some(type => lineContent.startsWith(`[!${type}]`))) {
            break;
          }
          i++;
        }
        continue;
      }

      const startLine = i + 1;
      let content = '';
      let raw = '';

      // Collect all consecutive blockquote lines
      while (i < lines.length && lines[i].match(/^>\s*/)) {
        const lineContent = lines[i].replace(/^>\s*/, '').trim();
        // Stop if we hit an alert marker
        if (alertTypes.some(type => lineContent.includes(`[!${type}]`))) {
          break;
        }
        if (lineContent) {
          content += (content ? ' ' : '') + lineContent;
        }
        raw += (raw ? '\n' : '') + lines[i];
        i++;
      }

      if (content) {
        quotes.push({
          line: startLine,
          content,
          raw,
        });
      }
      continue;
    }
    i++;
  }

  return quotes;
}

export function parseOrderedLists(markdown: string): OrderedListElement[] {
  const lines = markdown.split('\n');
  const lists: OrderedListElement[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // Match ordered list items: 1. item, 2. item, etc.
    if (line.match(/^\s*\d+\.\s+/)) {
      const startLine = i + 1;
      const items: string[] = [];
      let raw = '';

      // Collect all consecutive ordered list items
      while (i < lines.length && lines[i].match(/^\s*\d+\.\s+/)) {
        const itemText = lines[i].replace(/^\s*\d+\.\s+/, '').trim();
        items.push(itemText);
        raw += (raw ? '\n' : '') + lines[i];
        i++;
      }

      if (items.length > 0) {
        lists.push({
          line: startLine,
          items,
          raw,
        });
      }
      continue;
    }
    i++;
  }

  return lists;
}

export function parseUnorderedLists(markdown: string): UnorderedListElement[] {
  const lines = markdown.split('\n');
  const lists: UnorderedListElement[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // Match unordered list items: - item, * item, + item
    if (line.match(/^\s*[-*+]\s+/)) {
      const startLine = i + 1;
      const items: string[] = [];
      let raw = '';

      // Collect all consecutive unordered list items
      while (i < lines.length && lines[i].match(/^\s*[-*+]\s+/)) {
        const itemText = lines[i].replace(/^\s*[-*+]\s+/, '').trim();
        items.push(itemText);
        raw += (raw ? '\n' : '') + lines[i];
        i++;
      }

      if (items.length > 0) {
        lists.push({
          line: startLine,
          items,
          raw,
        });
      }
      continue;
    }
    i++;
  }

  return lists;
}

export function parseCodeBlocks(markdown: string): CodeBlockElement[] {
  const lines = markdown.split('\n');
  const codeBlocks: CodeBlockElement[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // Match code block start: ```language or ```
    const codeBlockStart = line.match(/^```(\w*)/);
    if (codeBlockStart) {
      const startLine = i + 1;
      const language = codeBlockStart[1] || 'plain';
      let content = '';
      let raw = line;
      i++;

      // Collect content until closing ```
      while (i < lines.length && !lines[i].match(/^```\s*$/)) {
        content += (content ? '\n' : '') + lines[i];
        raw += '\n' + lines[i];
        i++;
      }

      // Include closing ```
      if (i < lines.length) {
        raw += '\n' + lines[i];
      }

      codeBlocks.push({
        line: startLine,
        language,
        content,
        raw,
      });
    }
    i++;
  }

  return codeBlocks;
}

export interface MarkdownAssets {
  headings: HeadingElement[];
  images: ImageElement[];
  links: LinkElement[];
  alerts: AlertElement[];
  footnotes: FootnoteElement[];
  tables: TableElement[];
  quotes: QuoteElement[];
  orderedLists: OrderedListElement[];
  unorderedLists: UnorderedListElement[];
  codeBlocks: CodeBlockElement[];
}

export function parseMarkdownAssets(markdown: string): MarkdownAssets {
  return {
    headings: parseHeadings(markdown),
    images: parseImages(markdown),
    links: parseLinks(markdown),
    alerts: parseAlerts(markdown),
    footnotes: parseFootnotes(markdown),
    tables: parseTables(markdown),
    quotes: parseQuotes(markdown),
    orderedLists: parseOrderedLists(markdown),
    unorderedLists: parseUnorderedLists(markdown),
    codeBlocks: parseCodeBlocks(markdown),
  };
}
