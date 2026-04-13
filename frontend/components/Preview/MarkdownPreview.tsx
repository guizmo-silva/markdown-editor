'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { RefObject, MouseEvent } from 'react';
import type { Root, RootContent } from 'mdast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkGemoji from 'remark-gemoji';
import remarkMath from 'remark-math';
import { remarkAlert } from 'remark-github-blockquote-alert';
import remarkFrontmatter from 'remark-frontmatter';
import remarkSupersub from 'remark-supersub';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeSlug from 'rehype-slug';
import PreviewInfoBar from './PreviewInfoBar';
import CodeBlock from './CodeBlock';
import { getImageUrl } from '@/services/api';
import './preview.css';
import './prism-theme.css';
import 'remark-github-blockquote-alert/alert.css';
import 'katex/dist/katex.min.css';

// Rehype plugin: converts ==text== to <mark>text</mark> in the hast tree,
// skipping code/pre blocks to avoid affecting code content.
import { visit } from 'unist-util-visit';
import type { Root as HastRoot, Text as HastText, Element, Parents } from 'hast';

function rehypeMark() {
  return (tree: HastRoot) => {
    visit(tree, 'text', (node: HastText, index: number | undefined, parent: Parents | undefined) => {
      if (index == null || !parent) return;
      if ('tagName' in parent && (parent.tagName === 'code' || parent.tagName === 'pre')) return;
      const pattern = /==(.+?)==/g;
      if (!pattern.test(node.value)) return;
      pattern.lastIndex = 0;
      const parts: (HastText | Element)[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(node.value)) !== null) {
        if (match.index > lastIndex) {
          parts.push({ type: 'text', value: node.value.slice(lastIndex, match.index) });
        }
        parts.push({ type: 'element', tagName: 'mark', properties: {}, children: [{ type: 'text', value: match[1] }] });
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < node.value.length) {
        parts.push({ type: 'text', value: node.value.slice(lastIndex) });
      }
      (parent.children as (HastText | Element)[]).splice(index, 1, ...parts);
    });
  };
}

// Remark plugin that adds data-source-line attributes to block-level elements
// and data-source-offset / data-source-end-offset to block + inline elements.
// This enables line-based scroll synchronization and click-to-source navigation.
const blockTypes = new Set([
  'paragraph', 'heading', 'thematicBreak', 'blockquote',
  'list', 'listItem', 'table', 'code', 'math',
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
    'mark',
    'svg',
    'path',
    'section',
    'sup', // For footnote references and superscript
    'sub', // For subscript
    'abbr', // For abbreviations with title tooltip
    'kbd', // For keyboard key display
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
      'target',
      'rel',
      'data-footnote-ref',
      'data-footnote-backref',
      'aria-describedby',
      'aria-label',
    ],
    img: [
      ...(defaultSchema.attributes?.img || []),
      'style', // Allow inline styles (e.g. height/width on Ko-fi banners)
    ],
    section: [
      'dataFootnotes', // rehype-raw normalizes data-* to camelCase; kebab would be stripped
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

export const PREVIEW_ZOOM_LEVELS = [70, 80, 90, 100, 110, 120, 130, 140, 150];
export const PREVIEW_DEFAULT_ZOOM = 100;

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
  imageRevision?: number;
  hideInfoBar?: boolean;
  previewZoom?: number;
  onPreviewZoomIn?: () => void;
  onPreviewZoomOut?: () => void;
  onPreviewZoomReset?: () => void;
}

// Inline tag names that correspond to inlineTypes in the remark plugin
const inlineTagNames = new Set(['EM', 'STRONG', 'A', 'CODE', 'DEL']);

function MarkdownPreview({ content, viewTheme, onToggleTheme, previewScrollRef, isScrollSynced, onToggleScrollSync, onClickSourcePosition, columnWidth, onColumnWidthChange, filePath, imageRevision, hideInfoBar, previewZoom: previewZoomProp, onPreviewZoomIn: onPreviewZoomInProp, onPreviewZoomOut: onPreviewZoomOutProp, onPreviewZoomReset: onPreviewZoomResetProp }: MarkdownPreviewProps) {
  const { t } = useTranslation();
  const isDark = viewTheme === 'dark';

  // Theme-specific colors
  const textColor = isDark ? '#BEBEBE' : '#333333';

  const [internalPreviewZoom, setInternalPreviewZoom] = useState(PREVIEW_DEFAULT_ZOOM);

  const handleInternalPreviewZoomIn = useCallback(() => {
    setInternalPreviewZoom(prev => {
      const idx = PREVIEW_ZOOM_LEVELS.indexOf(prev);
      return idx < PREVIEW_ZOOM_LEVELS.length - 1 ? PREVIEW_ZOOM_LEVELS[idx + 1] : prev;
    });
  }, []);

  const handleInternalPreviewZoomOut = useCallback(() => {
    setInternalPreviewZoom(prev => {
      const idx = PREVIEW_ZOOM_LEVELS.indexOf(prev);
      return idx > 0 ? PREVIEW_ZOOM_LEVELS[idx - 1] : prev;
    });
  }, []);

  const handleInternalPreviewZoomReset = useCallback(() => {
    setInternalPreviewZoom(PREVIEW_DEFAULT_ZOOM);
  }, []);

  const previewZoom = previewZoomProp ?? internalPreviewZoom;
  const handlePreviewZoomIn = onPreviewZoomInProp ?? handleInternalPreviewZoomIn;
  const handlePreviewZoomOut = onPreviewZoomOutProp ?? handleInternalPreviewZoomOut;
  const handlePreviewZoomReset = onPreviewZoomResetProp ?? handleInternalPreviewZoomReset;

  // Compute the base path for resolving relative image srcs
  const imageBasePath = filePath ? filePath.substring(0, filePath.lastIndexOf('/')) : null;

  const handlePreviewClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
    // Handle anchor link clicks: scroll the preview to the target heading/element
    const anchor = (e.target as HTMLElement).closest('a[href]') as HTMLAnchorElement | null;
    if (anchor) {
      const href = anchor.getAttribute('href') ?? '';
      if (href.startsWith('#')) {
        e.preventDefault();
        const targetId = decodeURIComponent(href.slice(1));
        const container = previewScrollRef?.current;
        if (container && targetId) {
          const target = container.querySelector(`#${CSS.escape(targetId)}`) as HTMLElement | null;
          if (target) {
            const top = target.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
            container.scrollTop = Math.max(0, top - 16);
          }
        }
        return;
      }
    }

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
  }, [onClickSourcePosition, previewScrollRef]);

  // Memoize components so their function references are stable across re-renders.
  // Without this, ReactMarkdown treats each new reference as a different component type
  // and unmounts/remounts elements (including <img>), triggering image reload cycles
  // that cause layout shifts and scroll flicker. Depends on imageBasePath and imageRevision.
  const markdownComponents = useMemo(() => ({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    code({ node, className, children, ...props }: React.ComponentPropsWithoutRef<'code'> & { node?: unknown; className?: string }) {
      const isInline = !className && typeof children === 'string' && !(children as string).includes('\n');

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
    pre({ children }: React.ComponentPropsWithoutRef<'pre'>) {
      // Fenced code blocks: the `code` component already renders a CodeBlock (which has its
      // own <pre>), so we strip this wrapper to avoid nesting two <pre> elements.
      // Raw HTML <pre> elements have no CodeBlock child — render them with proper styling.
      const hasCodeBlock = React.Children.toArray(children).some(
        child => React.isValidElement(child) && child.type === CodeBlock
      );
      if (hasCodeBlock) return <>{children}</>;
      return <pre className="raw-pre">{children}</pre>;
    },
    img({ src, alt, title, ...props }: React.ComponentPropsWithoutRef<'img'>) {
      // Resolve relative image paths via the backend image endpoint
      const srcStr = typeof src === 'string' ? src : undefined;
      let resolvedSrc: string | undefined = srcStr;
      if (srcStr && imageBasePath && !/^https?:\/\//.test(srcStr) && !srcStr.startsWith('/')) {
        const base = getImageUrl(`${imageBasePath}/${srcStr}`);
        resolvedSrc = imageRevision ? `${base}&v=${imageRevision}` : base;
      }
      // eslint-disable-next-line @next/next/no-img-element
      const img = <img src={resolvedSrc} alt={alt || ''} title={title} {...props} />;
      if (title) {
        return (
          <figure>
            {img}
            <figcaption>{title}</figcaption>
          </figure>
        );
      }
      return img;
    },
  }), [imageBasePath, imageRevision]);

  // Animate <details> open/close so surrounding content slides smoothly
  useEffect(() => {
    const container = previewScrollRef?.current;
    if (!container) return;

    const cleanups: (() => void)[] = [];

    container.querySelectorAll<HTMLDetailsElement>('.markdown-preview details').forEach(details => {
      const summary = details.querySelector<HTMLElement>(':scope > summary');
      if (!summary) return;

      const handler = (e: globalThis.MouseEvent) => {
        if ((e.target as HTMLElement).closest('a')) return; // let links work normally
        e.preventDefault();

        const DURATION = 220;

        if (details.open) {
          // Closing: measure natural height first (before overflow:hidden suppresses margin
          // collapsing), then animate down to summary height.
          const openHeight = details.offsetHeight;
          const closedHeight = summary.offsetHeight;
          details.classList.add('is-closing');
          details.style.overflow = 'hidden';
          const anim = details.animate(
            [{ height: `${openHeight}px` }, { height: `${closedHeight}px` }],
            { duration: DURATION, easing: 'ease' }
          );
          anim.onfinish = () => {
            details.removeAttribute('open');
            details.classList.remove('is-closing');
            // Separate overflow clear from open removal to avoid double layout shift
            requestAnimationFrame(() => { details.style.overflow = ''; });
          };
        } else {
          // Opening: measure natural open height BEFORE setting overflow:hidden so margin
          // collapsing is unchanged, then animate from closed to that height.
          const closedHeight = summary.offsetHeight;
          details.setAttribute('open', '');
          const openHeight = details.offsetHeight; // natural height, no overflow yet
          details.style.overflow = 'hidden';
          const anim = details.animate(
            [{ height: `${closedHeight}px` }, { height: `${openHeight}px` }],
            { duration: DURATION, easing: 'ease', fill: 'backwards' }
          );
          anim.onfinish = () => {
            // Separate overflow clear from height release to avoid margin-collapsing jump
            requestAnimationFrame(() => { details.style.overflow = ''; });
          };
        }
      };

      summary.addEventListener('click', handler);
      cleanups.push(() => summary.removeEventListener('click', handler));
    });

    return () => cleanups.forEach(fn => fn());
  }, [content, previewScrollRef]);

  return (
    <div className={`absolute inset-0 flex flex-col preview-container ${isDark ? 'dark' : ''}`} style={{ backgroundColor: isDark ? '#121212' : '#FFFFFF' }}>
      {/* Preview content area */}
      <div ref={previewScrollRef} className="flex-1 overflow-auto p-8 pb-[calc(100vh-8rem)] editor-scroll">
        <div
          className={`markdown-preview${onClickSourcePosition ? ' clickable-source' : ''}`}
          style={{ fontFamily: 'var(--font-roboto-flex), sans-serif', color: textColor, fontSize: `${previewZoom}%` }}
          onClick={handlePreviewClick}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkGemoji, remarkMath, remarkAlert, remarkFrontmatter, remarkSupersub, remarkSourceLines]}
            rehypePlugins={[rehypeRaw, rehypeSlug, [rehypeSanitize, sanitizeSchema], rehypeMark, rehypeKatex]}
            remarkRehypeOptions={{ footnoteLabel: t('sidebar.footnotes', 'Footnotes') }}
            components={markdownComponents}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>

      {/* Info Bar */}
      {!hideInfoBar && (
        <PreviewInfoBar
          content={content}
          viewTheme={viewTheme}
          onToggleTheme={onToggleTheme}
          isScrollSynced={isScrollSynced}
          onToggleScrollSync={onToggleScrollSync}
          columnWidth={columnWidth}
          onColumnWidthChange={onColumnWidthChange}
          previewZoom={previewZoom}
          onPreviewZoomIn={handlePreviewZoomIn}
          onPreviewZoomOut={handlePreviewZoomOut}
          onPreviewZoomReset={handlePreviewZoomReset}
        />
      )}
    </div>
  );
}

// Memoized: only re-renders when props actually change.
// Combined with the debounced previewContent in EditorLayout, this prevents
// per-keystroke ReactMarkdown re-renders that destroy/recreate <img> elements
// causing layout shifts and the visible scroll tremor.
export default React.memo(MarkdownPreview);
