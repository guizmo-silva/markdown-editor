'use client';

import { useEffect, useRef, useCallback, useState, useImperativeHandle, forwardRef } from 'react';
import { EditorState, EditorSelection, Compartment, StateEffect, StateField, Transaction, Text, Range } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightActiveLine, scrollPastEnd, Decoration, DecorationSet, ViewPlugin, ViewUpdate, layer, RectangleMarker, drawSelection } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { syntaxHighlighting, HighlightStyle, foldGutter, codeFolding, foldService, unfoldEffect, foldEffect, foldable, foldedRanges } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { autocompletion, CompletionContext, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { search, searchKeymap, openSearchPanel, findNext, findPrevious, closeSearchPanel, selectMatches, replaceNext, replaceAll, getSearchQuery, setSearchQuery, SearchQuery, searchPanelOpen } from '@codemirror/search';
import { slug as githubSlug } from 'github-slugger';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/components/ThemeProvider';
import InfoBar from './InfoBar';
import { importImage } from '@/services/api';

// Interface to expose textarea-like API for compatibility with Toolbar
export interface CodeMirrorHandle {
  selectionStart: number;
  selectionEnd: number;
  focus: () => void;
  setSelectionRange: (start: number, end: number) => void;
  // Direct CodeMirror operations (supports undo/redo)
  replaceRange: (from: number, to: number, text: string) => void;
  getValue: () => string;
  scrollToOffset: (offset: number) => void;
  scrollToLineTop: (lineNumber: number) => void;
  scrollToFraction: (fraction: number, isScrollingDown?: boolean) => void;
  getScrollTop: () => number;
  setScrollTop: (top: number) => void;
  getCursorLine: () => number;
  openSearch: () => void;
}

interface CodeMirrorEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  scrollToLine?: number;
  onEditorReady?: (view: EditorView) => void;
  viewTheme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  saveStatus?: 'saved' | 'saving' | 'unsaved' | 'error';
  documentId?: string | null; // Used to reset undo history when switching documents
  onScrollLineChange?: (line: number) => void;
  columnWidth?: number;
  onColumnWidthChange?: (value: number) => void;
  documentPath?: string | null;
  onImagePasted?: (newDocPath: string, imageName: string) => void;
}

// Module-level labels for the search panel — updated by the component on each render
// (same pattern as unfoldLabelRef, but module-level since the factory is outside the component)
const _searchLabels = {
  searchPlaceholder: 'Buscar...',
  replacePlaceholder: 'Substituir...',
  next: 'Próximo',
  previous: 'Anterior',
  all: 'Todos',
  matchCase: 'Aa',
  regexp: '.*',
  wholeWord: 'Palavra',
  replace: 'Substituir',
  replaceAll: 'Subs. todos',
};

function createLocalizedSearchPanel(view: EditorView) {
  const query = getSearchQuery(view.state);
  const L = _searchLabels;

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'cm-textfield';
  searchInput.name = 'search';
  searchInput.setAttribute('form', '');
  searchInput.setAttribute('main-field', 'true');
  searchInput.setAttribute('aria-label', L.searchPlaceholder);
  searchInput.placeholder = L.searchPlaceholder;
  searchInput.value = query.search;

  const replaceInput = document.createElement('input');
  replaceInput.type = 'text';
  replaceInput.className = 'cm-textfield';
  replaceInput.name = 'replace';
  replaceInput.setAttribute('form', '');
  replaceInput.setAttribute('aria-label', L.replacePlaceholder);
  replaceInput.placeholder = L.replacePlaceholder;
  replaceInput.value = query.replace || '';

  const caseCheck = document.createElement('input');
  caseCheck.type = 'checkbox';
  caseCheck.name = 'case';
  caseCheck.checked = !!query.caseSensitive;

  const reCheck = document.createElement('input');
  reCheck.type = 'checkbox';
  reCheck.name = 're';
  reCheck.checked = !!query.regexp;

  const wordCheck = document.createElement('input');
  wordCheck.type = 'checkbox';
  wordCheck.name = 'word';
  wordCheck.checked = !!query.wholeWord;

  function makeLabel(text: string, input: HTMLInputElement): HTMLLabelElement {
    const label = document.createElement('label');
    label.appendChild(input);
    label.appendChild(document.createTextNode('\u00A0' + text));
    return label;
  }

  function makeButton(name: string, text: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.name = name;
    btn.textContent = text;
    btn.type = 'button';
    btn.className = 'cm-button';
    btn.addEventListener('click', onClick);
    return btn;
  }

  function commit() {
    const q = new SearchQuery({
      search: searchInput.value,
      caseSensitive: caseCheck.checked,
      regexp: reCheck.checked,
      wholeWord: wordCheck.checked,
      replace: replaceInput.value,
    });
    if (!q.eq(getSearchQuery(view.state))) {
      view.dispatch({ effects: setSearchQuery.of(q) });
    }
  }

  searchInput.addEventListener('change', commit);
  searchInput.addEventListener('keyup', commit);
  replaceInput.addEventListener('change', commit);
  replaceInput.addEventListener('keyup', commit);
  caseCheck.addEventListener('change', commit);
  reCheck.addEventListener('change', commit);
  wordCheck.addEventListener('change', commit);

  searchInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) findPrevious(view); else findNext(view);
    }
  });

  replaceInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); replaceNext(view); }
  });

  const closeBtn = document.createElement('button');
  closeBtn.name = 'close';
  closeBtn.textContent = '✕';
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', L.replacePlaceholder);
  closeBtn.addEventListener('click', () => { closeSearchPanel(view); view.focus(); });

  const dom = document.createElement('div');
  dom.className = 'cm-search';
  dom.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); closeSearchPanel(view); view.focus(); }
  });

  dom.appendChild(searchInput);
  dom.appendChild(makeButton('next', L.next, () => findNext(view)));
  dom.appendChild(makeButton('prev', L.previous, () => findPrevious(view)));
  dom.appendChild(makeButton('select', L.all, () => selectMatches(view)));
  dom.appendChild(makeLabel(L.matchCase, caseCheck));
  dom.appendChild(makeLabel(L.regexp, reCheck));
  dom.appendChild(makeLabel(L.wholeWord, wordCheck));
  dom.appendChild(document.createElement('br'));
  dom.appendChild(replaceInput);
  dom.appendChild(makeButton('replace', L.replace, () => replaceNext(view)));
  dom.appendChild(makeButton('replaceAll', L.replaceAll, () => replaceAll(view)));
  dom.appendChild(closeBtn);

  return {
    dom,
    mount() { searchInput.focus(); searchInput.select(); },
    update(update: ViewUpdate) {
      const q = getSearchQuery(update.state);
      const prev = getSearchQuery(update.startState);
      if (!q.eq(prev)) {
        if (searchInput.value !== q.search) searchInput.value = q.search;
        if (replaceInput.value !== (q.replace || '')) replaceInput.value = q.replace || '';
        caseCheck.checked = !!q.caseSensitive;
        reCheck.checked = !!q.regexp;
        wordCheck.checked = !!q.wholeWord;
      }
    },
  };
}

// Markdown syntax highlighting for light mode (bg: #D8D8D8)
const lightHighlighting = HighlightStyle.define([
  { tag: tags.heading1, color: '#1a1a1a', fontWeight: 'bold' },
  { tag: tags.heading2, color: '#1a1a1a', fontWeight: 'bold' },
  { tag: tags.heading3, color: '#2a2a2a', fontWeight: 'bold' },
  { tag: tags.heading4, color: '#3a3a3a', fontWeight: 'bold' },
  { tag: tags.heading5, color: '#3a3a3a', fontWeight: 'bold' },
  { tag: tags.heading6, color: '#4a4a4a', fontWeight: 'bold' },
  { tag: tags.emphasis, fontStyle: 'italic', color: '#4a4a4a' },
  { tag: tags.strong, fontWeight: 'bold', color: '#2a2a2a' },
  { tag: tags.strikethrough, textDecoration: 'line-through', color: '#888888' },
  { tag: tags.monospace, fontFamily: 'Roboto Mono, monospace', backgroundColor: 'rgba(0,0,0,0.1)', color: '#c7254e' },
  { tag: tags.link, color: '#0066cc', textDecoration: 'underline' },
  { tag: tags.url, color: '#0066cc' },
  { tag: tags.list, color: '#c25d00' },
  { tag: tags.quote, color: '#2e7d32', fontStyle: 'italic' },
  { tag: tags.processingInstruction, color: '#5e738a' },
  { tag: tags.meta, color: '#7c3aed' },
  { tag: tags.content, color: '#404040' },
  { tag: tags.comment, color: '#999999', fontStyle: 'italic' },
  // HTML tags
  { tag: tags.angleBracket, color: '#8a9da8' },
  { tag: tags.tagName, color: '#2e6e7e' },
  { tag: tags.attributeName, color: '#7a6030' },
  { tag: tags.attributeValue, color: '#6a5880' },
  { tag: tags.definitionOperator, color: '#888888' },
  { tag: tags.character, color: '#6a8030' },
]);

// Markdown syntax highlighting for dark mode (bg: #272727)
const darkHighlighting = HighlightStyle.define([
  { tag: tags.heading1, color: '#FFFFFF', fontWeight: 'bold' },
  { tag: tags.heading2, color: '#FFFFFF', fontWeight: 'bold' },
  { tag: tags.heading3, color: '#E5E5E5', fontWeight: 'bold' },
  { tag: tags.heading4, color: '#D0D0D0', fontWeight: 'bold' },
  { tag: tags.heading5, color: '#D0D0D0', fontWeight: 'bold' },
  { tag: tags.heading6, color: '#BEBEBE', fontWeight: 'bold' },
  { tag: tags.emphasis, fontStyle: 'italic', color: '#CCCCCC' },
  { tag: tags.strong, fontWeight: 'bold', color: '#FFFFFF' },
  { tag: tags.strikethrough, textDecoration: 'line-through', color: '#888888' },
  { tag: tags.monospace, fontFamily: 'Roboto Mono, monospace', backgroundColor: 'rgba(255,255,255,0.1)', color: '#ff8fa3' },
  { tag: tags.link, color: '#6cb6ff', textDecoration: 'underline' },
  { tag: tags.url, color: '#6cb6ff' },
  { tag: tags.list, color: '#e8934a' },
  { tag: tags.quote, color: '#6dbb78', fontStyle: 'italic' },
  { tag: tags.processingInstruction, color: '#7da8cc' },
  { tag: tags.meta, color: '#b084e8' },
  { tag: tags.content, color: '#BEBEBE' },
  { tag: tags.comment, color: '#777777', fontStyle: 'italic' },
  // HTML tags
  { tag: tags.angleBracket, color: '#7a9aaa' },
  { tag: tags.tagName, color: '#68c0d0' },
  { tag: tags.attributeName, color: '#c4a860' },
  { tag: tags.attributeValue, color: '#a88ec8' },
  { tag: tags.definitionOperator, color: '#909090' },
  { tag: tags.character, color: '#90b040' },
]);

// Light theme for CodeMirror
const lightTheme = EditorView.theme({
  '&': {
    backgroundColor: '#D8D8D8',
    height: '100%',
  },
  '.cm-content': {
    fontFamily: 'Roboto Mono, monospace',
    padding: '8px 0',
    caretColor: '#333',
    color: '#404040',
  },
  '.cm-line': {
    padding: '0 8px',
  },
  '.cm-gutters': {
    backgroundColor: '#E9E9E9',
    color: '#999999',
    borderLeft: '1px solid var(--border-editor)',
    borderRight: 'none',
    borderTop: 'none',
    borderBottom: 'none',
    fontFamily: 'Roboto Mono, monospace',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    padding: '0 8px 0 4px',
    minWidth: '32px',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#D8D8D8',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  '.cm-cursor': {
    borderLeftColor: '#333',
  },
  '.cm-placeholder': {
    color: '#999999',
  },
  '.cm-scroller': {
    overflow: 'auto',
  },
  '@keyframes flash-fade': {
    '0%': { backgroundColor: 'rgba(255, 220, 100, 0.6)' },
    '30%': { backgroundColor: 'rgba(255, 220, 100, 0.6)' },
    '100%': { backgroundColor: 'transparent' },
  },
  '.cm-flash-highlight': {
    animation: 'flash-fade 800ms ease-out forwards',
  },
  '.cm-tooltip-autocomplete': {
    backgroundColor: '#E9E9E9',
    border: '1px solid #CCCCCC',
    borderRadius: '6px',
    fontFamily: 'Roboto Mono, monospace',
    fontSize: '12px',
    overflow: 'hidden',
  },
  '.cm-tooltip-autocomplete ul li': {
    padding: '4px 8px',
    color: '#404040',
  },
  '.cm-tooltip-autocomplete ul li[aria-selected]': {
    backgroundColor: '#CCCCCC',
    color: '#1a1a1a',
  },
  '.cm-tooltip-autocomplete .cm-completionDetail': {
    color: '#888888',
    fontStyle: 'italic',
    marginLeft: '8px',
  },
  '.cm-completionIcon': {
    display: 'none',
  },
  '.cm-fm-line': { backgroundColor: 'rgba(100,120,160,0.07)', borderLeft: '2px solid #8899bb' },
  '.cm-fm-delim': { color: '#8899bb', fontWeight: 'bold' },
  '.cm-fm-key': { color: '#005cc5' },
  '.cm-fm-string': { color: '#22863a' },
  '.cm-fm-bool': { color: '#e36209' },
  '.cm-fm-number': { color: '#005cc5' },
  '.cm-fm-comment': { color: '#6a737d', fontStyle: 'italic' },
  '.cm-foldGutter .cm-gutterElement': { padding: '0 4px 0 1px', cursor: 'pointer', color: '#999999' },
  '.cm-foldGutter .cm-gutterElement.cm-activeLineGutter': { color: '#555555' },
  '.cm-foldPlaceholder': { marginLeft: '6px', display: 'inline-block', animation: 'cm-fold-placeholder-in 0.18s ease-out', transformOrigin: 'left center', color: 'inherit', background: 'rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.18)', borderRadius: '4px', padding: '0 6px 2px', cursor: 'pointer', verticalAlign: 'baseline' },
  // Hide drawSelection's own selection rects — we use tightSelectionLayer instead
  '.cm-selectionBackground': { background: 'transparent !important' },
});

// Dark theme for CodeMirror
const darkTheme = EditorView.theme({
  '&': {
    backgroundColor: '#272727',
    height: '100%',
  },
  '.cm-content': {
    fontFamily: 'Roboto Mono, monospace',
    padding: '8px 0',
    caretColor: '#FFFFFF',
    color: '#BEBEBE',
  },
  '.cm-line': {
    padding: '0 8px',
  },
  '.cm-gutters': {
    backgroundColor: '#676767',
    color: '#E5E5E5',
    borderLeft: '1px solid var(--border-editor)',
    borderRight: 'none',
    borderTop: 'none',
    borderBottom: 'none',
    fontFamily: 'Roboto Mono, monospace',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    padding: '0 8px 0 4px',
    minWidth: '32px',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#3a3a3a',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  '.cm-cursor': {
    borderLeftColor: '#FFFFFF',
  },
  '.cm-placeholder': {
    color: '#888888',
  },
  '.cm-scroller': {
    overflow: 'auto',
  },
  '@keyframes flash-fade-dark': {
    '0%': { backgroundColor: 'rgba(100, 180, 255, 0.4)' },
    '30%': { backgroundColor: 'rgba(100, 180, 255, 0.4)' },
    '100%': { backgroundColor: 'transparent' },
  },
  '.cm-flash-highlight': {
    animation: 'flash-fade-dark 800ms ease-out forwards',
  },
  '.cm-tooltip-autocomplete': {
    backgroundColor: '#3a3a3a',
    border: '1px solid #555555',
    borderRadius: '6px',
    fontFamily: 'Roboto Mono, monospace',
    fontSize: '12px',
    overflow: 'hidden',
  },
  '.cm-tooltip-autocomplete ul li': {
    padding: '4px 8px',
    color: '#BEBEBE',
  },
  '.cm-tooltip-autocomplete ul li[aria-selected]': {
    backgroundColor: '#555555',
    color: '#FFFFFF',
  },
  '.cm-tooltip-autocomplete .cm-completionDetail': {
    color: '#888888',
    fontStyle: 'italic',
    marginLeft: '8px',
  },
  '.cm-completionIcon': {
    display: 'none',
  },
  '.cm-fm-line': { backgroundColor: 'rgba(100,140,220,0.08)', borderLeft: '2px solid #4a6080' },
  '.cm-fm-delim': { color: '#4a6080', fontWeight: 'bold' },
  '.cm-fm-key': { color: '#79b8ff' },
  '.cm-fm-string': { color: '#85e89d' },
  '.cm-fm-bool': { color: '#ffab70' },
  '.cm-fm-number': { color: '#79b8ff' },
  '.cm-fm-comment': { color: '#6a737d', fontStyle: 'italic' },
  '.cm-foldGutter .cm-gutterElement': { padding: '0 4px 0 1px', cursor: 'pointer', color: '#aaaaaa' },
  '.cm-foldGutter .cm-gutterElement.cm-activeLineGutter': { color: '#dddddd' },
  '.cm-foldPlaceholder': { marginLeft: '6px', display: 'inline-block', animation: 'cm-fold-placeholder-in 0.18s ease-out', transformOrigin: 'left center', color: 'inherit', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '4px', padding: '0 6px 2px', cursor: 'pointer', verticalAlign: 'baseline' },
  // Hide drawSelection's own selection rects — we use tightSelectionLayer instead
  '.cm-selectionBackground': { background: 'transparent !important' },
});

// Build language completions from @codemirror/language-data
// Each entry has a label (lowercase name used in markdown fences) and a display name.
const codeLanguageCompletions: { label: string; displayName: string }[] = [];
const seenLabels = new Set<string>();
for (const lang of languages) {
  // Use aliases (lowercase) as the primary labels — these are what go in ```xyz
  for (const alias of lang.alias) {
    const lower = alias.toLowerCase();
    if (!seenLabels.has(lower)) {
      seenLabels.add(lower);
      codeLanguageCompletions.push({ label: lower, displayName: lang.name });
    }
  }
  // Also add the language name itself in lowercase
  const nameLower = lang.name.toLowerCase();
  if (!seenLabels.has(nameLower)) {
    seenLabels.add(nameLower);
    codeLanguageCompletions.push({ label: nameLower, displayName: lang.name });
  }
}

// Autocomplete source: activates only on the opening ``` fence line of a code block
function codeBlockLanguageCompletion(context: CompletionContext) {
  const line = context.state.doc.lineAt(context.pos);
  const lineText = line.text;

  // Must be a line starting with ``` (optionally with leading whitespace)
  const fenceMatch = lineText.match(/^(\s*`{3,})/);
  if (!fenceMatch) return null;

  const fenceEnd = line.from + fenceMatch[0].length; // position right after the backticks
  const typed = lineText.slice(fenceMatch[0].length); // text after backticks

  // Only activate if cursor is after the backticks on this line
  if (context.pos < fenceEnd) return null;

  // Don't activate if there's a closing fence (``` on a line that has content above in a block)
  // Check if there's an opening ``` before this line — if so this might be a closing fence
  const docText = context.state.doc.toString();
  const textBefore = docText.substring(0, line.from);
  const openFences = (textBefore.match(/^[ \t]*`{3,}/gm) || []).length;
  // If odd number of prior fences, this is a closing fence — don't suggest
  if (openFences % 2 === 1) return null;

  // Filter completions based on what's typed after ```
  const filter = typed.trim().toLowerCase();

  // Only show suggestions once the user has started typing a language name
  if (filter.length === 0) return null;

  const filtered = codeLanguageCompletions
    .filter(c => c.label.includes(filter) || c.displayName.toLowerCase().includes(filter))
    .map(c => ({
      label: c.label,
      detail: c.displayName !== c.label ? c.displayName : undefined,
      boost: c.label.startsWith(filter) ? 1 : 0,
    }));

  if (filtered.length === 0) return null;

  return {
    from: fenceEnd,
    to: line.from + lineText.length,
    options: filtered,
    filter: false, // we already filter above
  };
}

// Autocomplete extension configured for code block language suggestions
const codeBlockAutocomplete = autocompletion({
  override: [codeBlockLanguageCompletion],
  activateOnTyping: true,
  defaultKeymap: true,
});

const isUrl = (text: string): boolean =>
  /^https?:\/\/\S+$/.test(text);

// Uses the same github-slugger library as rehype-slug in the preview,
// guaranteeing identical slug generation (including edge cases like variation
// selectors, emoji sequences, and non-ASCII punctuation).
function headingSlugify(text: string): string {
  return githubSlug(text);
}

function extractHeadingText(text: string): string | null {
  const match = text.match(/^#{1,6}\s+(.+)$/);
  return match ? match[1].trim() : null;
}

// Returns true if cursor at `pos` is inside the URL part of a markdown link [text](|)
function isCursorInLinkUrl(view: EditorView, pos: number): boolean {
  const before = view.state.sliceDoc(Math.max(0, pos - 500), pos);
  let depth = 0;
  for (let i = before.length - 1; i >= 0; i--) {
    const ch = before[i];
    if (ch === ')') {
      depth++;
    } else if (ch === '(') {
      if (depth === 0) {
        return i > 0 && before[i - 1] === ']';
      }
      depth--;
    }
  }
  return false;
}

// Smart typography: auto-replace --- → em dash (inline) and ... → ellipsis
const smartTypography = EditorView.inputHandler.of((view, from, to, text) => {
  // Don't interfere with IME composition (dead keys, accents, etc.)
  if (view.composing) return false;

  // Em dash: third '-' after '--', only inline (text before dashes on the line)
  if (text === '-') {
    const before = view.state.sliceDoc(Math.max(0, from - 2), from);
    if (before === '--') {
      const line = view.state.doc.lineAt(from);
      const textBeforeDashes = line.text.substring(0, from - 2 - line.from).trim();
      if (textBeforeDashes.length > 0) {
        view.dispatch({
          changes: { from: from - 2, to, insert: '\u2014' },
        });
        return true;
      }
    }
  }

  // Ellipsis: third '.' after '..' → replace with '…'
  // Revert: '.' after '…' → revert back to '...' (literal dots)
  if (text === '.') {
    const charBefore = view.state.sliceDoc(Math.max(0, from - 1), from);
    if (charBefore === '\u2026') {
      view.dispatch({
        changes: { from: from - 1, to, insert: '...' },
      });
      return true;
    }
    const twoBefore = view.state.sliceDoc(Math.max(0, from - 2), from);
    if (twoBefore === '..') {
      view.dispatch({
        changes: { from: from - 2, to, insert: '\u2026' },
      });
      return true;
    }
  }

  return false;
});

const pasteLinkHandler = EditorView.domEventHandlers({
  dragstart(event) {
    event.preventDefault();
    return true;
  },
  paste(event, view) {
    // Image paste: detect image/* data in clipboard and import to document folder
    const items = Array.from(event.clipboardData?.items ?? []);
    const imageItem = items.find(item => item.type.startsWith('image/'));
    if (imageItem && _pasteImageDocPath) {
      event.preventDefault();
      const file = imageItem.getAsFile();
      if (file) {
        const { from, to } = view.state.selection.main;
        const selectedText = view.state.sliceDoc(from, to).replace(/\n+$/, '').trim();
        const placeholder = 'descrição da imagem';
        const docPath = _pasteImageDocPath;
        const callback = _pasteImageCallback;
        importImage(docPath, file).then(({ newDocumentPath, imageName }) => {
          const altText = selectedText || placeholder;
          const markdown = `![${altText}](${imageName})`;
          view.dispatch({
            changes: { from, to, insert: markdown },
            selection: selectedText
              ? { anchor: from + markdown.length }
              : { anchor: from + 2, head: from + 2 + placeholder.length },
          });
          view.focus();
          callback?.(newDocumentPath, imageName);
        }).catch(err => {
          console.error('Erro ao importar imagem do clipboard:', err);
        });
      }
      return true;
    }

    const clipboardText = event.clipboardData?.getData('text/plain')?.trim() ?? '';

    // Ctrl+Shift+V: paste as plain text, no URL conversion
    if (plainPasteMode) {
      plainPasteMode = false;
      if (!clipboardText) return false;
      event.preventDefault();
      const { from, to } = view.state.selection.main;
      view.dispatch({
        changes: { from, to, insert: clipboardText },
        selection: { anchor: from + clipboardText.length },
      });
      return true;
    }

    // Heading pasted inside link URL position → convert to anchor slug
    // Or, if there's a non-empty selection, wrap it as [selected](#slug)
    const headingText = extractHeadingText(clipboardText);
    if (headingText !== null) {
      const { from, to } = view.state.selection.main;
      if (isCursorInLinkUrl(view, from)) {
        event.preventDefault();
        const anchor = `#${headingSlugify(headingText)}`;
        view.dispatch({
          changes: { from, to, insert: anchor },
          selection: { anchor: from + anchor.length },
        });
        return true;
      }
      // Selection over paragraph text → wrap as anchor link
      if (from !== to) {
        event.preventDefault();
        const anchor = `#${headingSlugify(headingText)}`;
        const selectedText = view.state.sliceDoc(from, to);
        const replacement = `[${selectedText}](${anchor})`;
        view.dispatch({
          changes: { from, to, insert: replacement },
          selection: { anchor: from + replacement.length },
        });
        return true;
      }
      return false;
    }

    if (!isUrl(clipboardText)) return false;

    const { from, to } = view.state.selection.main;
    const selectedText = view.state.sliceDoc(from, to).replace(/\n+$/, '').trim();

    event.preventDefault();

    if (selectedText) {
      const replacement = `[${selectedText}](${clipboardText})`;
      view.dispatch({
        changes: { from, to, insert: replacement },
        selection: { anchor: from + replacement.length, head: from + replacement.length },
      });
    } else {
      const replacement = `[](${clipboardText})`;
      view.dispatch({
        changes: { from, to, insert: replacement },
        selection: { anchor: from + 1, head: from + 1 },
      });
    }
    return true;
  },
});

// Compartment for dynamic theme switching
const themeCompartment = new Compartment();

// Compartment for dynamic spellcheck configuration
const spellcheckCompartment = new Compartment();

// Compartment for dynamic font size (zoom)
const fontSizeCompartment = new Compartment();

const EDITOR_ZOOM_LEVELS = [70, 80, 90, 100, 110, 120, 130, 140, 150];
const EDITOR_DEFAULT_ZOOM = 100;

function getFontSizeExtension(zoom: number) {
  const fontSize = `${(12 * zoom) / 100}px`;
  const lineHeight = `${(20 * zoom) / 100}px`;
  return EditorView.theme({
    '.cm-content': { fontSize, lineHeight },
    '.cm-gutters': { fontSize, lineHeight },
  });
}

// Tight selection layer: draws one absolutely-positioned rect per visual block in the
// selection. Uses block.top + block.height so consecutive blocks are adjacent (no gap).
// Uses CodeMirror's layer() API (above: false → z-index: -1, behind text).
// The layer's children get position:absolute automatically via .cm-layer > * CSS.
function getSelBase(view: EditorView) {
  const rect = view.scrollDOM.getBoundingClientRect();
  return {
    left: rect.left - view.scrollDOM.scrollLeft,
    top:  rect.top  - view.scrollDOM.scrollTop,
  };
}

function tightSelectionMarkers(view: EditorView): readonly RectangleMarker[] {
  const { state } = view;
  const markers: RectangleMarker[] = [];
  const base = getSelBase(view);

  for (const range of state.selection.ranges) {
    if (range.empty) continue;

    // Collect all visual line segments covered by the selection.
    // view.lineBlockAt returns the document-line block (block.height = total of all
    // wrapped visual lines, block.to = end of document line). When a selection spans
    // a visual wrap boundary we must split at that boundary ourselves.
    // Strategy: after getting a block, compare coordsAtPos(lFrom).top with
    // coordsAtPos(lTo).top. If they differ by more than half a line height the
    // range straddles a visual wrap — binary-search for the wrap point, emit the
    // first visual segment, and continue from the next character.
    const blocks: Array<{ lFrom: number; lTo: number; height: number }> = [];
    let pos = range.from;
    while (pos <= range.to) {
      const block = view.lineBlockAt(pos);
      // Use pos (not block.from) as lFrom lower bound so wrap-continuation
      // iterations start from the correct position within the same document line.
      const lFrom = Math.max(range.from, pos);
      const lTo   = Math.min(range.to, block.to);

      const fc0 = lFrom === lTo
        ? view.coordsAtPos(lFrom)
        : view.coordsAtPos(lFrom, 1);
      const lineH = fc0 ? fc0.bottom - fc0.top : block.height;

      if (fc0 && lFrom < lTo) {
        const tc0 = view.coordsAtPos(lTo, -1);
        if (tc0 && tc0.top - fc0.top > lineH * 0.5) {
          // Range spans a visual wrap — find the last position on this visual line.
          let lo = lFrom, hi = lTo, vEnd = lFrom;
          while (lo < hi - 1) {
            const mid = (lo + hi) >> 1;
            const mc  = view.coordsAtPos(mid, 1);
            if (mc && mc.top < fc0.top + lineH * 0.5) { lo = mid; vEnd = mid; }
            else hi = mid;
          }
          blocks.push({ lFrom, lTo: vEnd, height: lineH });
          pos = vEnd + 1; // advance to the next visual line within the same doc line
          continue;
        }
      }

      blocks.push({ lFrom, lTo, height: lineH });

      if (block.to >= range.to) break;
      pos = block.to + 1;
    }

    // First pass: compute pixel rects for each block
    type PR = { left: number; top: number; right: number; height: number; empty: boolean };
    const rects: (PR | null)[] = blocks.map(({ lFrom, lTo, height }) => {
      if (lFrom === lTo) {
        const fc = view.coordsAtPos(lFrom);
        if (!fc) return null;
        return { left: fc.left - base.left, top: fc.top - base.top, right: fc.left - base.left + 8, height, empty: true };
      }
      const fc = view.coordsAtPos(lFrom, 1);
      const tc = view.coordsAtPos(lTo, -1);
      if (!fc || !tc) return null;
      return {
        left:   fc.left  - base.left,
        top:    fc.top   - base.top,
        right:  Math.max(fc.left - base.left + 2, tc.right - base.left),
        height, // already the visual-line height from blocks building step
        empty:  false,
      };
    });

    // Second pass: emit selection rects.
    // Filter nulls first so corner-detection indices and height derivation are clean.
    // Height is derived from the next rect's top so adjacent rects tile perfectly
    // with no sub-pixel horizontal gap. The last rect gets a +1 overshoot instead.
    const valid = rects.filter((r): r is PR => r !== null);
    for (let i = 0; i < valid.length; i++) {
      const r = valid[i];
      const isFirst = i === 0;
      const isLast  = i === valid.length - 1;

      const currR = Math.round(r.right);
      const prevR = i > 0       ? Math.round(valid[i - 1].right) : -Infinity;
      const nextR = !isLast     ? Math.round(valid[i + 1].right) : -Infinity;

      // Top-right is exposed (outer convex) when this line is wider than the one above it.
      const rtop    = isFirst || prevR < currR - 1;
      // Bottom-right is exposed (outer convex) when wider than the one below it.
      const rbottom = isLast  || nextR < currR - 1;

      const cls = 'cm-sel-rect'
        + (isFirst  ? ' cm-sel-first'   : '')
        + (isLast   ? ' cm-sel-last'    : '')
        + (rtop     ? ' cm-sel-rtop'    : '')
        + (rbottom  ? ' cm-sel-rbottom' : '');

      const rectTop    = Math.floor(r.top);
      const rectHeight = !isLast
        ? Math.max(1, Math.floor(valid[i + 1].top) - rectTop)
        : Math.ceil(r.height) + 1;

      markers.push(new RectangleMarker(
        cls,
        Math.round(r.left),
        rectTop,
        Math.round(r.right - r.left),
        rectHeight,
      ));
    }
  }
  return markers;
}

const tightSelectionLayer = layer({
  above: false,
  markers: tightSelectionMarkers,
  update(update) {
    return update.selectionSet || update.docChanged || update.viewportChanged || update.geometryChanged;
  },
  class: 'cm-tight-sel-layer',
});

// Helper function to create format toggle commands for keyboard shortcuts
const createFormatCommand = (prefix: string, suffix: string) => {
  return (view: EditorView): boolean => {
    const { from, to } = view.state.selection.main;
    const doc = view.state.doc.toString();
    const selectedText = view.state.sliceDoc(from, to);

    // If no selection: detect formatted span under cursor or auto-format the word
    if (from === to) {
      const searchRadius = 200;
      const searchStart = Math.max(0, from - searchRadius);
      const searchEnd = Math.min(doc.length, to + searchRadius);
      const searchArea = doc.substring(searchStart, searchEnd);
      const relativePos = from - searchStart;

      const escPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const escSuffix = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      const pattern =
        prefix === '*' && suffix === '*'
          ? /(?<!\*)\*(?!\*)([\s\S]*?)(?<!\*)\*(?!\*)/g
          : new RegExp(escPrefix + '([\\s\\S]*?)' + escSuffix, 'g');

      let foundSpan: { inner: string; absoluteStart: number; absoluteEnd: number } | null = null;

      for (const match of searchArea.matchAll(pattern)) {
        const spanStart = match.index!;
        const spanEnd = spanStart + match[0].length;
        if (relativePos >= spanStart && relativePos <= spanEnd) {
          foundSpan = { inner: match[1], absoluteStart: searchStart + spanStart, absoluteEnd: searchStart + spanEnd };
          break;
        }
      }

      // Special case: combined ***...*** when clicking italic (*)
      if (!foundSpan && prefix === '*' && suffix === '*') {
        for (const match of searchArea.matchAll(/\*{3}([\s\S]*?)\*{3}/g)) {
          const spanStart = match.index!;
          const spanEnd = spanStart + match[0].length;
          if (relativePos >= spanStart && relativePos <= spanEnd) {
            foundSpan = { inner: '**' + match[1] + '**', absoluteStart: searchStart + spanStart, absoluteEnd: searchStart + spanEnd };
            break;
          }
        }
      }

      if (foundSpan) {
        const { inner, absoluteStart, absoluteEnd } = foundSpan;
        const newPos = Math.max(absoluteStart, Math.min(from - prefix.length, absoluteStart + inner.length));
        view.dispatch({ changes: { from: absoluteStart, to: absoluteEnd, insert: inner }, selection: { anchor: newPos } });
        return true;
      }

      // No span found — auto-format the word under cursor
      let wordStart = from;
      let wordEnd = from;
      while (wordStart > 0 && !/\s/.test(doc[wordStart - 1])) wordStart--;
      while (wordEnd < doc.length && !/\s/.test(doc[wordEnd])) wordEnd++;

      if (wordStart < wordEnd) {
        const wordText = doc.substring(wordStart, wordEnd);
        const cursorPos = wordStart + prefix.length + wordText.length;
        view.dispatch({
          changes: { from: wordStart, to: wordEnd, insert: prefix + wordText + suffix },
          selection: { anchor: cursorPos }
        });
        return true;
      }
    }

    // With selection: check if already formatted and toggle
    const beforeText = view.state.sliceDoc(Math.max(0, from - prefix.length), from);
    const afterText = view.state.sliceDoc(to, to + suffix.length);

    if (beforeText === prefix && afterText === suffix) {
      // Remove formatting (markers are outside the selection)
      view.dispatch({
        changes: [
          { from: from - prefix.length, to: from, insert: '' },
          { from: to, to: to + suffix.length, insert: '' }
        ],
        selection: { anchor: from - prefix.length, head: to - prefix.length }
      });
    } else if (selectedText.startsWith(prefix) && selectedText.endsWith(suffix) && selectedText.length > prefix.length + suffix.length) {
      // Remove formatting (markers are inside the selection)
      const unwrapped = selectedText.slice(prefix.length, -suffix.length);
      view.dispatch({
        changes: { from, to, insert: unwrapped },
        selection: { anchor: from, head: from + unwrapped.length }
      });
    } else {
      // Add formatting — trim trailing newlines from triple-click selection
      const trailingNewlines = selectedText.match(/\n+$/)?.[0] ?? '';
      const trimmedText = trailingNewlines ? selectedText.slice(0, -trailingNewlines.length) : selectedText;
      const trimmedTo = from + trimmedText.length;
      view.dispatch({
        changes: { from, to, insert: prefix + trimmedText + suffix + trailingNewlines },
        selection: { anchor: from + prefix.length, head: trimmedTo + prefix.length }
      });
    }
    return true;
  };
};

// Command to insert/toggle a markdown link
const linkCommand = (view: EditorView): boolean => {
  const { from, to } = view.state.selection.main;
  const selectedText = view.state.sliceDoc(from, to);

  const linkText = selectedText || 'link text';
  const replacement = `[${linkText}](url)`;

  view.dispatch({
    changes: { from, to, insert: replacement },
    selection: selectedText
      ? // Text was selected — place cursor selecting "url"
        { anchor: from + 1 + linkText.length + 2, head: from + 1 + linkText.length + 2 + 3 }
      : // No text — select "link text" placeholder
        { anchor: from + 1, head: from + 1 + linkText.length },
  });
  return true;
};

// Flag set by Ctrl+Shift+V keydown; consumed by pasteLinkHandler
let plainPasteMode = false;

// Module-level state for clipboard image paste — updated by the component on each render
let _pasteImageDocPath: string | null = null;
let _pasteImageCallback: ((newDocPath: string, imageName: string) => void) | null = null;

// Keymap for formatting shortcuts (Mod = Ctrl on Windows/Linux, Cmd on macOS)
const formatKeymap = keymap.of([
  { key: 'Mod-b', run: createFormatCommand('**', '**') },   // Bold
  { key: 'Mod-i', run: createFormatCommand('*', '*') },     // Italic
  { key: 'Mod-Shift-x', run: createFormatCommand('~~', '~~') }, // Strikethrough
  { key: 'Mod-k', run: linkCommand },                        // Link
  { key: 'Mod-/', run: createFormatCommand('<!-- ', ' -->') }, // Comment
  { key: 'Mod-Shift-v', run: () => {
    // Let the browser fire a native paste event with clipboardData (no permission UI).
    // Chrome/Edge: works silently. Firefox: may show a non-blocking post-paste notification.
    plainPasteMode = true;
    setTimeout(() => { plainPasteMode = false; }, 200);
    return false;
  }},
]);

// Ctrl+F / Cmd+F toggles the search panel (open if closed, close if open)
const toggleSearchKeymap = keymap.of([
  { key: 'Mod-f', run: (view) => {
    if (searchPanelOpen(view.state)) {
      closeSearchPanel(view);
      view.focus();
    } else {
      openSearchPanel(view);
    }
    return true;
  }},
]);

// Effect to trigger line highlight flash
const flashLineEffect = StateEffect.define<{ from: number; to: number } | null>();

// Decoration for the flash highlight
const flashHighlightMark = Decoration.line({ class: 'cm-flash-highlight' });

// StateField to manage flash highlight decoration
const flashHighlightField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    for (const effect of tr.effects) {
      if (effect.is(flashLineEffect)) {
        if (effect.value === null) {
          return Decoration.none;
        }
        return Decoration.set([flashHighlightMark.range(effect.value.from)]);
      }
    }
    return decorations;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// --- Front Matter Support ---

// Detects a YAML (---) or TOML (+++) front matter block at the start of the document.
// Returns { from, to } covering from first delimiter line to last delimiter line (inclusive).
function detectFrontMatter(doc: Text): { from: number; to: number } | null {
  if (doc.lines < 3) return null;
  const firstLine = doc.line(1);
  const delim = firstLine.text === '---' ? '---' : firstLine.text === '+++' ? '+++' : null;
  if (!delim) return null;
  for (let i = 2; i <= doc.lines; i++) {
    if (doc.line(i).text === delim) {
      return { from: firstLine.from, to: doc.line(i).to };
    }
  }
  return null;
}

// StateField: tracks the front matter range so it can be shared between plugins
const frontMatterRangeField = StateField.define<{ from: number; to: number } | null>({
  create(state) { return detectFrontMatter(state.doc); },
  update(value, tr) {
    return tr.docChanged ? detectFrontMatter(tr.newDoc) : value;
  },
});

// Decoration factories
const fmLineDeco = Decoration.line({ class: 'cm-fm-line' });
const fmDelimDeco = Decoration.line({ class: 'cm-fm-line cm-fm-delim' });

// ViewPlugin: applies line and inline token decorations for front matter
const frontMatterPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view);
      }
    }

    buildDecorations(view: EditorView): DecorationSet {
      const fm = view.state.field(frontMatterRangeField);
      if (!fm) return Decoration.none;

      const decos: Range<Decoration>[] = [];
      const doc = view.state.doc;
      const firstLine = doc.lineAt(fm.from);
      const lastLine = doc.lineAt(fm.to);

      for (let i = firstLine.number; i <= lastLine.number; i++) {
        const line = doc.line(i);
        const isDelim = i === firstLine.number || i === lastLine.number;

        // Line decoration (background + border)
        decos.push(isDelim ? fmDelimDeco.range(line.from) : fmLineDeco.range(line.from));

        // Skip inline tokens on delimiter lines
        if (isDelim) continue;

        const text = line.text;

        // Key: word at start followed by ':'
        const keyMatch = text.match(/^([\w][\w.-]*)(?=\s*:)/);
        if (keyMatch) {
          decos.push(Decoration.mark({ class: 'cm-fm-key' }).range(line.from, line.from + keyMatch[0].length));
        }

        // Comments: # to end of line
        const commentMatch = text.match(/#.*/);
        if (commentMatch && commentMatch.index !== undefined) {
          decos.push(Decoration.mark({ class: 'cm-fm-comment' }).range(line.from + commentMatch.index, line.to));
        }

        // Strings: "..." or '...'
        const stringRe = /"[^"]*"|'[^']*'/g;
        let m: RegExpExecArray | null;
        while ((m = stringRe.exec(text)) !== null) {
          decos.push(Decoration.mark({ class: 'cm-fm-string' }).range(line.from + m.index!, line.from + m.index! + m[0].length));
        }

        // Booleans and null
        const boolRe = /\b(true|false|null)\b/g;
        while ((m = boolRe.exec(text)) !== null) {
          decos.push(Decoration.mark({ class: 'cm-fm-bool' }).range(line.from + m.index!, line.from + m.index! + m[0].length));
        }

        // Numbers and dates
        const numRe = /\b-?\d{4}-\d{2}-\d{2}|\b-?\d+(\.\d+)?\b/g;
        while ((m = numRe.exec(text)) !== null) {
          decos.push(Decoration.mark({ class: 'cm-fm-number' }).range(line.from + m.index!, line.from + m.index! + m[0].length));
        }
      }

      return Decoration.set(decos, true);
    }
  },
  { decorations: (v) => v.decorations }
);

// Helper: walk up from a DOM node to find the enclosing .cm-line element
function cmLineAt(view: EditorView, pos: number): Element | null {
  try {
    const info = view.domAtPos(pos);
    let el: Element | null = info.node instanceof Element ? info.node : (info.node as Node).parentElement;
    while (el && !el.classList.contains('cm-line')) el = el.parentElement;
    return el;
  } catch { return null; }
}

// Creates a fixed-position ghost clone of a removed line and plays the given animation.
// rect must be captured BEFORE the line is removed from the DOM.
function spawnLineGhost(node: HTMLElement, rect: DOMRect, contentDOM: HTMLElement, animName: string) {
  if (rect.height === 0) return;
  const ghost = node.cloneNode(true) as HTMLElement;
  const cs = window.getComputedStyle(contentDOM);
  Object.assign(ghost.style, {
    position: 'fixed',
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    fontFamily: cs.fontFamily,
    fontSize: cs.fontSize,
    lineHeight: cs.lineHeight,
    color: cs.color,
    backgroundColor: 'transparent',
    margin: '0', padding: '0',
    pointerEvents: 'none',
    zIndex: '9999',
    overflow: 'hidden',
    whiteSpace: 'pre',
    animation: `${animName} 0.15s ease-out forwards`,
  });
  document.body.appendChild(ghost);
  ghost.addEventListener('animationend', () => ghost.remove(), { once: true });
}

// Combined fold/unfold animation plugin.
//
// FOLD:
//   1. capture-phase mousedown on the fold gutter → snapshot all cm-line positions
//   2. ViewPlugin.update detects foldEffect → schedules a rAF (by then CM has
//      already updated the DOM) → spawns ghost clones for lines that disappeared
//
// UNFOLD:
//   ViewPlugin.update detects unfoldEffect → on next rAF finds the newly
//   rendered lines and applies a slide-in animation class.
const foldAnimationPlugin = ViewPlugin.fromClass(class {
  private lineSnapshots = new Map<Node, DOMRect>();
  private pendingFoldAnim = false;
  private gutterSnapshot: { rect: DOMRect; text: string; color: string; fontSize: string; fontFamily: string } | null = null;
  private onMousedown: (e: MouseEvent) => void;

  constructor(private view: EditorView) {
    this.onMousedown = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest('.cm-foldGutter')) return;

      const lane = view.lineBlockAtHeight(e.clientY - view.documentTop);
      let isFolded = false;
      foldedRanges(view.state).between(lane.from, lane.to, () => { isFolded = true; });
      if (isFolded) return; // click = unfold, skip
      if (!foldable(view.state, lane.from, lane.to)) return;  // nothing foldable

      // Snapshot the gutter icon element by Y position (more robust than target.closest)
      let gutterEl: HTMLElement | null = null;
      view.dom.querySelectorAll('.cm-foldGutter .cm-gutterElement').forEach(el => {
        const r = (el as HTMLElement).getBoundingClientRect();
        if (e.clientY >= r.top && e.clientY <= r.bottom) gutterEl = el as HTMLElement;
      });
      if (gutterEl) {
        const r = (gutterEl as HTMLElement).getBoundingClientRect();
        const cs = window.getComputedStyle(gutterEl as HTMLElement);
        this.gutterSnapshot = {
          rect: r,
          text: (gutterEl as HTMLElement).textContent ?? '',
          color: cs.color,
          fontSize: cs.fontSize,
          fontFamily: cs.fontFamily,
        };
      } else {
        this.gutterSnapshot = null;
      }

      // Snapshot every visible line's viewport rect BEFORE the fold happens
      this.lineSnapshots.clear();
      view.contentDOM.querySelectorAll('.cm-line').forEach(line => {
        this.lineSnapshots.set(line, (line as HTMLElement).getBoundingClientRect());
      });
      this.pendingFoldAnim = true;
    };
    // capture:true fires before any element-level handlers (incl. stopPropagation)
    view.dom.addEventListener('mousedown', this.onMousedown, { capture: true });
  }

  update(update: ViewUpdate) {
    let hasFold = false;
    let unfoldFrom = -1, unfoldTo = -1;

    for (const tr of update.transactions) {
      for (const eff of tr.effects) {
        if (eff.is(foldEffect))   hasFold = true;
        if (eff.is(unfoldEffect)) { unfoldFrom = eff.value.from; unfoldTo = eff.value.to; }
      }
    }

    // --- FOLD: CM updates the DOM synchronously inside dispatch, BEFORE update()
    //     returns, so we need rAF to run after the DOM is patched. ---
    if (hasFold && this.pendingFoldAnim) {
      this.pendingFoldAnim = false;
      const snapshots = new Map(this.lineSnapshots);
      this.lineSnapshots.clear();
      const gutterSnap = this.gutterSnapshot;
      this.gutterSnapshot = null;
      const contentDOM = update.view.contentDOM;
      requestAnimationFrame(() => {
        const currentLines = contentDOM.querySelectorAll('.cm-line');
        const currentSet = new Set(currentLines);
        // Ghost clones for removed lines
        for (const [node, rect] of snapshots) {
          if (!currentSet.has(node as Element)) {
            spawnLineGhost(node as HTMLElement, rect, contentDOM, 'cm-line-fold-out');
          }
        }
        // Ghost for the gutter fold icon (text/styles captured at mousedown, before CM changed them)
        if (gutterSnap) {
          const { rect, text, color, fontSize, fontFamily } = gutterSnap;
          if (text.trim()) {
            const ghost = document.createElement('div');
            ghost.textContent = text;
            Object.assign(ghost.style, {
              position: 'fixed',
              top: `${rect.top}px`,
              left: `${rect.left}px`,
              width: `${rect.width}px`,
              height: `${rect.height}px`,
              color,
              fontSize,
              fontFamily,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: '9999',
              animation: 'cm-line-fold-out 0.15s ease-out forwards',
            });
            document.body.appendChild(ghost);
            ghost.addEventListener('animationend', () => ghost.remove(), { once: true });
          }
        }
        // FLIP for lines that survived but moved up
        currentLines.forEach(line => {
          const el = line as HTMLElement;
          const oldRect = snapshots.get(el);
          if (!oldRect) return;
          const newRect = el.getBoundingClientRect();
          const dy = oldRect.top - newRect.top;
          if (Math.abs(dy) > 0.5) {
            el.style.transition = 'none';
            el.style.transform = `translateY(${dy}px)`;
            void el.offsetHeight;
            el.style.transition = 'transform 0.15s ease-out';
            el.style.transform = '';
            el.addEventListener('transitionend', () => {
              el.style.transition = '';
              el.style.transform = '';
            }, { once: true });
          }
        });
      });
    }

    // --- UNFOLD: snapshot pre-change positions here (before DOM patch),
    //     then in rAF: fade-in new lines + FLIP-animate lines pushed down ---
    if (unfoldFrom >= 0) {
      const view = update.view;
      const doc = view.state.doc;
      // Snapshot ALL line positions BEFORE the DOM update
      const preSnapshots = new Map<Element, DOMRect>();
      view.contentDOM.querySelectorAll('.cm-line').forEach(line => {
        preSnapshots.set(line, (line as HTMLElement).getBoundingClientRect());
      });

      requestAnimationFrame(() => {
        // Collect the newly revealed line elements
        const newlyRevealed = new Set<Element>();
        for (let pos = unfoldFrom; pos <= unfoldTo;) {
          const line = doc.lineAt(pos);
          const el = cmLineAt(view, line.from);
          if (el) newlyRevealed.add(el);
          pos = line.to + 1;
        }

        view.contentDOM.querySelectorAll('.cm-line').forEach(line => {
          const el = line as HTMLElement;
          if (newlyRevealed.has(el)) {
            // Newly revealed: slide in from above
            el.classList.remove('cm-line-unfolding');
            void el.offsetHeight;
            el.classList.add('cm-line-unfolding');
            el.addEventListener('animationend', () => el.classList.remove('cm-line-unfolding'), { once: true });
          } else {
            // Existing line: FLIP if it moved
            const oldRect = preSnapshots.get(el);
            if (!oldRect) return;
            const newRect = el.getBoundingClientRect();
            const dy = oldRect.top - newRect.top;
            if (Math.abs(dy) > 0.5) {
              el.style.transition = 'none';
              el.style.transform = `translateY(${dy}px)`;
              void el.offsetHeight; // force reflow
              el.style.transition = 'transform 0.15s ease-out';
              el.style.transform = '';
              el.addEventListener('transitionend', () => {
                el.style.transition = '';
                el.style.transform = '';
              }, { once: true });
            }
          }
        });
      });
    }
  }

  destroy() {
    this.view.dom.removeEventListener('mousedown', this.onMousedown, true);
  }
});

// foldService: allows folding from the first --- to the closing ---
const frontMatterFoldService = foldService.of((state, lineStart) => {
  const fm = state.field(frontMatterRangeField);
  if (!fm) return null;
  const firstLine = state.doc.lineAt(fm.from);
  if (lineStart !== firstLine.from) return null;
  // Fold from end of first delimiter line to end of last delimiter line
  return { from: firstLine.to, to: fm.to };
});

// --- End Front Matter Support ---

const CodeMirrorEditor = forwardRef<CodeMirrorHandle, CodeMirrorEditorProps>(({
  value,
  onChange,
  placeholder,
  scrollToLine,
  onEditorReady,
  viewTheme,
  onToggleTheme,
  saveStatus,
  documentId,
  onScrollLineChange,
  columnWidth,
  onColumnWidthChange,
  documentPath,
  onImagePasted,
}, ref) => {
  const { i18n, t } = useTranslation();
  const { theme: globalTheme } = useTheme();
  // Use viewTheme if provided, otherwise fall back to global theme
  const theme = viewTheme ?? globalTheme;
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [characterCount, setCharacterCount] = useState(0);
  const [spellcheckEnabled, setSpellcheckEnabled] = useState(true);
  const [spellcheckLanguage, setSpellcheckLanguage] = useState(i18n.language);
  const [editorZoom, setEditorZoom] = useState(EDITOR_DEFAULT_ZOOM);
  const editorZoomRef = useRef(EDITOR_DEFAULT_ZOOM);
  editorZoomRef.current = editorZoom;
  const previousDocumentIdRef = useRef<string | null | undefined>(documentId);
  // Always holds the current translation for the fold placeholder tooltip.
  // Updated every render so placeholderDOM always reads the latest language.
  const unfoldLabelRef = useRef('');
  unfoldLabelRef.current = t('tooltips.unfold', 'Expandir');

  // Sync module-level vars used by the paste handler (same pattern as plainPasteMode)
  _pasteImageDocPath = documentPath ?? null;
  _pasteImageCallback = onImagePasted ?? null;

  // Keep module-level search panel labels in sync with the current language.
  // Updated every render (same pattern as unfoldLabelRef) so the panel always
  // shows fresh labels the next time it is opened.
  _searchLabels.searchPlaceholder  = t('searchPanel.searchPlaceholder', 'Buscar...');
  _searchLabels.replacePlaceholder = t('searchPanel.replacePlaceholder', 'Substituir...');
  _searchLabels.next               = t('searchPanel.next', 'Próximo');
  _searchLabels.previous           = t('searchPanel.previous', 'Anterior');
  _searchLabels.all                = t('searchPanel.all', 'Todos');
  _searchLabels.matchCase          = t('searchPanel.matchCase', 'Aa');
  _searchLabels.regexp             = t('searchPanel.regexp', '.*');
  _searchLabels.wholeWord          = t('searchPanel.wholeWord', 'Palavra');
  _searchLabels.replace            = t('searchPanel.replace', 'Substituir');
  _searchLabels.replaceAll         = t('searchPanel.replaceAll', 'Subs. todos');

  // Deferred state update refs - batch React state updates to avoid
  // synchronous re-renders during CodeMirror transactions (prevents scroll jumps)
  const pendingCharCount = useRef<number | null>(null);
  const pendingCursorPos = useRef<{ line: number; column: number } | null>(null);
  const infoBarRafId = useRef(0);

  // Use ref to always have access to the latest onChange callback
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Track last content sent via onChange to distinguish round-trip updates from external changes
  const lastSentContent = useRef(value);

  // Ref for scroll line callback
  const onScrollLineChangeRef = useRef(onScrollLineChange);
  useEffect(() => {
    onScrollLineChangeRef.current = onScrollLineChange;
  }, [onScrollLineChange]);

  // Get theme extensions based on current theme
  const getThemeExtensions = useCallback((isDark: boolean) => {
    return isDark
      ? [darkTheme, syntaxHighlighting(darkHighlighting)]
      : [lightTheme, syntaxHighlighting(lightHighlighting)];
  }, []);

  // Expose textarea-like API through ref
  useImperativeHandle(ref, () => ({
    get selectionStart() {
      return viewRef.current?.state.selection.main.from ?? 0;
    },
    get selectionEnd() {
      return viewRef.current?.state.selection.main.to ?? 0;
    },
    focus() {
      viewRef.current?.focus();
    },
    setSelectionRange(start: number, end: number) {
      if (viewRef.current) {
        viewRef.current.dispatch({
          selection: { anchor: start, head: end },
          scrollIntoView: true,
        });
      }
    },
    // Direct CodeMirror operations with undo support
    replaceRange(from: number, to: number, text: string) {
      if (viewRef.current) {
        viewRef.current.dispatch({
          changes: { from, to, insert: text },
        });
      }
    },
    getValue() {
      return viewRef.current?.state.doc.toString() ?? '';
    },
    scrollToOffset(offset: number) {
      const view = viewRef.current;
      if (!view) return;

      const docLength = view.state.doc.length;
      const clampedOffset = Math.max(0, Math.min(offset, docLength));
      const line = view.state.doc.lineAt(clampedOffset);

      // Move cursor, scroll to center, and flash highlight
      view.dispatch({
        selection: { anchor: clampedOffset },
        effects: [
          EditorView.scrollIntoView(clampedOffset, { y: 'start', yMargin: view.scrollDOM.clientHeight * 0.3 }),
          flashLineEffect.of({ from: line.from, to: line.to }),
        ],
      });

      // Remove decoration after animation
      setTimeout(() => {
        if (viewRef.current) {
          viewRef.current.dispatch({
            effects: flashLineEffect.of(null),
          });
        }
      }, 850);

      view.focus();
    },
    scrollToLineTop(lineNumber: number) {
      const view = viewRef.current;
      if (!view) return;
      const clampedLine = Math.max(1, Math.min(Math.floor(lineNumber), view.state.doc.lines));
      const line = view.state.doc.line(clampedLine);
      view.dispatch({
        effects: EditorView.scrollIntoView(line.from, { y: 'start', yMargin: 0 }),
      });
    },
    scrollToFraction(fraction: number, isScrollingDown?: boolean) {
      const view = viewRef.current;
      if (!view) return;
      const f = Math.max(0, Math.min(1, fraction));
      const maxScroll = view.scrollDOM.scrollHeight - view.scrollDOM.clientHeight;
      let target = Math.round(f * maxScroll);
      // Monotonic constraint: CM's scrollHeight can change as virtualized
      // lines are measured, causing fraction * maxScroll to jump backward.
      // Enforce same-direction scrolling to prevent this.
      if (isScrollingDown === true) {
        target = Math.max(target, view.scrollDOM.scrollTop);
      } else if (isScrollingDown === false) {
        target = Math.min(target, view.scrollDOM.scrollTop);
      }
      view.scrollDOM.scrollTop = target;
    },
    getScrollTop() {
      return viewRef.current?.scrollDOM.scrollTop ?? 0;
    },
    setScrollTop(top: number) {
      if (viewRef.current) {
        viewRef.current.scrollDOM.scrollTop = top;
      }
    },
    getCursorLine() {
      const view = viewRef.current;
      if (!view) return 1;
      const pos = view.state.selection.main.head;
      return view.state.doc.lineAt(pos).number;
    },
    openSearch() {
      const view = viewRef.current;
      if (view) openSearchPanel(view);
    },
  }));

  // Flush pending info bar updates in a single RAF (avoids synchronous
  // React re-renders during CodeMirror transactions which cause scroll jumps)
  const scheduleInfoBarUpdate = useCallback(() => {
    if (infoBarRafId.current) return; // already scheduled
    infoBarRafId.current = requestAnimationFrame(() => {
      infoBarRafId.current = 0;
      if (pendingCharCount.current !== null) {
        setCharacterCount(pendingCharCount.current);
        pendingCharCount.current = null;
      }
      if (pendingCursorPos.current !== null) {
        setCursorPosition(pendingCursorPos.current);
        pendingCursorPos.current = null;
      }
    });
  }, []);

  // Update cursor position (deferred via RAF)
  const updateCursorPosition = useCallback((view: EditorView) => {
    const pos = view.state.selection.main.head;
    const line = view.state.doc.lineAt(pos);
    pendingCursorPos.current = {
      line: line.number,
      column: pos - line.from + 1,
    };
    scheduleInfoBarUpdate();
  }, [scheduleInfoBarUpdate]);

  // Get spellcheck content attributes
  const getSpellcheckAttrs = useCallback(() => {
    if (!spellcheckEnabled) {
      return EditorView.contentAttributes.of({ spellcheck: 'false' });
    }
    return EditorView.contentAttributes.of({
      spellcheck: 'true',
      lang: spellcheckLanguage,
    });
  }, [spellcheckEnabled, spellcheckLanguage]);

  const handleEditorZoomIn = useCallback(() => {
    setEditorZoom(prev => {
      const idx = EDITOR_ZOOM_LEVELS.indexOf(prev);
      return idx < EDITOR_ZOOM_LEVELS.length - 1 ? EDITOR_ZOOM_LEVELS[idx + 1] : prev;
    });
  }, []);

  const handleEditorZoomOut = useCallback(() => {
    setEditorZoom(prev => {
      const idx = EDITOR_ZOOM_LEVELS.indexOf(prev);
      return idx > 0 ? EDITOR_ZOOM_LEVELS[idx - 1] : prev;
    });
  }, []);

  const handleEditorZoomReset = useCallback(() => {
    setEditorZoom(EDITOR_DEFAULT_ZOOM);
  }, []);

  // Initialize editor
  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined' || !editorRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const newContent = update.state.doc.toString();
        // During IME composition (dead keys, accents), DON'T propagate to React.
        // This prevents a race condition where intermediate composition content
        // gets dispatched back from React's stale render, overwriting the final
        // composed character (e.g., eating accented letters like á, é, ó).
        if (!update.view.composing) {
          lastSentContent.current = newContent;
          onChangeRef.current(newContent);
        }
        // Defer character count update to avoid synchronous re-render during CM transaction
        pendingCharCount.current = newContent.length;
        scheduleInfoBarUpdate();
      }
      if (update.selectionSet) {
        updateCursorPosition(update.view);
      }
    });

    const isDark = theme === 'dark';
    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        drawSelection(),
        tightSelectionLayer,
        history(),
        formatKeymap,
        toggleSearchKeymap,
        closeBrackets(),
        search({ createPanel: createLocalizedSearchPanel }),
        keymap.of([
          ...searchKeymap,
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          indentWithTab,
        ]),
        markdown({
          base: markdownLanguage,
          codeLanguages: languages,
        }),
        themeCompartment.of(getThemeExtensions(isDark)),
        fontSizeCompartment.of(getFontSizeExtension(editorZoomRef.current)),
        updateListener,
        EditorView.lineWrapping,
        placeholder ? EditorView.contentAttributes.of({ 'data-placeholder': placeholder }) : [],
        spellcheckCompartment.of(getSpellcheckAttrs()),
        flashHighlightField,
        frontMatterRangeField,
        frontMatterPlugin,
        frontMatterFoldService,
        codeFolding({
          placeholderDOM(_view, onclick) {
            const el = document.createElement('span');
            el.textContent = '…';
            el.className = 'cm-foldPlaceholder';
            el.title = unfoldLabelRef.current;
            el.setAttribute('aria-label', unfoldLabelRef.current);
            el.onclick = onclick;
            return el;
          },
        }),
        foldAnimationPlugin,
        foldGutter(),
        codeBlockAutocomplete,
        smartTypography,
        pasteLinkHandler,
        scrollPastEnd(),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;
    setCharacterCount(value.length);
    updateCursorPosition(view);

    if (onEditorReady) {
      onEditorReady(view);
    }

    // Safety net: after IME composition ends, ensure React gets the final content.
    // Some browser/IME combos may not fire a docChanged after compositionend.
    const handleCompositionEnd = () => {
      requestAnimationFrame(() => {
        const v = viewRef.current;
        if (!v) return;
        const content = v.state.doc.toString();
        if (content !== lastSentContent.current) {
          lastSentContent.current = content;
          onChangeRef.current(content);
        }
      });
    };
    view.contentDOM.addEventListener('compositionend', handleCompositionEnd);

    // Image drag-and-drop from the FileBrowser sidebar.
    // We register listeners in the CAPTURE phase so they fire before CodeMirror's
    // internal drop handler (which would otherwise steal focus / clear the selection).
    const handleImageDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes('application/x-md-image')) {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleImageDrop = (e: DragEvent) => {
      const data = e.dataTransfer?.getData('application/x-md-image');
      if (!data) return;
      e.preventDefault();
      e.stopPropagation();
      try {
        const { name } = JSON.parse(data) as { name: string };
        const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
        if (pos === null) return;
        const text = `![${name}](${name})`;
        view.dispatch({
          changes: { from: pos, to: pos, insert: text },
          selection: { anchor: pos + text.length },
        });
        // Defer focus so the browser finishes the drag-end sequence (dragend event on the
        // source element fires after drop returns, which can remove focus we just set).
        requestAnimationFrame(() => view.focus());
      } catch { /* ignore malformed data */ }
    };

    view.dom.addEventListener('dragover', handleImageDragOver, { capture: true });
    view.dom.addEventListener('drop', handleImageDrop, { capture: true });

    return () => {
      view.dom.removeEventListener('dragover', handleImageDragOver, { capture: true });
      view.dom.removeEventListener('drop', handleImageDrop, { capture: true });
      view.contentDOM.removeEventListener('compositionend', handleCompositionEnd);
      view.destroy();
      viewRef.current = null;
      if (infoBarRafId.current) cancelAnimationFrame(infoBarRafId.current);
    };
  }, []); // Only run once on mount

  // Update spellcheck when settings change
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    view.dispatch({
      effects: spellcheckCompartment.reconfigure(getSpellcheckAttrs()),
    });
  }, [spellcheckEnabled, spellcheckLanguage, getSpellcheckAttrs]);

  // Update theme when it changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const isDark = theme === 'dark';
    view.dispatch({
      effects: themeCompartment.reconfigure(getThemeExtensions(isDark)),
    });
  }, [theme, getThemeExtensions]);

  // Update font size when zoom changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({ effects: fontSizeCompartment.reconfigure(getFontSizeExtension(editorZoom)) });
  }, [editorZoom]);

  // Sync external value changes (e.g., when switching tabs or loading a file)
  // Use Transaction.addToHistory.of(false) to prevent this from being undoable
  // Skip round-trip updates (CM6 → onChange → React state → value prop → here)
  // Only sync when value comes from an external source (tab switch, file load)
  useEffect(() => {
    const view = viewRef.current;
    if (!view || view.composing) return;

    // If this value matches what we last sent via onChange, it's a round-trip → skip
    if (value === lastSentContent.current) return;

    const currentContent = view.state.doc.toString();
    if (currentContent !== value) {
      // Preserve scroll position to avoid jumps during external content sync
      const scrollTop = view.scrollDOM.scrollTop;

      // Preserve cursor/selection position when replacing content
      const currentSelection = view.state.selection;
      const newLength = value.length;

      // Clamp selection ranges to the new document length
      const clampedSelection = EditorSelection.create(
        currentSelection.ranges.map(range => {
          const anchor = Math.min(range.anchor, newLength);
          const head = Math.min(range.head, newLength);
          return EditorSelection.range(anchor, head);
        }),
        currentSelection.mainIndex
      );

      // Update ref so the updateListener's onChange for this dispatch is recognized as round-trip
      lastSentContent.current = value;

      view.dispatch({
        changes: {
          from: 0,
          to: currentContent.length,
          insert: value,
        },
        selection: clampedSelection,
        annotations: Transaction.addToHistory.of(false),
      });

      // Restore scroll position after the dispatch to prevent jumps
      view.scrollDOM.scrollTop = scrollTop;
    }
  }, [value]);

  // Emit top visible line number from editor's scroll container
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const scrollDOM = view.scrollDOM;
    let rafId = 0;

    const handleScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        const block = view.lineBlockAtHeight(scrollDOM.scrollTop);
        const topLine = view.state.doc.lineAt(block.from).number;
        const lineOffset = block.height > 0
          ? (scrollDOM.scrollTop - block.top) / block.height
          : 0;
        onScrollLineChangeRef.current?.(topLine + lineOffset);
      });
    };

    scrollDOM.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      scrollDOM.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []); // Attach once after mount

  // Clear undo history when switching documents
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    // Only clear history when documentId actually changes (not on initial mount)
    if (previousDocumentIdRef.current !== documentId && previousDocumentIdRef.current !== undefined) {
      // Create a new state with the current content but fresh history
      const currentContent = view.state.doc.toString();
      const isDark = theme === 'dark';

      const newState = EditorState.create({
        doc: currentContent,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          drawSelection(),
          tightSelectionLayer,
          history(),
          formatKeymap,
          closeBrackets(),
          search({ createPanel: createLocalizedSearchPanel }),
          keymap.of([
            ...searchKeymap,
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...historyKeymap,
            indentWithTab,
          ]),
          markdown({
            base: markdownLanguage,
            codeLanguages: languages,
          }),
          themeCompartment.of(getThemeExtensions(isDark)),
          fontSizeCompartment.of(getFontSizeExtension(editorZoomRef.current)),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              const newContent = update.state.doc.toString();
              if (!update.view.composing) {
                lastSentContent.current = newContent;
                onChangeRef.current(newContent);
              }
              pendingCharCount.current = newContent.length;
              scheduleInfoBarUpdate();
            }
            if (update.selectionSet) {
              updateCursorPosition(update.view);
            }
          }),
          EditorView.lineWrapping,
          spellcheckCompartment.of(getSpellcheckAttrs()),
          flashHighlightField,
          frontMatterRangeField,
          frontMatterPlugin,
          frontMatterFoldService,
          codeFolding({
            placeholderDOM(_view, onclick) {
              const el = document.createElement('span');
              el.textContent = '…';
              el.className = 'cm-foldPlaceholder';
              el.title = unfoldLabelRef.current;
              el.setAttribute('aria-label', unfoldLabelRef.current);
              el.onclick = onclick;
              return el;
            },
          }),
          foldGutter(),
          foldAnimationPlugin,
          codeBlockAutocomplete,
          smartTypography,
          pasteLinkHandler,
          scrollPastEnd(),
        ],
      });

      view.setState(newState);
    }

    previousDocumentIdRef.current = documentId;
  }, [documentId, theme, getThemeExtensions, getSpellcheckAttrs, updateCursorPosition]);

  // Update existing fold placeholder tooltips when language changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const label = unfoldLabelRef.current;
    view.dom.querySelectorAll('.cm-foldPlaceholder').forEach(el => {
      (el as HTMLElement).title = label;
      el.setAttribute('aria-label', label);
    });
    // Reopen search panel if it is currently open so labels refresh immediately
    if (searchPanelOpen(view.state)) {
      closeSearchPanel(view);
      openSearchPanel(view);
    }
  }, [i18n.language]);

  // Scroll to line with flash highlight effect
  useEffect(() => {
    if (!scrollToLine || !viewRef.current) return;

    const view = viewRef.current;
    const lineNumber = Math.min(scrollToLine, view.state.doc.lines);
    const line = view.state.doc.line(lineNumber);

    // Scroll to center and flash highlight
    view.dispatch({
      selection: { anchor: line.from },
      effects: [
        EditorView.scrollIntoView(line.from, { y: 'start', yMargin: view.scrollDOM.clientHeight * 0.3 }),
        flashLineEffect.of({ from: line.from, to: line.to }),
      ],
    });

    // Remove decoration after animation completes (800ms)
    const timeout = setTimeout(() => {
      if (viewRef.current) {
        viewRef.current.dispatch({
          effects: flashLineEffect.of(null),
        });
      }
    }, 850);

    view.focus();

    return () => clearTimeout(timeout);
  }, [scrollToLine]);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-code)]">
      {/* Editor Area */}
      <div ref={editorRef} className="flex-1 overflow-hidden" suppressHydrationWarning />

      {/* Info Bar */}
      <InfoBar
        line={cursorPosition.line}
        column={cursorPosition.column}
        characters={characterCount}
        spellcheckEnabled={spellcheckEnabled}
        spellcheckLanguage={spellcheckLanguage}
        onSpellcheckToggle={setSpellcheckEnabled}
        onSpellcheckLanguageChange={setSpellcheckLanguage}
        viewTheme={theme}
        onToggleTheme={onToggleTheme}
        saveStatus={saveStatus}
        columnWidth={columnWidth}
        onColumnWidthChange={onColumnWidthChange}
        editorZoom={editorZoom}
        onEditorZoomIn={handleEditorZoomIn}
        onEditorZoomOut={handleEditorZoomOut}
        onEditorZoomReset={handleEditorZoomReset}
      />
    </div>
  );
});

CodeMirrorEditor.displayName = 'CodeMirrorEditor';

export default CodeMirrorEditor;
