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
  BorderStyle,
  ShadingType,
  convertInchesToTwip,
  LevelFormat,
  FootnoteReferenceRun,
  HighlightColor,
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
      start: (src) => src.indexOf('[^'),
      tokenizer(src) {
        // Matches [^id]: text, consuming all continuation lines (indented by 4+ spaces)
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
  ],
});

// ──────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────

interface InlineRunOptions {
  bold?: boolean;
  italics?: boolean;
  strike?: boolean;
  superScript?: boolean;
  subScript?: boolean;
}

interface FootnoteEntry {
  id: number;
  text: string;
}

interface DocxContext {
  docDir?: string;
  footnotes: Map<string, FootnoteEntry>;
  /** Left indent (twips) and border applied when inside a regular blockquote */
  bqIndent?: number;
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
// Footnote extraction (pre-pass over block tokens)
// ──────────────────────────────────────────────────────────────────

function extractFootnotes(tokens: Token[]): Map<string, FootnoteEntry> {
  const map = new Map<string, FootnoteEntry>();
  let counter = 1;

  for (const token of tokens) {
    if (token.type === 'footnoteDef') {
      const t = token as unknown as { id: string; text: string };
      if (!map.has(t.id)) {
        map.set(t.id, { id: counter++, text: t.text });
      }
    }
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

async function loadImageBuffer(
  src: string,
  docDir?: string,
): Promise<{ data: Buffer; docxType: DocxImageType } | null> {
  try {
    const filePath = path.isAbsolute(src) ? src : docDir ? path.join(docDir, src) : null;
    if (!filePath) return null;

    const ext = path.extname(filePath).toLowerCase();
    const data = await fs.readFile(filePath);

    if (ext === '.webp' || ext === '.avif') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sharp: any = (await import('sharp' as any)).default;
        const pngData = await sharp(data).png().toBuffer();
        return { data: pngData, docxType: 'png' };
      } catch {
        return null;
      }
    }

    const typeMap: Record<string, DocxImageType> = {
      '.png': 'png', '.jpg': 'jpg', '.jpeg': 'jpg', '.gif': 'gif', '.bmp': 'bmp',
    };
    const docxType = typeMap[ext];
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

type InlineChild = TextRun | ExternalHyperlink | FootnoteReferenceRun;

function inlineToRuns(tokens: Token[], opts: InlineRunOptions, ctx: DocxContext): InlineChild[] {
  const result: InlineChild[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case 'text': {
        const t = token as Tokens.Text;
        if (t.tokens && t.tokens.length > 0) {
          result.push(...inlineToRuns(t.tokens, opts, ctx));
        } else {
          result.push(new TextRun({ text: t.text, ...opts }));
        }
        break;
      }
      case 'strong': {
        const t = token as Tokens.Strong;
        result.push(...inlineToRuns(t.tokens ?? [], { ...opts, bold: true }, ctx));
        break;
      }
      case 'em': {
        const t = token as Tokens.Em;
        result.push(...inlineToRuns(t.tokens ?? [], { ...opts, italics: true }, ctx));
        break;
      }
      case 'del': {
        const t = token as Tokens.Del;
        // Single tilde (~text~) → subscript; double tilde (~~text~~) → strikethrough
        if (t.raw.startsWith('~') && !t.raw.startsWith('~~')) {
          result.push(...inlineToRuns(t.tokens ?? [], { ...opts, subScript: true, strike: false }, ctx));
        } else {
          result.push(...inlineToRuns(t.tokens ?? [], { ...opts, strike: true }, ctx));
        }
        break;
      }
      case 'superscript': {
        const t = token as unknown as { text: string };
        result.push(new TextRun({ text: t.text, ...opts, superScript: true, subScript: false }));
        break;
      }
      case 'highlight': {
        const t = token as unknown as { text: string };
        result.push(new TextRun({ text: t.text, ...opts, highlight: HighlightColor.YELLOW }));
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
      case 'footnoteRef': {
        const t = token as unknown as { id: string };
        const fn = ctx.footnotes.get(t.id);
        if (fn) result.push(new FootnoteReferenceRun(fn.id));
        break;
      }
      case 'link': {
        const t = token as Tokens.Link;
        const innerRuns = inlineToRuns(
          t.tokens ?? [{ type: 'text', text: t.text, raw: t.text } as Token],
          opts,
          ctx,
        );
        const textRuns = innerRuns.filter((r): r is TextRun => r instanceof TextRun);
        if (textRuns.length > 0 && t.href) {
          result.push(new ExternalHyperlink({
            children: textRuns.map((r) => new TextRun({ ...r, style: 'Hyperlink' })),
            link: t.href,
          }));
        } else {
          result.push(new TextRun({ text: t.text || t.href, ...opts }));
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

async function listToElements(list: Tokens.List, ctx: DocxContext, depth: number): Promise<Paragraph[]> {
  const result: Paragraph[] = [];

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

    const runs = inlineToRuns(inlineTokens, {}, ctx);
    if (item.task) runs.unshift(new TextRun({ text: item.checked ? '\u2611 ' : '\u2610 ' }));

    result.push(list.ordered
      ? new Paragraph({ children: runs, numbering: { reference: 'ordered-list', level: depth } })
      : new Paragraph({ children: runs, bullet: { level: depth } }),
    );

    const nestedList = (item.tokens ?? []).find((t) => t.type === 'list') as Tokens.List | undefined;
    if (nestedList) result.push(...(await listToElements(nestedList, ctx, depth + 1)));
  }

  return result;
}

// ──────────────────────────────────────────────────────────────────
// Table processing
// ──────────────────────────────────────────────────────────────────

function tableToElement(t: Tokens.Table, ctx: DocxContext): Table {
  const colWidth = Math.floor(8640 / t.header.length);

  const headerRow = new TableRow({
    tableHeader: true,
    children: t.header.map((cell) => new TableCell({
      children: [new Paragraph({ children: inlineToRuns(cell.tokens ?? [], { bold: true }, ctx) })],
      shading: { type: ShadingType.CLEAR, fill: 'F4F4F4', color: 'auto' },
      width: { size: colWidth, type: WidthType.DXA },
    })),
  });

  const bodyRows = t.rows.map((row) => new TableRow({
    children: row.map((cell) => new TableCell({
      children: [new Paragraph({ children: inlineToRuns(cell.tokens ?? [], {}, ctx) })],
      width: { size: colWidth, type: WidthType.DXA },
    })),
  }));

  return new Table({ rows: [headerRow, ...bodyRows], width: { size: 8640, type: WidthType.DXA } });
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
      const runs = inlineToRuns(paraTokens, {}, ctx);
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
        elements.push(new Paragraph({
          heading: HEADING_MAP[t.depth] ?? HeadingLevel.HEADING_6,
          children: inlineToRuns(t.tokens ?? [], {}, ctx),
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
        // Single image → embed
        if (t.tokens?.length === 1 && t.tokens[0].type === 'image') {
          const imgToken = t.tokens[0] as Tokens.Image;
          const img = await loadImageBuffer(imgToken.href, ctx.docDir);
          if (img) {
            const dims = getImageDimensions(img.data, img.docxType);
            elements.push(new Paragraph({
              children: [new ImageRun({ data: img.data, transformation: { width: dims.width, height: dims.height }, type: img.docxType })],
              ...(bqLeft > 0 && { indent: { left: bqLeft } }),
            }));
            break;
          }
        }
        elements.push(new Paragraph({
          children: inlineToRuns(t.tokens ?? [], {}, ctx),
          ...(bqLeft > 0 && { indent: { left: bqLeft } }),
          ...bqBorder,
          spacing: { before: 80, after: 80 },
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
        elements.push(...(await listToElements(t, ctx, 0)));
        break;
      }

      case 'table': {
        const t = token as Tokens.Table;
        elements.push(tableToElement(t, ctx));
        break;
      }

      case 'hr':
        elements.push(new Paragraph({ children: [], thematicBreak: true }));
        break;

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
  const footnoteMap = extractFootnotes(tokens);
  const ctx: DocxContext = { docDir, footnotes: footnoteMap };
  const elements = await blockToElements(tokens, ctx);

  // Build footnotes record for Document
  const docxFootnotes: Record<string, { children: Paragraph[] }> = {};
  for (const [, entry] of footnoteMap) {
    docxFootnotes[String(entry.id)] = {
      children: [new Paragraph({ children: [new TextRun({ text: entry.text })] })],
    };
  }

  const doc = new Document({
    title,
    footnotes: Object.keys(docxFootnotes).length > 0 ? docxFootnotes : undefined,
    numbering: {
      config: [{
        reference: 'ordered-list',
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
      }],
    },
    sections: [{ properties: {}, children: elements }],
  });

  return Packer.toBuffer(doc);
}
