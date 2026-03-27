import fs from 'fs/promises';
import path from 'path';
import { Marked, Token, Tokens } from 'marked';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ImageRun,
  ExternalHyperlink,
  InternalHyperlink,
  BookmarkStart,
  BookmarkEnd,
  BorderStyle,
  ShadingType,
  convertInchesToTwip,
  LevelFormat,
  FootnoteReferenceRun,
  HighlightColor,
  UnderlineType,
} from 'docx';
import katex from 'katex';
import { resolveVolumePath } from './volume.service.js';
import { validatePath } from '../utils/security.js';

// ──────────────────────────────────────────────────────────────────
// Custom Marked instance with extensions for DOCX
// ──────────────────────────────────────────────────────────────────

const docxMarked = new Marked();
docxMarked.setOptions({ gfm: true, breaks: true });

docxMarked.use({
  extensions: [
    // Block math: $$...$$  (must register before inline math)
    {
      name: 'blockMath',
      level: 'block',
      start: (src) => src.indexOf('$$'),
      tokenizer(src) {
        const match = /^\$\$\n?([\s\S]+?)\n?\$\$/.exec(src);
        if (match) return { type: 'blockMath', raw: match[0], formula: match[1].trim() };
        return undefined;
      },
      renderer() { return ''; },
    },
    // Inline math: $...$
    {
      name: 'inlineMath',
      level: 'inline',
      start: (src) => src.indexOf('$'),
      tokenizer(src) {
        if (src.startsWith('$$')) return undefined;
        const match = /^\$([^$\n]+?)\$/.exec(src);
        if (match) return { type: 'inlineMath', raw: match[0], formula: match[1] };
        return undefined;
      },
      renderer() { return ''; },
    },
    // Superscript: ^text^
    {
      name: 'superscript',
      level: 'inline',
      start: (src) => src.indexOf('^'),
      tokenizer(src) {
        const match = /^\^([^\^\n\s][^\^\n]*?)\^/.exec(src);
        if (match) return { type: 'superscript', raw: match[0], text: match[1] };
        return undefined;
      },
      renderer() { return ''; },
    },
    // Highlight: ==text==
    {
      name: 'highlight',
      level: 'inline',
      start: (src) => src.indexOf('=='),
      tokenizer(src) {
        const match = /^==([^=\n]+)==/.exec(src);
        if (match) return { type: 'highlight', raw: match[0], text: match[1] };
        return undefined;
      },
      renderer() { return ''; },
    },
    // Footnote definition block: [^id]: text (must be before footnoteRef)
    {
      name: 'footnoteDef',
      level: 'block',
      start: (src) => src.search(/\[\^[\w-]+\]:/),
      tokenizer(src) {
        const match = /^\[\^([\w-]+)\]:\s+([\s\S]+?)(?=\n\[\^|\n\n|\n$|$)/.exec(src);
        if (match) return { type: 'footnoteDef', raw: match[0], id: match[1], text: match[2].trim() };
        return undefined;
      },
      renderer() { return ''; },
    },
    // Footnote reference inline: [^id]
    {
      name: 'footnoteRef',
      level: 'inline',
      start: (src) => src.indexOf('[^'),
      tokenizer(src) {
        const match = /^\[\^([\w-]+)\]/.exec(src);
        if (match) return { type: 'footnoteRef', raw: match[0], id: match[1] };
        return undefined;
      },
      renderer() { return ''; },
    },
    // HTML superscript: <sup>text</sup>
    {
      name: 'htmlSup',
      level: 'inline',
      start: (src) => src.indexOf('<sup>'),
      tokenizer(src) {
        const match = /^<sup>([\s\S]*?)<\/sup>/.exec(src);
        if (match) return { type: 'htmlSup', raw: match[0], text: match[1] };
        return undefined;
      },
      renderer() { return ''; },
    },
    // HTML subscript: <sub>text</sub>
    {
      name: 'htmlSub',
      level: 'inline',
      start: (src) => src.indexOf('<sub>'),
      tokenizer(src) {
        const match = /^<sub>([\s\S]*?)<\/sub>/.exec(src);
        if (match) return { type: 'htmlSub', raw: match[0], text: match[1] };
        return undefined;
      },
      renderer() { return ''; },
    },
    // HTML abbreviation: <abbr title="...">text</abbr>
    {
      name: 'abbr',
      level: 'inline',
      start: (src) => src.indexOf('<abbr'),
      tokenizer(src) {
        const match = /^<abbr\s+title="([^"]*)">([\s\S]*?)<\/abbr>/.exec(src);
        if (match) return { type: 'abbr', raw: match[0], title: match[1], text: match[2] };
        return undefined;
      },
      renderer() { return ''; },
    },
    // HTML mark tag: <mark>text</mark>
    {
      name: 'mark',
      level: 'inline',
      start: (src) => src.indexOf('<mark>'),
      tokenizer(src) {
        const match = /^<mark>([\s\S]*?)<\/mark>/.exec(src);
        if (match) return { type: 'mark', raw: match[0], text: match[1] };
        return undefined;
      },
      renderer() { return ''; },
    },
    // Keyboard shortcut: <kbd>text</kbd>
    {
      name: 'kbd',
      level: 'inline',
      start: (src) => src.indexOf('<kbd>'),
      tokenizer(src) {
        const match = /^<kbd>([\s\S]*?)<\/kbd>/.exec(src);
        if (match) return { type: 'kbd', raw: match[0], text: match[1] };
        return undefined;
      },
      renderer() { return ''; },
    },
  ],
});

// ──────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────

interface HtmlTableCell {
  text: string;
  colspan: number;
  isHeader: boolean;
}

interface HtmlTableRow {
  cells: HtmlTableCell[];
  isHeader: boolean;
}

interface InlineRunOptions {
  bold?: boolean;
  italics?: boolean;
  strike?: boolean;
  superScript?: boolean;
  subScript?: boolean;
  style?: string;
}

interface DocxContext {
  docDir?: string;
  /** Maps markdown footnote id (e.g. "1", "nota-longa") → definition text */
  footnoteDefs: Map<string, string>;
  /** Accumulated docx footnote entries in reference order (each reference gets its own unique id) */
  docxFootnoteEntries: Array<{ id: number; children: Paragraph[] }>;
  /** Next docx footnote id to assign */
  nextFnId: number;
  /** Alignment override applied to text paragraphs (set when inside a <div align="..."> block) */
  alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
  /** Left indent (twips) and border applied when inside a regular blockquote */
  bqIndent?: number;
  /** Maps GitHub-style heading slug → bookmark numeric ID for internal hyperlinks */
  bookmarks: Map<string, number>;
  /** Shared counter for unique ordered-list numbering references (object so spreads share the same reference) */
  orderedListCounter: { value: number };
}

type DocxImageType = 'jpg' | 'png' | 'gif' | 'bmp';
type AlertType = 'NOTE' | 'TIP' | 'IMPORTANT' | 'WARNING' | 'CAUTION';

const ALERT_REGEX = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i;

const ALERT_COLORS: Record<AlertType, string> = {
  NOTE: 'DBE8FF',
  TIP: 'DCFCE7',
  IMPORTANT: 'F3E8FF',
  WARNING: 'FEF9C3',
  CAUTION: 'FEE2E2',
};

const ALERT_LABELS: Record<AlertType, string> = {
  NOTE: '\uD83D\uDCDD Note',
  TIP: '\uD83D\uDCA1 Tip',
  IMPORTANT: '\u2757 Important',
  WARNING: '\u26A0\uFE0F Warning',
  CAUTION: '\uD83D\uDD34 Caution',
};

// ──────────────────────────────────────────────────────────────────
const orderedListRef = (idx: number) => `ordered-list-${idx}`;

// ──────────────────────────────────────────────────────────────────
// Footnote extraction (pre-pass over block tokens)
// ──────────────────────────────────────────────────────────────────

function extractFootnoteDefs(tokens: Token[]): Map<string, string> {
  const map = new Map<string, string>();

  for (const token of tokens) {
    if (token.type === 'footnoteDef') {
      const t = token as unknown as { id: string; text: string };
      if (!map.has(t.id)) {
        map.set(t.id, t.text);
      }
    }
  }

  return map;
}

// ──────────────────────────────────────────────────────────────────
// Heading bookmark helpers (GitHub-style slugs for anchor links)
// ──────────────────────────────────────────────────────────────────

function tokenToPlainText(tokens: Token[]): string {
  return tokens.map((t) => {
    if ('tokens' in t && Array.isArray((t as { tokens?: Token[] }).tokens)) {
      return tokenToPlainText((t as { tokens: Token[] }).tokens);
    }
    if ('text' in t && typeof (t as { text: string }).text === 'string') {
      return (t as { text: string }).text;
    }
    return '';
  }).join('');
}

/** Converts heading text to a GitHub-style anchor slug. */
function githubSlugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
}

/** Walks top-level and blockquote tokens to collect all headings. */
function extractHeadings(tokens: Token[]): Tokens.Heading[] {
  const result: Tokens.Heading[] = [];
  for (const token of tokens) {
    if (token.type === 'heading') result.push(token as Tokens.Heading);
    else if (token.type === 'blockquote') {
      result.push(...extractHeadings((token as Tokens.Blockquote).tokens ?? []));
    }
  }
  return result;
}

/**
 * Builds a slug → bookmark-ID map for all headings in the document.
 * Duplicate slugs get a numeric suffix (-1, -2, …) matching GitHub behaviour.
 */
function buildBookmarkMap(tokens: Token[]): Map<string, number> {
  const map = new Map<string, number>();
  const slugCount = new Map<string, number>();
  let id = 1;

  for (const heading of extractHeadings(tokens)) {
    const text = heading.tokens ? tokenToPlainText(heading.tokens as Token[]) : heading.text;
    const base = githubSlugify(text);
    const count = slugCount.get(base) ?? 0;
    slugCount.set(base, count + 1);
    const slug = count === 0 ? base : `${base}-${count}`;
    map.set(slug, id++);
  }

  return map;
}

// ──────────────────────────────────────────────────────────────────
// Math rendering: KaTeX MathML → plain text extraction
// ──────────────────────────────────────────────────────────────────

function renderMathAsText(formula: string): string {
  try {
    const ml = katex.renderToString(formula, { output: 'mathml', throwOnError: false });
    const text = ml
      .replace(/<annotation[^>]*>[\s\S]*?<\/annotation>/g, '') // remove raw LaTeX annotation
      .replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, '\u00a0')
      .trim();
    return text || formula;
  } catch {
    return formula;
  }
}

// ──────────────────────────────────────────────────────────────────
// Image loading and dimensions
// ──────────────────────────────────────────────────────────────────

const DOCX_TYPE_MAP: Record<string, DocxImageType> = {
  '.png': 'png', '.jpg': 'jpg', '.jpeg': 'jpg', '.gif': 'gif', '.bmp': 'bmp',
};

const MIME_TO_DOCX: Record<string, DocxImageType | 'svg' | 'webp'> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/bmp': 'bmp',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

async function rasterize(data: Buffer): Promise<Buffer | null> {
  // Try @resvg/resvg-js first (pure native, works on Alpine, good for SVG)
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { Resvg } = await import('@resvg/resvg-js' as any);
    const resvg = new Resvg(data, { fitTo: { mode: 'width', value: 800 } });
    return Buffer.from(resvg.render().asPng());
  } catch { /* fall through */ }
  // Fallback: sharp (handles webp/avif/other raster formats)
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sharp: any = (await import('sharp' as any)).default;
    return await sharp(data).png().toBuffer();
  } catch {
    return null;
  }
}

async function loadImageBuffer(
  src: string,
  docDir?: string,
): Promise<{ data: Buffer; docxType: DocxImageType } | null> {
  try {
    // ── Remote URL ────────────────────────────────────────────────
    if (src.startsWith('http://') || src.startsWith('https://')) {
      const res = await fetch(src);
      if (!res.ok) return null;
      const raw = Buffer.from(await res.arrayBuffer());

      const mime = (res.headers.get('content-type') ?? '').split(';')[0].trim();
      const extFromUrl = path.extname(new URL(src).pathname).toLowerCase();

      const typeFromMime = MIME_TO_DOCX[mime];
      const typeFromExt = DOCX_TYPE_MAP[extFromUrl];
      const resolved = typeFromMime ?? typeFromExt;

      if (!resolved) return null;
      if (resolved === 'png' || resolved === 'jpg' || resolved === 'gif' || resolved === 'bmp') {
        return { data: raw, docxType: resolved };
      }
      // webp or svg → convert to PNG via sharp
      const png = await rasterize(raw);
      return png ? { data: png, docxType: 'png' } : null;
    }

    // ── Local file ────────────────────────────────────────────────
    const filePath = path.isAbsolute(src) ? src : docDir ? path.join(docDir, src) : null;
    if (!filePath) return null;

    const ext = path.extname(filePath).toLowerCase();
    const data = await fs.readFile(filePath);

    if (ext === '.webp' || ext === '.avif' || ext === '.svg') {
      const png = await rasterize(data);
      return png ? { data: png, docxType: 'png' } : null;
    }

    const docxType = DOCX_TYPE_MAP[ext];
    if (!docxType) return null;
    return { data, docxType };
  } catch {
    return null;
  }
}

function getImageDimensions(data: Buffer, docxType: DocxImageType): { width: number; height: number } {
  try {
    if (docxType === 'png') {
      const w = data.readUInt32BE(16);
      const h = data.readUInt32BE(20);
      if (w > 0 && h > 0) return scaleImage(w, h);
    } else if (docxType === 'jpg') {
      let offset = 2;
      while (offset < data.length - 8) {
        const marker = data.readUInt16BE(offset);
        offset += 2;
        if (marker === 0xffc0 || marker === 0xffc1 || marker === 0xffc2) {
          const h = data.readUInt16BE(offset + 3);
          const w = data.readUInt16BE(offset + 5);
          if (w > 0 && h > 0) return scaleImage(w, h);
          break;
        }
        if (offset + 1 >= data.length) break;
        const segLen = data.readUInt16BE(offset);
        if (segLen < 2) break;
        offset += segLen;
      }
    }
  } catch { /* fall through */ }
  return { width: 400, height: 300 };
}

function scaleImage(w: number, h: number): { width: number; height: number } {
  const ratio = Math.min(500 / w, 650 / h, 1);
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}

// ──────────────────────────────────────────────────────────────────
// Inline tokens → TextRun / ExternalHyperlink / FootnoteReferenceRun
// ──────────────────────────────────────────────────────────────────

type InlineChild = TextRun | ExternalHyperlink | InternalHyperlink | ImageRun | FootnoteReferenceRun;

async function inlineToRuns(tokens: Token[], opts: InlineRunOptions, ctx: DocxContext): Promise<InlineChild[]> {
  const result: InlineChild[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case 'text': {
        const t = token as Tokens.Text;
        if (t.tokens && t.tokens.length > 0) {
          result.push(...(await inlineToRuns(t.tokens, opts, ctx)));
        } else {
          result.push(new TextRun({ text: t.text, ...opts }));
        }
        break;
      }
      case 'strong': {
        const t = token as Tokens.Strong;
        result.push(...(await inlineToRuns(t.tokens ?? [], { ...opts, bold: true }, ctx)));
        break;
      }
      case 'em': {
        const t = token as Tokens.Em;
        result.push(...(await inlineToRuns(t.tokens ?? [], { ...opts, italics: true }, ctx)));
        break;
      }
      case 'del': {
        const t = token as Tokens.Del;
        // Single tilde (~text~) → subscript; double tilde (~~text~~) → strikethrough
        if (t.raw.startsWith('~') && !t.raw.startsWith('~~')) {
          result.push(...(await inlineToRuns(t.tokens ?? [], { ...opts, subScript: true, strike: false }, ctx)));
        } else {
          result.push(...(await inlineToRuns(t.tokens ?? [], { ...opts, strike: true }, ctx)));
        }
        break;
      }
      case 'superscript':
      case 'htmlSup': {
        const t = token as unknown as { text: string };
        result.push(new TextRun({ text: t.text, ...opts, superScript: true, subScript: false }));
        break;
      }
      case 'htmlSub': {
        const t = token as unknown as { text: string };
        result.push(new TextRun({ text: t.text, ...opts, subScript: true, superScript: false }));
        break;
      }
      case 'highlight':
      case 'mark': {
        const t = token as unknown as { text: string };
        result.push(new TextRun({ text: t.text, ...opts, highlight: HighlightColor.YELLOW }));
        break;
      }
      case 'abbr': {
        const t = token as unknown as { text: string; title: string };
        result.push(new TextRun({
          text: t.text,
          ...opts,
          underline: { type: UnderlineType.DOTTED, color: 'auto' },
        }));
        if (t.title) {
          result.push(new TextRun({ text: ` (${t.title})`, ...opts }));
        }
        break;
      }
      case 'inlineMath': {
        const t = token as unknown as { formula: string };
        result.push(new TextRun({
          text: renderMathAsText(t.formula),
          font: 'Cambria Math',
          italics: true,
        }));
        break;
      }
      case 'codespan': {
        const t = token as Tokens.Codespan;
        result.push(new TextRun({
          text: t.text,
          font: 'Courier New',
          size: 18,
          shading: { type: ShadingType.CLEAR, fill: 'F4F4F4', color: 'auto' },
        }));
        break;
      }
      case 'kbd': {
        const t = token as unknown as { text: string };
        result.push(new TextRun({
          text: t.text,
          font: 'Courier New',
          size: 18,
          shading: { type: ShadingType.CLEAR, fill: 'EFEFEF', color: 'auto' },
          border: { style: BorderStyle.SINGLE, size: 4, space: 1, color: 'AAAAAA' },
        }));
        break;
      }
      case 'image': {
        const t = token as Tokens.Image;
        const img = await loadImageBuffer(t.href, ctx.docDir);
        if (img) {
          const dims = getImageDimensions(img.data, img.docxType);
          result.push(new ImageRun({ data: img.data, transformation: { width: dims.width, height: dims.height }, type: img.docxType }));
        } else if (t.text) {
          result.push(new TextRun({ text: t.text, ...opts }));
        }
        break;
      }
      case 'footnoteRef': {
        const t = token as unknown as { id: string };
        const text = ctx.footnoteDefs.get(t.id);
        if (text !== undefined) {
          const id = ctx.nextFnId++;
          const fnBlockTokens = docxMarked.lexer(text);
          const fnInlineTokens = (fnBlockTokens[0] as Tokens.Paragraph)?.tokens ?? [];
          const fnRuns = fnInlineTokens.length > 0
            ? await inlineToRuns(fnInlineTokens, {}, ctx)
            : [new TextRun({ text })];
          ctx.docxFootnoteEntries.push({ id, children: [new Paragraph({ children: fnRuns })] });
          result.push(new FootnoteReferenceRun(id));
        }
        break;
      }
      case 'link': {
        const t = token as Tokens.Link;
        if (!t.href) {
          result.push(new TextRun({ text: t.text || '', ...opts }));
          break;
        }
        const linkTokens = t.tokens ?? [{ type: 'text', text: t.text, raw: t.text } as Token];
        const innerRuns = await inlineToRuns(linkTokens, { ...opts, style: 'Hyperlink' }, ctx);
        const textRuns = innerRuns.filter((r): r is TextRun => r instanceof TextRun);
        if (t.href.startsWith('#')) {
          const slug = t.href.slice(1);
          const bookmarkId = ctx.bookmarks.get(slug);
          if (bookmarkId !== undefined && textRuns.length > 0) {
            result.push(new InternalHyperlink({ children: textRuns, anchor: slug }));
          } else {
            result.push(...(textRuns.length > 0 ? textRuns : [new TextRun({ text: t.text || '', ...opts })]));
          }
        } else if (textRuns.length > 0) {
          result.push(new ExternalHyperlink({ children: textRuns, link: t.href }));
        } else if (innerRuns.length > 0) {
          // Inner content is non-text (e.g. ImageRun) — embed directly; docx can't wrap images in hyperlinks
          result.push(...innerRuns);
        } else {
          // Last resort: use alt text from a nested image token if t.text is raw markdown
          const imgAlt = ((t.tokens ?? []).find((tok) => tok.type === 'image') as Tokens.Image | undefined)?.text;
          const fallback = imgAlt || t.href;
          result.push(new TextRun({ text: fallback, ...opts }));
        }
        break;
      }
      case 'br':
        result.push(new TextRun({ break: 1 }));
        break;
      case 'escape':
      case 'html': {
        const t = token as { text: string };
        result.push(new TextRun({ text: t.text, ...opts }));
        break;
      }
      default:
        if ('text' in token && typeof token.text === 'string') {
          result.push(new TextRun({ text: token.text, ...opts }));
        }
        break;
    }
  }

  return result;
}

// ──────────────────────────────────────────────────────────────────
// List processing
// ──────────────────────────────────────────────────────────────────

async function listToElements(list: Tokens.List, ctx: DocxContext, depth: number, listRef?: string): Promise<Paragraph[]> {
  const result: Paragraph[] = [];
  const ref = listRef ?? orderedListRef(0);

  for (const item of list.items) {
    const inlineTokens: Token[] = [];
    for (const t of item.tokens ?? []) {
      if (t.type === 'list') continue;
      if (t.type === 'paragraph' && 'tokens' in t) {
        inlineTokens.push(...((t as Tokens.Paragraph).tokens ?? []));
      } else if (t.type === 'text' && 'tokens' in t && Array.isArray((t as Tokens.Text).tokens)) {
        inlineTokens.push(...((t as Tokens.Text).tokens ?? []));
      } else {
        inlineTokens.push(t);
      }
    }

    const runs = await inlineToRuns(inlineTokens, {}, ctx);
    if (item.task) runs.unshift(new TextRun({ text: item.checked ? '\u2611 ' : '\u2610 ' }));

    result.push(list.ordered
      ? new Paragraph({ children: runs, numbering: { reference: ref, level: depth } })
      : new Paragraph({ children: runs, bullet: { level: depth } }),
    );

    const nestedList = (item.tokens ?? []).find((t) => t.type === 'list') as Tokens.List | undefined;
    // Nested sub-lists share the same ref (same numbering instance, different level)
    if (nestedList) result.push(...(await listToElements(nestedList, ctx, depth + 1, ref)));
  }

  return result;
}

// ──────────────────────────────────────────────────────────────────
// Table processing
// ──────────────────────────────────────────────────────────────────

async function tableToElement(t: Tokens.Table, ctx: DocxContext): Promise<Table> {
  const colWidth = Math.floor(8640 / t.header.length);

  const headerCells = await Promise.all(t.header.map(async (cell) => new TableCell({
    children: [new Paragraph({ children: await inlineToRuns(cell.tokens ?? [], { bold: true }, ctx) })],
    shading: { type: ShadingType.CLEAR, fill: 'F4F4F4', color: 'auto' },
    width: { size: colWidth, type: WidthType.DXA },
  })));

  const bodyRows = await Promise.all(t.rows.map(async (row) => new TableRow({
    children: await Promise.all(row.map(async (cell) => new TableCell({
      children: [new Paragraph({ children: await inlineToRuns(cell.tokens ?? [], {}, ctx) })],
      width: { size: colWidth, type: WidthType.DXA },
    }))),
  })));

  return new Table({ rows: [new TableRow({ tableHeader: true, children: headerCells }), ...bodyRows], width: { size: 8640, type: WidthType.DXA } });
}

// ──────────────────────────────────────────────────────────────────
// Blockquote / Alert processing
// ──────────────────────────────────────────────────────────────────

async function blockquoteToElements(t: Tokens.Blockquote, ctx: DocxContext): Promise<(Paragraph | Table)[]> {
  const elements: (Paragraph | Table)[] = [];

  const firstPara = t.tokens?.find((tok) => tok.type === 'paragraph') as Tokens.Paragraph | undefined;
  const alertMatch = (firstPara?.text ?? '').match(ALERT_REGEX);

  if (alertMatch) {
    const alertType = alertMatch[1].toUpperCase() as AlertType;
    const fillColor = ALERT_COLORS[alertType];
    const bc = 'AAAAAA';

    elements.push(new Paragraph({
      children: [new TextRun({ text: ALERT_LABELS[alertType], bold: true, size: 22 })],
      shading: { type: ShadingType.CLEAR, fill: fillColor, color: 'auto' },
      spacing: { before: 100, after: 60 },
      indent: { left: convertInchesToTwip(0.2), right: convertInchesToTwip(0.2) },
      border: {
        top: { style: BorderStyle.SINGLE, size: 4, color: bc },
        left: { style: BorderStyle.SINGLE, size: 4, color: bc },
        right: { style: BorderStyle.SINGLE, size: 4, color: bc },
      },
    }));

    for (const blockToken of t.tokens ?? []) {
      if (blockToken.type !== 'paragraph') continue;
      const para = blockToken as Tokens.Paragraph;
      let paraTokens = para.tokens ?? [];
      if (para === firstPara) {
        let startIdx = 0;
        if (paraTokens[0]?.type === 'text' && (paraTokens[0] as Tokens.Text).text.match(ALERT_REGEX)) {
          startIdx = 1;
          if (paraTokens[startIdx]?.type === 'br') startIdx = 2;
        }
        paraTokens = paraTokens.slice(startIdx);
      }
      const runs = await inlineToRuns(paraTokens, {}, ctx);
      if (runs.length === 0) continue;
      elements.push(new Paragraph({
        children: runs,
        shading: { type: ShadingType.CLEAR, fill: fillColor, color: 'auto' },
        spacing: { before: 0, after: 0 },
        indent: { left: convertInchesToTwip(0.2), right: convertInchesToTwip(0.2) },
        border: {
          left: { style: BorderStyle.SINGLE, size: 4, color: bc },
          right: { style: BorderStyle.SINGLE, size: 4, color: bc },
        },
      }));
    }

    elements.push(new Paragraph({
      children: [],
      shading: { type: ShadingType.CLEAR, fill: fillColor, color: 'auto' },
      spacing: { before: 0, after: 100 },
      indent: { left: convertInchesToTwip(0.2), right: convertInchesToTwip(0.2) },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 4, color: bc },
        left: { style: BorderStyle.SINGLE, size: 4, color: bc },
        right: { style: BorderStyle.SINGLE, size: 4, color: bc },
      },
    }));
  } else {
    // Regular blockquote: recurse into all inner block tokens with increased indent
    const innerCtx: DocxContext = {
      ...ctx,
      bqIndent: (ctx.bqIndent ?? 0) + convertInchesToTwip(0.5),
    };
    elements.push(...(await blockToElements(t.tokens ?? [], innerCtx)));
  }

  return elements;
}

// ──────────────────────────────────────────────────────────────────
// Block tokens → docx elements
// ──────────────────────────────────────────────────────────────────

const HEADING_MAP: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
  5: HeadingLevel.HEADING_5,
  6: HeadingLevel.HEADING_6,
};

async function blockToElements(tokens: Token[], ctx: DocxContext): Promise<(Paragraph | Table)[]> {
  const elements: (Paragraph | Table)[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case 'heading': {
        const t = token as Tokens.Heading;
        const bqLeft = ctx.bqIndent ?? 0;
        const headingText = t.tokens ? tokenToPlainText(t.tokens as Token[]) : t.text;
        const headingSlug = githubSlugify(headingText);
        const bookmarkId = ctx.bookmarks.get(headingSlug);
        const inlineRuns = await inlineToRuns(t.tokens ?? [], {}, ctx);
        const children = bookmarkId !== undefined
          ? [new BookmarkStart(headingSlug, bookmarkId), ...inlineRuns, new BookmarkEnd(bookmarkId)]
          : inlineRuns;
        elements.push(new Paragraph({
          heading: HEADING_MAP[t.depth] ?? HeadingLevel.HEADING_6,
          children,
          ...(bqLeft > 0 && { indent: { left: bqLeft } }),
        }));
        break;
      }

      case 'paragraph': {
        const t = token as Tokens.Paragraph;
        const bqLeft = ctx.bqIndent ?? 0;
        const bqBorder = bqLeft > 0
          ? { border: { left: { style: BorderStyle.THICK, size: 12, color: 'DDDDDD', space: 4 } } }
          : {};
        // If the paragraph contains any image tokens, split into separate block elements
        // so images can be centred and captions rendered as distinct paragraphs.
        const paraTokens = t.tokens ?? [];
        if (paraTokens.some((tok) => tok.type === 'image')) {
          let textBuf: Token[] = [];

          const flushText = async () => {
            // strip leading/trailing br tokens
            while (textBuf.length && textBuf[0].type === 'br') textBuf.shift();
            while (textBuf.length && textBuf[textBuf.length - 1].type === 'br') textBuf.pop();
            if (textBuf.length === 0) return;
            const runs = await inlineToRuns(textBuf, {}, ctx);
            if (runs.length > 0) {
              elements.push(new Paragraph({
                children: runs,
                ...(bqLeft > 0 && { indent: { left: bqLeft } }),
                ...bqBorder,
                spacing: { before: 80, after: 80 },
                ...(ctx.alignment && { alignment: ctx.alignment }),
              }));
            }
            textBuf = [];
          };

          for (const tok of paraTokens) {
            if (tok.type === 'image') {
              await flushText();
              const imgToken = tok as Tokens.Image;
              const img = await loadImageBuffer(imgToken.href, ctx.docDir);
              if (img) {
                const dims = getImageDimensions(img.data, img.docxType);
                elements.push(new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new ImageRun({ data: img.data, transformation: { width: dims.width, height: dims.height }, type: img.docxType })],
                  ...(bqLeft > 0 && { indent: { left: bqLeft } }),
                }));
                if (imgToken.title) {
                  elements.push(new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: imgToken.title, italics: true, size: 18, color: '555555' })],
                    spacing: { before: 40, after: 120 },
                  }));
                }
              } else if (imgToken.text) {
                textBuf.push({ type: 'text', text: imgToken.text, raw: imgToken.text } as Token);
              }
            } else {
              textBuf.push(tok);
            }
          }
          await flushText();
          break;
        }
        elements.push(new Paragraph({
          children: await inlineToRuns(paraTokens, {}, ctx),
          ...(bqLeft > 0 && { indent: { left: bqLeft } }),
          ...bqBorder,
          spacing: { before: 80, after: 80 },
          ...(ctx.alignment && { alignment: ctx.alignment }),
        }));
        break;
      }

      case 'code': {
        const t = token as Tokens.Code;
        const bqLeft = ctx.bqIndent ?? 0;
        const codeRuns: TextRun[] = [];
        t.text.split('\n').forEach((line, i) => {
          if (i > 0) codeRuns.push(new TextRun({ break: 1 }));
          codeRuns.push(new TextRun({ text: line, font: 'Courier New', size: 18 }));
        });
        elements.push(new Paragraph({
          children: codeRuns,
          shading: { type: ShadingType.CLEAR, fill: 'F4F4F4', color: 'auto' },
          indent: { left: convertInchesToTwip(0.25) + bqLeft, right: convertInchesToTwip(0.25) },
          spacing: { before: 120, after: 120 },
          border: {
            top: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' },
            left: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' },
            right: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' },
          },
        }));
        break;
      }

      case 'blockMath': {
        const t = token as unknown as { formula: string };
        const mathText = renderMathAsText(t.formula);
        const mathRuns: TextRun[] = [];
        mathText.split('\n').forEach((line, i) => {
          if (i > 0) mathRuns.push(new TextRun({ break: 1 }));
          mathRuns.push(new TextRun({ text: line, font: 'Cambria Math', italics: true, size: 22 }));
        });
        elements.push(new Paragraph({
          children: mathRuns,
          alignment: AlignmentType.CENTER,
          spacing: { before: 120, after: 120 },
        }));
        break;
      }

      case 'blockquote': {
        const t = token as Tokens.Blockquote;
        elements.push(...(await blockquoteToElements(t, ctx)));
        break;
      }

      case 'list': {
        const t = token as Tokens.List;
        const ref = t.ordered ? orderedListRef(ctx.orderedListCounter.value++) : undefined;
        elements.push(...(await listToElements(t, ctx, 0, ref)));
        break;
      }

      case 'table': {
        const t = token as Tokens.Table;
        elements.push(await tableToElement(t, ctx));
        break;
      }

      case 'hr':
        elements.push(new Paragraph({ children: [], thematicBreak: true }));
        break;

      case 'html': {
        const t = token as { text: string };
        const html = t.text.trim();

        const ALIGN_MAP: Record<string, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
          center: AlignmentType.CENTER, left: AlignmentType.LEFT,
          right: AlignmentType.RIGHT, justify: AlignmentType.JUSTIFIED,
        };

        // ── <pre> ──────────────────────────────────────────────────
        const preM = /^<pre(?:\s[^>]*)?>(\s[\s\S]*?)<\/pre>$/i.exec(html);
        if (preM) {
          const lines = preM[1].replace(/^\n/, '').replace(/\n$/, '').split('\n');
          const codeRuns: TextRun[] = [];
          lines.forEach((line, i) => {
            if (i > 0) codeRuns.push(new TextRun({ break: 1 }));
            codeRuns.push(new TextRun({ text: line, font: 'Courier New', size: 18 }));
          });
          elements.push(new Paragraph({
            children: codeRuns,
            shading: { type: ShadingType.CLEAR, fill: 'F4F4F4', color: 'auto' },
            indent: { left: convertInchesToTwip(0.25), right: convertInchesToTwip(0.25) },
            spacing: { before: 120, after: 120 },
            border: {
              top: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' },
              left: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' },
              right: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' },
            },
          }));
          break;
        }

        // ── <dl> ──────────────────────────────────────────────────
        // marked splits <dl> at blank lines, so we match dt/dd from any html
        // token that contains them (complete block or partial fragment).
        if (/<dt[\s>]|<dd[\s>]|^<dl[\s>]/i.test(html)) {
          const itemRe = /<(dt|dd)(?:\s[^>]*)?>([\s\S]*?)<\/(dt|dd)>/gi;
          let m: RegExpExecArray | null;
          let found = false;
          while ((m = itemRe.exec(html)) !== null) {
            found = true;
            const type = m[1].toLowerCase() as 'dt' | 'dd';
            const text = m[2].trim();
            const bold = type === 'dt';
            const inlineToks = (docxMarked.lexer(text)[0] as Tokens.Paragraph)?.tokens ?? [];
            const runs = inlineToks.length > 0
              ? await inlineToRuns(inlineToks, { bold }, ctx)
              : [new TextRun({ text, bold })];
            if (type === 'dt') {
              elements.push(new Paragraph({ children: runs, spacing: { before: 160, after: 0 } }));
            } else {
              elements.push(new Paragraph({
                children: runs,
                indent: { left: convertInchesToTwip(0.5) },
                spacing: { before: 0, after: 80 },
              }));
            }
          }
          if (found) break;
        }

        // ── <table> ───────────────────────────────────────────────
        const tableM = /^<table(?:\s[^>]*)?>(\s[\s\S]*?)<\/table>$/i.exec(html);
        if (tableM) {
          const parseRows = (rowsHtml: string, forceHeader: boolean): HtmlTableRow[] => {
            const rows: HtmlTableRow[] = [];
            const rowRe = /<tr(?:\s[^>]*)?>([\s\S]*?)<\/tr>/gi;
            let rowM: RegExpExecArray | null;
            while ((rowM = rowRe.exec(rowsHtml)) !== null) {
              const cells: HtmlTableCell[] = [];
              const cellRe = /<(th|td)((?:\s[^>]*)?)>([\s\S]*?)<\/(th|td)>/gi;
              let cellM: RegExpExecArray | null;
              while ((cellM = cellRe.exec(rowM[1])) !== null) {
                const colspanM = /colspan="?(\d+)"?/i.exec(cellM[2]);
                cells.push({
                  text: cellM[3].trim(),
                  colspan: colspanM ? parseInt(colspanM[1], 10) : 1,
                  isHeader: forceHeader || cellM[1].toLowerCase() === 'th',
                });
              }
              if (cells.length > 0) {
                rows.push({ cells, isHeader: forceHeader || cells.every((c) => c.isHeader) });
              }
            }
            return rows;
          };
          const content = tableM[1];
          const tableRows: HtmlTableRow[] = [];
          const theadM = /<thead(?:\s[^>]*)?>([\s\S]*?)<\/thead>/i.exec(content);
          if (theadM) tableRows.push(...parseRows(theadM[1], true));
          const tbodyM = /<tbody(?:\s[^>]*)?>([\s\S]*?)<\/tbody>/i.exec(content);
          const bodyHtml = tbodyM
            ? tbodyM[1]
            : content.replace(/<t(?:head|foot)(?:\s[^>]*)?>[\s\S]*?<\/t(?:head|foot)>/gi, '');
          tableRows.push(...parseRows(bodyHtml, false));

          const totalCols = tableRows.reduce((max, row) =>
            Math.max(max, row.cells.reduce((s, c) => s + c.colspan, 0)), 1);
          const colWidth = Math.floor(8640 / totalCols);
          const docxRows = await Promise.all(tableRows.map(async (row) => {
            const docxCells = await Promise.all(row.cells.map(async (cell) => {
              const inlineToks = (docxMarked.lexer(cell.text)[0] as Tokens.Paragraph)?.tokens ?? [];
              const runs = inlineToks.length > 0
                ? await inlineToRuns(inlineToks, { bold: cell.isHeader }, ctx)
                : [new TextRun({ text: cell.text, bold: cell.isHeader })];
              return new TableCell({
                children: [new Paragraph({ children: runs })],
                columnSpan: cell.colspan > 1 ? cell.colspan : undefined,
                width: { size: colWidth * cell.colspan, type: WidthType.DXA },
                ...(cell.isHeader && { shading: { type: ShadingType.CLEAR, fill: 'F4F4F4', color: 'auto' } }),
              });
            }));
            return new TableRow({ children: docxCells, tableHeader: row.isHeader });
          }));
          elements.push(new Table({ rows: docxRows, width: { size: 8640, type: WidthType.DXA } }));
          break;
        }

        // ── <div align> ───────────────────────────────────────────
        // Complete block (no blank lines inside): handle inline
        const divFullM = /^<div\s+align="(center|left|right|justify)">([\s\S]*)<\/div>$/i.exec(html);
        if (divFullM) {
          const innerCtx: DocxContext = { ...ctx, alignment: ALIGN_MAP[divFullM[1].toLowerCase()] };
          elements.push(...(await blockToElements(docxMarked.lexer(divFullM[2].trim()), innerCtx)));
          break;
        }
        // Opening tag only (blank lines inside — stateful approach)
        const divOpenM = /^<div\s+align="(center|left|right|justify)">\s*$/i.exec(html);
        if (divOpenM) { ctx.alignment = ALIGN_MAP[divOpenM[1].toLowerCase()]; break; }
        // Closing tag
        if (/^<\/div>\s*$/i.test(html)) { ctx.alignment = undefined; break; }

        break;
      }

      case 'space':
      case 'def':
        // Skip: whitespace and link/footnote definition tokens
        break;

      default:
        break;
    }
  }

  return elements;
}

// ──────────────────────────────────────────────────────────────────
// Main export function
// ──────────────────────────────────────────────────────────────────

export async function markdownToDocx(
  markdown: string,
  title: string,
  documentPath?: string,
): Promise<Buffer> {
  let docDir: string | undefined;
  if (documentPath) {
    try {
      const { volume, relativePath } = resolveVolumePath(documentPath);
      const safePath = await validatePath(relativePath, volume.mountPath);
      docDir = path.dirname(safePath);
    } catch { /* Non-fatal: images won't be embedded */ }
  }

  const tokens = docxMarked.lexer(markdown);
  const footnoteDefs = extractFootnoteDefs(tokens);
  const bookmarkMap = buildBookmarkMap(tokens);
  const ctx: DocxContext = { docDir, footnoteDefs, docxFootnoteEntries: [], nextFnId: 1, bookmarks: bookmarkMap, orderedListCounter: { value: 0 } };
  const elements = await blockToElements(tokens, ctx);

  // Build footnotes record for Document from entries accumulated during processing
  const docxFootnotes: Record<string, { children: Paragraph[] }> = {};
  for (const entry of ctx.docxFootnoteEntries) {
    docxFootnotes[String(entry.id)] = { children: entry.children };
  }

  const doc = new Document({
    title,
    footnotes: ctx.docxFootnoteEntries.length > 0 ? docxFootnotes : undefined,
    numbering: {
      config: Array.from({ length: Math.max(ctx.orderedListCounter.value, 1) }, (_, idx) => ({
        reference: orderedListRef(idx),
        levels: Array.from({ length: 9 }, (_, level) => ({
          level,
          format: LevelFormat.DECIMAL,
          text: `%${level + 1}.`,
          alignment: AlignmentType.LEFT,
          style: {
            paragraph: {
              indent: {
                left: convertInchesToTwip(0.5 + level * 0.25),
                hanging: convertInchesToTwip(0.25),
              },
            },
          },
        })),
      })),
    },
    sections: [{ properties: {}, children: elements }],
  });

  return Packer.toBuffer(doc);
}
