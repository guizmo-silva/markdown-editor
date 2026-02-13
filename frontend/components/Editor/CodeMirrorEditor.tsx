'use client';

import { useEffect, useRef, useCallback, useState, useImperativeHandle, forwardRef } from 'react';
import { EditorState, EditorSelection, Compartment, StateEffect, StateField, Transaction } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightActiveLine, scrollPastEnd, Decoration, DecorationSet } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { autocompletion, CompletionContext, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/components/ThemeProvider';
import InfoBar from './InfoBar';

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
  { tag: tags.list, color: '#555555' },
  { tag: tags.quote, color: '#555555', fontStyle: 'italic' },
  { tag: tags.processingInstruction, color: '#999999' },
  { tag: tags.meta, color: '#999999' },
  { tag: tags.content, color: '#404040' },
  { tag: tags.comment, color: '#999999', fontStyle: 'italic' },
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
  { tag: tags.list, color: '#CCCCCC' },
  { tag: tags.quote, color: '#AAAAAA', fontStyle: 'italic' },
  { tag: tags.processingInstruction, color: '#888888' },
  { tag: tags.meta, color: '#888888' },
  { tag: tags.content, color: '#BEBEBE' },
  { tag: tags.comment, color: '#777777', fontStyle: 'italic' },
]);

// Light theme for CodeMirror
const lightTheme = EditorView.theme({
  '&': {
    backgroundColor: '#D8D8D8',
    height: '100%',
  },
  '.cm-content': {
    fontFamily: 'Roboto Mono, monospace',
    fontSize: '12px',
    lineHeight: '20px',
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
    border: 'none',
    fontFamily: 'Roboto Mono, monospace',
    fontSize: '12px',
    lineHeight: '20px',
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
  '.cm-selectionBackground': {
    backgroundColor: '#B0B0B0 !important',
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: '#A0A0A0 !important',
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
});

// Dark theme for CodeMirror
const darkTheme = EditorView.theme({
  '&': {
    backgroundColor: '#272727',
    height: '100%',
  },
  '.cm-content': {
    fontFamily: 'Roboto Mono, monospace',
    fontSize: '12px',
    lineHeight: '20px',
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
    border: 'none',
    fontFamily: 'Roboto Mono, monospace',
    fontSize: '12px',
    lineHeight: '20px',
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
  '.cm-selectionBackground': {
    backgroundColor: '#555555 !important',
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: '#606060 !important',
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

// Compartment for dynamic theme switching
const themeCompartment = new Compartment();

// Compartment for dynamic spellcheck configuration
const spellcheckCompartment = new Compartment();

// Helper function to create format toggle commands for keyboard shortcuts
const createFormatCommand = (prefix: string, suffix: string) => {
  return (view: EditorView): boolean => {
    const { from, to } = view.state.selection.main;
    const selectedText = view.state.sliceDoc(from, to);

    // Check if text is already formatted by looking at surrounding characters
    const beforeText = view.state.sliceDoc(Math.max(0, from - prefix.length), from);
    const afterText = view.state.sliceDoc(to, to + suffix.length);

    if (beforeText === prefix && afterText === suffix) {
      // Remove formatting
      view.dispatch({
        changes: [
          { from: from - prefix.length, to: from, insert: '' },
          { from: to, to: to + suffix.length, insert: '' }
        ],
        selection: { anchor: from - prefix.length, head: to - prefix.length }
      });
    } else {
      // Add formatting
      view.dispatch({
        changes: { from, to, insert: prefix + selectedText + suffix },
        selection: { anchor: from + prefix.length, head: to + prefix.length }
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

// Keymap for formatting shortcuts (Mod = Ctrl on Windows/Linux, Cmd on macOS)
const formatKeymap = keymap.of([
  { key: 'Mod-b', run: createFormatCommand('**', '**') },   // Bold
  { key: 'Mod-i', run: createFormatCommand('*', '*') },     // Italic
  { key: 'Mod-Shift-x', run: createFormatCommand('~~', '~~') }, // Strikethrough
  { key: 'Mod-k', run: linkCommand },                        // Link
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
}, ref) => {
  const { i18n } = useTranslation();
  const { theme: globalTheme } = useTheme();
  // Use viewTheme if provided, otherwise fall back to global theme
  const theme = viewTheme ?? globalTheme;
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [characterCount, setCharacterCount] = useState(0);
  const [spellcheckEnabled, setSpellcheckEnabled] = useState(true);
  const [spellcheckLanguage, setSpellcheckLanguage] = useState(i18n.language);
  const previousDocumentIdRef = useRef<string | null | undefined>(documentId);

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
          EditorView.scrollIntoView(clampedOffset, { y: 'center' }),
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
        history(),
        formatKeymap,
        closeBrackets(),
        keymap.of([
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
        updateListener,
        EditorView.lineWrapping,
        placeholder ? EditorView.contentAttributes.of({ 'data-placeholder': placeholder }) : [],
        spellcheckCompartment.of(getSpellcheckAttrs()),
        flashHighlightField,
        codeBlockAutocomplete,
        smartTypography,
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

    return () => {
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
          history(),
          formatKeymap,
          closeBrackets(),
          keymap.of([
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
          codeBlockAutocomplete,
          smartTypography,
          scrollPastEnd(),
        ],
      });

      view.setState(newState);
    }

    previousDocumentIdRef.current = documentId;
  }, [documentId, theme, getThemeExtensions, getSpellcheckAttrs, updateCursorPosition]);

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
        EditorView.scrollIntoView(line.from, { y: 'center' }),
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
      />
    </div>
  );
});

CodeMirrorEditor.displayName = 'CodeMirrorEditor';

export default CodeMirrorEditor;
