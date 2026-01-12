'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import PreviewInfoBar from './PreviewInfoBar';
import './preview.css';

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
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw, rehypeSanitize]}
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
