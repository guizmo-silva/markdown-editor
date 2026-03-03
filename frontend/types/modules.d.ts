declare module 'unified' {
  interface Data {
    micromarkExtensions?: unknown[];
    fromMarkdownExtensions?: unknown[];
  }
}

declare module 'micromark-extension-mark' {
  import type { Extension } from 'micromark-util-types';
  export function pandocMark(): Extension;
  export function pandocMarkHtml(): unknown;
}

declare module 'mdast-util-mark' {
  import type { FromMarkdownExtension, ToMarkdownExtension } from 'mdast-util-from-markdown';
  export const pandocMarkFromMarkdown: FromMarkdownExtension;
  export const pandocMarkToMarkdown: ToMarkdownExtension;
}
