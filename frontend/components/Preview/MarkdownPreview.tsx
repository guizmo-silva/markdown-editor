'use client';

import { useCallback } from 'react';
import type { RefObject, MouseEvent } from 'react';
import type { Root, RootContent } from 'mdast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkGemoji from 'remark-gemoji';
import remarkMath from 'remark-math';
import { remarkAlert } from 'remark-github-blockquote-alert';
import remarkFrontmatter from 'remark-frontmatter';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import PreviewInfoBar from './PreviewInfoBar';
import CodeBlock from './CodeBlock';
import { getImageUrl } from '@/services/api';
import './preview.css';
import './prism-theme.css';
import 'remark-github-blockquote-alert/alert.css';
import 'katex/dist/katex.min.css';

// Remark plugin that adds data-source-line attributes to block-level elements
// and data-source-offset / data-source-end-offset to block + inline elements.
// This enables line-based scroll synchronization and click-to-source navigation.
const blockTypes = new Set([
  'paragraph', 'heading', 'thematicBreak', 'blockquote',
  'list', 'listItem', 'table', 'code',
]);

const inlineTypes = new Set([
  'emphasis', 'strong', 'link', 'inlineCode', 'delete',
]);

function remarkSourceLines() {
  return (tree: Root) => {
    const walk = (node: Root | RootContent) => {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const isBlock = blockTypes.has(node.type);
      const isInline = inlineTypes.has(node.type);

      if (node.position && (isBlock || isInline)) {
        const n = node as any;
        if (!n.data) n.data = {};
        if (!n.data.hProperties) n.data.hProperties = {};
        if (isBlock && node.position.start?.line) {
          n.data.hProperties['data-source-line'] = node.position.start.line;
        }
        if (node.position.start?.offset != null) {
          n.data.hProperties['data-source-offset'] = node.position.start.offset;
        }
        if (node.position.end?.offset != null) {
          n.data.hProperties['data-source-end-offset'] = node.position.end.offset;
        }
      }
      /* eslint-enable @typescript-eslint/no-explicit-any */

      if ('children' in node && Array.isArray(node.children)) {
        node.children.forEach(walk);
      }
    };
    walk(tree);
  };
}

// Extend sanitize schema to allow alert elements, SVG icons, math elements, and footnotes
const sanitizeSchema = {
  ...defaultSchema,
  clobberPrefix: '', // Remove prefix to allow footnote navigation
  tagNames: [
    ...(defaultSchema.tagNames || []),
    'svg',
    'path',
    'section',
    'sup', // For footnote references
    // KaTeX math elements
    'math',
    'semantics',
    'mrow',
    'mi',
    'mo',
    'mn',
    'msup',
    'msub',
    'msubsup',
    'mfrac',
    'mover',
    'munder',
    'munderover',
    'msqrt',
    'mroot',
    'mtable',
    'mtr',
    'mtd',
    'mtext',
    'mspace',
    'annotation',
  ],
  attributes: {
    ...defaultSchema.attributes,
    '*': [
      ...(defaultSchema.attributes?.['*'] || []),
      'id', // Allow IDs for anchor navigation
      'dataSourceLine', // For scroll sync line mapping (rehype-raw normalizes to camelCase)
      'dataSourceOffset', // For click-to-source navigation
      'dataSourceEndOffset', // For click-to-source navigation
    ],
    a: [
      ...(defaultSchema.attributes?.a || []),
      'href',
      'data-footnote-ref',
      'data-footnote-backref',
      'aria-describedby',
      'aria-label',
    ],
    section: [
      'data-footnotes',
      ['className', /^footnotes$/],
    ],
    li: [
      ...(defaultSchema.attributes?.li || []),
      'id',
    ],
    sup: [
      ...(defaultSchema.attributes?.sup || []),
    ],
    div: [
      ...(defaultSchema.attributes?.div || []),
      ['className', /^markdown-alert/],
      'dir',
    ],
    p: [
      ...(defaultSchema.attributes?.p || []),
      ['className', /^markdown-alert-title$/],
      'dir',
    ],
    svg: ['className', 'viewBox', 'width', 'height', 'ariaHidden', 'fill'],
    path: ['d', 'fill'],
    // KaTeX uses spans with classes and styles
    span: ['className', 'style', 'aria-hidden'],
    // Math elements attributes
    math: ['xmlns', 'display'],
    annotation: ['encoding'],
  },
};

export interface PreviewClickInfo {
  word: string;
  blockStartOffset: number;
  blockEndOffset: number;
  inlineStartOffset?: number;
  inlineEndOffset?: number;
  wordOccurrenceIndex: number;
}

interface MarkdownPreviewProps {
  content: string;
  viewTheme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  previewScrollRef?: RefObject<HTMLDivElement | null>;
  isScrollSynced?: boolean;
  onToggleScrollSync?: () => void;
  onClickSourcePosition?: (info: PreviewClickInfo) => void;
  columnWidth?: number;
  onColumnWidthChange?: (value: number) => void;
  filePath?: string;
}

// Inline tag names that correspond to inlineTypes in the remark plugin
const inlineTagNames = new Set(['EM', 'STRONG', 'A', 'CODE', 'DEL']);

export default function MarkdownPreview({ content, viewTheme, onToggleTheme, previewScrollRef, isScrollSynced, onToggleScrollSync, onClickSourcePosition, columnWidth, onColumnWidthChange, filePath }: MarkdownPreviewProps) {
  const isDark = viewTheme === 'dark';

  // Theme-specific colors
  const textColor = isDark ? '#BEBEBE' : '#333333';

  // Compute the base path for resolving relative image srcs
  const imageBasePath = filePath ? filePath.substring(0, filePath.lastIndexOf('/')) : null;

  const handlePreviewClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (!onClickSourcePosition) return;

    // Use caretPositionFromPoint (standard) or caretRangeFromPoint (WebKit fallback)
    let textNode: Node | null = null;
    let textOffset = 0;

    /* eslint-disable @typescript-eslint/no-explicit-any */
    if ('caretPositionFromPoint' in document) {
      const pos = (document as any).caretPositionFromPoint(e.clientX, e.clientY);
      if (pos) {
        textNode = pos.offsetNode;
        textOffset = pos.offset;
      }
    } else if ('caretRangeFromPoint' in document) {
      const range = (document as any).caretRangeFromPoint(e.clientX, e.clientY);
      if (range) {
        textNode = range.startContainer;
        textOffset = range.startOffset;
      }
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */

    if (!textNode || textNode.nodeType !== Node.TEXT_NODE || !textNode.textContent) return;

    // Extract the word at the click point
    const text = textNode.textContent;
    const before = text.slice(0, textOffset);
    const after = text.slice(textOffset);
    const wordBefore = before.match(/[\p{L}\p{N}]+$/u)?.[0] ?? '';
    const wordAfter = after.match(/^[\p{L}\p{N}]+/u)?.[0] ?? '';
    const word = wordBefore + wordAfter;
    if (!word) return;

    // Walk up the DOM to find data-source-offset ancestors
    let inlineStartOffset: number | undefined;
    let inlineEndOffset: number | undefined;
    let blockStartOffset: number | undefined;
    let blockEndOffset: number | undefined;

    let el = textNode.parentElement;
    while (el && !el.classList?.contains('markdown-preview')) {
      const offsetAttr = el.getAttribute('data-source-offset');
      const endOffsetAttr = el.getAttribute('data-source-end-offset');

      if (offsetAttr != null && endOffsetAttr != null) {
        const startOff = parseInt(offsetAttr, 10);
        const endOff = parseInt(endOffsetAttr, 10);

        if (inlineTagNames.has(el.tagName) && inlineStartOffset === undefined) {
          inlineStartOffset = startOff;
          inlineEndOffset = endOff;
        }

        if (el.getAttribute('data-source-line') != null) {
          // This is a block-level element
          blockStartOffset = startOff;
          blockEndOffset = endOff;
          break;
        }
      }
      el = el.parentElement;
    }

    if (blockStartOffset === undefined || blockEndOffset === undefined) return;

    // Count which occurrence of the word in the block's rendered text was clicked
    let wordOccurrenceIndex = 0;
    if (el) {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let textBeforeWord = '';
      let currentNode: Node | null;
      const wordStartInTextNode = textOffset - wordBefore.length;

      while ((currentNode = walker.nextNode())) {
        if (currentNode === textNode) {
          textBeforeWord += (textNode.textContent ?? '').slice(0, Math.max(0, wordStartInTextNode));
          break;
        }
        textBeforeWord += currentNode.textContent ?? '';
      }

      let pos = 0;
      while (true) {
        const found = textBeforeWord.indexOf(word, pos);
        if (found === -1) break;
        wordOccurrenceIndex++;
        pos = found + word.length;
      }
    }

    onClickSourcePosition({
      word,
      blockStartOffset,
      blockEndOffset,
      inlineStartOffset,
      inlineEndOffset,
      wordOccurrenceIndex,
    });
  }, [onClickSourcePosition]);

  return (
    <div className={`h-full w-full flex flex-col preview-container ${isDark ? 'dark' : ''}`} style={{ backgroundColor: isDark ? '#121212' : '#FFFFFF' }}>
      {/* Preview content area */}
      <div ref={previewScrollRef} className="flex-1 overflow-auto p-8 pb-[calc(100vh-8rem)]">
        <div
          className={`markdown-preview${onClickSourcePosition ? ' clickable-source' : ''}`}
          style={{ fontFamily: 'var(--font-roboto-flex), sans-serif', color: textColor }}
          onClick={handlePreviewClick}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkGemoji, remarkMath, remarkAlert, remarkFrontmatter, remarkSourceLines]}
            rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema], rehypeKatex]}
            components={{
              code({ node, className, children, ...props }) {
                const isInline = !className && typeof children === 'string' && !children.includes('\n');

                if (isInline) {
                  return (
                    <code className="inline-code" {...props}>
                      {children}
                    </code>
                  );
                }

                return (
                  <CodeBlock className={className}>
                    {String(children).replace(/\n$/, '')}
                  </CodeBlock>
                );
              },
              pre({ children }) {
                // Just pass through children since CodeBlock handles the pre wrapper
                return <>{children}</>;
              },
              img({ src, alt, ...props }) {
                // Resolve relative image paths via the backend image endpoint
                const srcStr = typeof src === 'string' ? src : undefined;
                let resolvedSrc: string | undefined = srcStr;
                if (srcStr && imageBasePath && !/^https?:\/\//.test(srcStr) && !srcStr.startsWith('/')) {
                  resolvedSrc = getImageUrl(`${imageBasePath}/${srcStr}`);
                }
                // eslint-disable-next-line @next/next/no-img-element
                return <img src={resolvedSrc} alt={alt || ''} {...props} />;
              },
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>

      {/* Info Bar */}
      <PreviewInfoBar
        content={content}
        viewTheme={viewTheme}
        onToggleTheme={onToggleTheme}
        isScrollSynced={isScrollSynced}
        onToggleScrollSync={onToggleScrollSync}
        columnWidth={columnWidth}
        onColumnWidthChange={onColumnWidthChange}
      />
    </div>
  );
}
