'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { remarkAlert } from 'remark-github-blockquote-alert';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import PreviewInfoBar from './PreviewInfoBar';
import CodeBlock from './CodeBlock';
import './preview.css';
import './prism-theme.css';
import 'remark-github-blockquote-alert/alert.css';
import 'katex/dist/katex.min.css';

// Extend sanitize schema to allow alert elements, SVG icons, math elements, and footnotes
const sanitizeSchema = {
  ...defaultSchema,
  clobberPrefix: '', // Remove prefix to allow footnote navigation
  tagNames: [
    ...(defaultSchema.tagNames || []),
    'svg',
    'path',
    'section',
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
    ],
    a: [
      ...(defaultSchema.attributes?.a || []),
      'href',
      'dataFootnoteRef',
      'dataFootnoteBackref',
      ['className', /^data-footnote-backref$/],
    ],
    section: [
      'dataFootnotes',
      ['className', /^footnotes$/],
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

interface MarkdownPreviewProps {
  content: string;
}

export default function MarkdownPreview({ content }: MarkdownPreviewProps) {
  return (
    <div className="h-full w-full flex flex-col bg-white">
      {/* Preview content area */}
      <div className="flex-1 overflow-auto p-8">
        <div
          className="markdown-preview text-[#252525]"
          style={{ fontFamily: 'var(--font-roboto-flex), sans-serif' }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath, remarkAlert]}
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
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>

      {/* Info Bar */}
      <PreviewInfoBar content={content} />
    </div>
  );
}
