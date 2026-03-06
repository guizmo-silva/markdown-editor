import mammoth from 'mammoth';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

export interface DocxConvertResult {
  markdown: string;
  images: Array<{ name: string; buffer: Buffer; mimeType: string }>;
}

/** Unicode PUA marker injected into blockquote paragraphs for post-processing. */
const BQ_MARKER = '\uE001';

// Mammoth style map — NOTE: no spaces around '=' (mammoth parser rejects them)
const STYLE_MAP = [
  // Highlight: set via transformDocument + this mapping
  "r[style-name='highlight-run'] => mark",
  // Blockquotes — PT-BR and EN style names
  "p[style-name='Quote'] => blockquote > p",
  "p[style-name='Intense Quote'] => blockquote > p",
  "p[style-name='Citação'] => blockquote > p",
  "p[style-name='Citação Intensa'] => blockquote > p",
  "p[style-name='Block Text'] => blockquote > p",
  "p[style-name='Block Quotation'] => blockquote > p",
  // Code — paragraph styles
  "p[style-name='Code'] => pre > code",
  "p[style-name='Verbatim'] => pre > code",
  "p[style-name='Código'] => pre > code",
  "p[style-name='Preformatted Text'] => pre > code",
  "p[style-name='HTML Preformatted'] => pre > code",
  // Code — inline/character styles
  "r[style-name='Code Char'] => code",
  "r[style-name='Verbatim Char'] => code",
  "r[style-name='HTML Code'] => code",
];

/**
 * Mammoth transformDocument:
 * 1. Marks highlighted runs with a custom styleName so the style map entry
 *    `r[style-name='highlight-run'] => mark` can match them.
 * 2. Injects a BQ_MARKER run at the start of indented paragraphs (≥ 400 twips)
 *    so `fixBlockquotes` can wrap them in <blockquote> after HTML generation.
 * Object.create preserves mammoth's internal prototype — required for matching.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformDocument(element: any): any {
  const withChildren = element.children
    ? { ...element, children: element.children.map(transformDocument) }
    : element;

  // Highlight: tag run so style map can map it to <mark>
  if (element.type === 'run' && element.highlight) {
    return Object.assign(
      Object.create(Object.getPrototypeOf(element)),
      withChildren,
      { styleName: 'highlight-run' },
    );
  }

  // Blockquote: inject marker run into indented paragraphs (editor uses 720 twips = 0.5 in)
  if (
    element.type === 'paragraph' &&
    element.indent?.start != null &&
    parseInt(String(element.indent.start), 10) >= 400
  ) {
    const markerRun = Object.assign(Object.create(Object.getPrototypeOf(element)), {
      type: 'run',
      value: BQ_MARKER,
      children: [],
      styleName: undefined,
    });
    return Object.assign(Object.create(Object.getPrototypeOf(element)), withChildren, {
      children: [markerRun, ...(withChildren.children ?? [])],
    });
  }

  return withChildren;
}

/**
 * The gfm turndown plugin only converts tables that have a proper heading row
 * (<th> cells). Mammoth generates all cells as <td> by default and omits <tbody>.
 * This promotes the first row to <th> inside <thead> so gfm can process it.
 */
function fixTableHeaders(html: string): string {
  return html.replace(
    /<table([^>]*)>(\s*<tbody[^>]*>)?\s*<tr([^>]*)>([\s\S]*?)<\/tr>/gi,
    (match, ta, tbody, tr, cells) => {
      if (!/<td[\s>]/i.test(cells)) return match; // already has <th>
      const fixedCells = cells
        .replace(/<td(\s|>)/gi, '<th$1')
        .replace(/<\/td>/gi, '</th>');
      return `<table${ta}><thead><tr${tr}>${fixedCells}</tr></thead>${tbody ?? ''}`;
    },
  );
}

/**
 * Mammoth wraps every table cell's content in <p> tags, which creates blank
 * lines inside cells and breaks GFM table formatting. Strip them.
 */
function stripCellParagraphs(html: string): string {
  return html.replace(/<(td|th)([^>]*)>([\s\S]*?)<\/\1>/gi, (_m, tag, attrs, content) => {
    const stripped = content
      .replace(/<\/p>\s*<p[^>]*>/gi, '<br>')  // paragraph break → <br>
      .replace(/<\/?p[^>]*>/gi, '')            // remove remaining <p>/<p>
      .trim();
    return `<${tag}${attrs}>${stripped}</${tag}>`;
  });
}

/**
 * Post-process HTML: wrap paragraphs containing BQ_MARKER into <blockquote>.
 * Consecutive blockquotes are kept separate so turndown emits `> line\n> line`.
 */
function fixBlockquotes(html: string): string {
  return html.replace(
    /<p([^>]*)>\s*\uE001([\s\S]*?)<\/p>/g,
    (_match, attrs, content) => `<blockquote${attrs}>${content.trim()}</blockquote>`,
  );
}

/**
 * Post-process final Markdown to convert Unicode checkbox characters
 * (mammoth keeps them as-is when list items use them) to GFM task list syntax.
 */
function fixCheckboxes(md: string): string {
  md = md.replace(/^([ \t]*-[ \t]+)(?:☑|✅|✓|☒) /gmu, '$1[x] ');
  md = md.replace(/^([ \t]*-[ \t]+)(?:☐|□|⬜|🔲) /gmu, '$1[ ] ');
  md = md.replace(/^(?:☑|✅|✓|☒) (.+)$/gmu, '- [x] $1');
  md = md.replace(/^(?:☐|□|⬜|🔲) (.+)$/gmu, '- [ ] $1');
  return md;
}

/** True if a <sup> node is a mammoth footnote/endnote reference link. */
function isNoteRef(node: HTMLElement): boolean {
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i] as HTMLElement;
    if (child.nodeName === 'A') {
      const href = child.getAttribute?.('href') ?? '';
      if (href.startsWith('#footnote-') || href.startsWith('#endnote-')) return true;
    }
  }
  return false;
}

/** True if an <ol> is a mammoth footnote/endnote definitions list. */
function isNoteList(node: HTMLElement): boolean {
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i] as HTMLElement;
    if (child.nodeName === 'LI') {
      const id = child.getAttribute?.('id') ?? '';
      return id.startsWith('footnote-') || id.startsWith('endnote-');
    }
  }
  return false;
}

export async function docxToMarkdown(buffer: Buffer): Promise<DocxConvertResult> {
  const images: DocxConvertResult['images'] = [];
  let imageCounter = 0;

  const result = await mammoth.convertToHtml(
    { buffer },
    {
      styleMap: STYLE_MAP,
      transformDocument: transformDocument,
      convertImage: mammoth.images.imgElement(async (image) => {
        const imgBuffer = Buffer.from(await image.read());
        const ext = image.contentType.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
        const name = `image_${++imageCounter}.${ext}`;
        images.push({ name, buffer: imgBuffer, mimeType: image.contentType });
        return { src: name };
      }),
    },
  );

  // Preprocess HTML: fix blockquotes, tables before handing off to turndown
  const html = fixTableHeaders(stripCellParagraphs(fixBlockquotes(result.value)));

  const td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    hr: '---',
  });
  td.use(gfm);

  // Keep <u> (underline) as raw HTML — no standard markdown equivalent
  td.keep(['u']);

  // Highlight: <mark> → ==text==  (rendered by rehypeMark in the preview)
  td.addRule('mark', {
    filter: 'mark',
    replacement: (content) => `==${content}==`,
  });

  // Hard line break — two trailing spaces; space inside table cells
  td.addRule('lineBreak', {
    filter: 'br',
    replacement: (_content, node) => {
      let parent = node.parentNode as HTMLElement | null;
      while (parent) {
        if (parent.nodeName === 'TD' || parent.nodeName === 'TH') return ' ';
        parent = parent.parentNode as HTMLElement | null;
      }
      return '  \n';
    },
  });

  // Subscript → ~text~  (rendered by remark-supersub)
  td.addRule('subscript', {
    filter: 'sub',
    replacement: (content) => `~${content}~`,
  });

  // Superscript → ^text^  (lower priority; footnoteRef overrides it for note refs)
  td.addRule('superscript', {
    filter: (node) => node.nodeName === 'SUP' && !isNoteRef(node),
    replacement: (content) => `^${content}^`,
  });

  // Footnote/endnote in-text reference → [^N]  (added after superscript → higher priority)
  td.addRule('footnoteRef', {
    filter: (node) => node.nodeName === 'SUP' && isNoteRef(node),
    replacement: (_content, node) => {
      for (let i = 0; i < node.childNodes.length; i++) {
        const child = node.childNodes[i] as HTMLElement;
        if (child.nodeName === 'A') {
          const href = child.getAttribute?.('href') ?? '';
          const num = href.replace(/^#(?:footnote|endnote)-/, '');
          return `[^${num}]`;
        }
      }
      return _content;
    },
  });

  // Individual footnote/endnote list item → [^N]: content
  td.addRule('footnoteItem', {
    filter: (node) => {
      if (node.nodeName !== 'LI') return false;
      const id = node.getAttribute?.('id') ?? '';
      return id.startsWith('footnote-') || id.startsWith('endnote-');
    },
    replacement: (content, node) => {
      const id = node.getAttribute?.('id') ?? '';
      const num = id.replace(/^(?:footnote|endnote)-/, '');
      const text = content.replace(/\s*\[↑\]\([^)]*\)\s*$/, '').trim();
      return `[^${num}]: ${text}\n`;
    },
  });

  // Footnote/endnote list container — suppress default <ol>, wrap processed items
  td.addRule('footnoteList', {
    filter: (node) => node.nodeName === 'OL' && isNoteList(node),
    replacement: (content) => '\n\n' + content.trim() + '\n\n',
  });

  let markdown = td.turndown(html);
  markdown = fixCheckboxes(markdown);

  return { markdown, images };
}
