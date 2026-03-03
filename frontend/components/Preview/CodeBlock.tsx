'use client';

import { useEffect, useRef, useState } from 'react';

interface CodeBlockProps {
  children: string;
  className?: string;
}

// Map common language aliases
const languageAliases: Record<string, string> = {
  'js': 'javascript',
  'ts': 'typescript',
  'py': 'python',
  'rb': 'ruby',
  'sh': 'bash',
  'shell': 'bash',
  'zsh': 'bash',
  'yml': 'yaml',
  'html': 'markup',
  'xml': 'markup',
  'svg': 'markup',
  'cs': 'csharp',
  'dockerfile': 'docker',
};

export default function CodeBlock({ children, className }: CodeBlockProps) {
  const codeRef = useRef<HTMLElement>(null);
  const [highlighted, setHighlighted] = useState(false);

  // Extract language from className (e.g., "language-javascript")
  const match = /language-(\w+)/.exec(className || '');
  let language = match ? match[1].toLowerCase() : 'text';

  // Apply aliases
  language = languageAliases[language] || language;

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined' || !codeRef.current) return;

    // Dynamically import Prism and required languages
    const loadPrism = async () => {
      try {
        const Prism = (await import('prismjs')).default;

        // Import languages based on what's needed
        const languageImports: Record<string, () => Promise<unknown>> = {
          'javascript': () => import('prismjs/components/prism-javascript' as string),
          'typescript': () => import('prismjs/components/prism-typescript' as string),
          'jsx': () => import('prismjs/components/prism-jsx' as string),
          'tsx': () => import('prismjs/components/prism-tsx' as string),
          'css': () => import('prismjs/components/prism-css' as string),
          'scss': () => import('prismjs/components/prism-scss' as string),
          'python': () => import('prismjs/components/prism-python' as string),
          'java': () => import('prismjs/components/prism-java' as string),
          'c': () => import('prismjs/components/prism-c' as string),
          'cpp': () => import('prismjs/components/prism-cpp' as string),
          'csharp': () => import('prismjs/components/prism-csharp' as string),
          'go': () => import('prismjs/components/prism-go' as string),
          'rust': () => import('prismjs/components/prism-rust' as string),
          'ruby': () => import('prismjs/components/prism-ruby' as string),
          'swift': () => import('prismjs/components/prism-swift' as string),
          'kotlin': () => import('prismjs/components/prism-kotlin' as string),
          'sql': () => import('prismjs/components/prism-sql' as string),
          'bash': () => import('prismjs/components/prism-bash' as string),
          'json': () => import('prismjs/components/prism-json' as string),
          'yaml': () => import('prismjs/components/prism-yaml' as string),
          'markdown': () => import('prismjs/components/prism-markdown' as string),
          'markup': () => import('prismjs/components/prism-markup' as string),
          'docker': () => import('prismjs/components/prism-docker' as string),
          'git': () => import('prismjs/components/prism-git' as string),
          'diff': () => import('prismjs/components/prism-diff' as string),
        };

        // Load the specific language if available
        if (languageImports[language]) {
          await languageImports[language]();
        }

        // Highlight if language is supported
        if (Prism.languages[language] && codeRef.current) {
          Prism.highlightElement(codeRef.current);
          setHighlighted(true);
        }
      } catch (error) {
        console.warn('Failed to load Prism language:', language, error);
      }
    };

    loadPrism();
  }, [children, language]);

  return (
    <pre className={`code-block language-${language}`}>
      <code
        ref={codeRef}
        className={`language-${language}`}
      >
        {children}
      </code>
    </pre>
  );
}
