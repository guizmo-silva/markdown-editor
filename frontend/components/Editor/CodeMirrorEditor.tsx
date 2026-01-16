'use client';

import { useEffect, useRef, useCallback, useState, useImperativeHandle, forwardRef } from 'react';
import { EditorState, Compartment, StateEffect, StateField } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightActiveLine, Decoration, DecorationSet } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { useTranslation } from 'react-i18next';
import InfoBar from './InfoBar';

// Interface to expose textarea-like API for compatibility with Toolbar
export interface CodeMirrorHandle {
  selectionStart: number;
  selectionEnd: number;
  focus: () => void;
  setSelectionRange: (start: number, end: number) => void;
}

interface CodeMirrorEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  scrollToLine?: number;
  onEditorReady?: (view: EditorView) => void;
}

// Markdown syntax highlighting for light mode (bg: #D8D8D8)
const markdownHighlighting = HighlightStyle.define([
  // Headers - darker and bold
  { tag: tags.heading1, color: '#1a1a1a', fontWeight: 'bold' },
  { tag: tags.heading2, color: '#1a1a1a', fontWeight: 'bold' },
  { tag: tags.heading3, color: '#2a2a2a', fontWeight: 'bold' },
  { tag: tags.heading4, color: '#3a3a3a', fontWeight: 'bold' },
  { tag: tags.heading5, color: '#3a3a3a', fontWeight: 'bold' },
  { tag: tags.heading6, color: '#4a4a4a', fontWeight: 'bold' },

  // Emphasis
  { tag: tags.emphasis, fontStyle: 'italic', color: '#4a4a4a' },
  { tag: tags.strong, fontWeight: 'bold', color: '#2a2a2a' },
  { tag: tags.strikethrough, textDecoration: 'line-through', color: '#888888' },

  // Code - inline and blocks
  { tag: tags.monospace, fontFamily: 'Roboto Mono, monospace', backgroundColor: 'rgba(0,0,0,0.1)', color: '#c7254e' },

  // Links
  { tag: tags.link, color: '#0066cc', textDecoration: 'underline' },
  { tag: tags.url, color: '#0066cc' },

  // Lists
  { tag: tags.list, color: '#555555' },

  // Quotes
  { tag: tags.quote, color: '#555555', fontStyle: 'italic' },

  // Meta characters (markdown symbols like #, *, _, etc.)
  { tag: tags.processingInstruction, color: '#999999' },
  { tag: tags.meta, color: '#999999' },

  // Content - base text
  { tag: tags.content, color: '#404040' },

  // Comments
  { tag: tags.comment, color: '#999999', fontStyle: 'italic' },
]);

// Custom theme matching your app's design
const editorTheme = EditorView.theme({
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
    minWidth: '40px',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#D8D8D8',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  '.cm-selectionBackground': {
    backgroundColor: 'rgba(0, 0, 0, 0.15) !important',
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: 'rgba(0, 0, 0, 0.2) !important',
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
  // Flash highlight for navigation
  '.cm-flash-highlight': {
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    transition: 'background-color 0.5s ease-out',
  },
  '.cm-flash-highlight-fade': {
    backgroundColor: 'transparent',
  },
});

// Compartment for dynamic spellcheck configuration
const spellcheckCompartment = new Compartment();

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
}, ref) => {
  const { i18n } = useTranslation();
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [characterCount, setCharacterCount] = useState(0);
  const [spellcheckEnabled, setSpellcheckEnabled] = useState(true);
  const [spellcheckLanguage, setSpellcheckLanguage] = useState(i18n.language);

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
        });
      }
    },
  }));

  // Update cursor position
  const updateCursorPosition = useCallback((view: EditorView) => {
    const pos = view.state.selection.main.head;
    const line = view.state.doc.lineAt(pos);
    setCursorPosition({
      line: line.number,
      column: pos - line.from + 1,
    });
  }, []);

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
        onChange(newContent);
        setCharacterCount(newContent.length);
      }
      if (update.selectionSet) {
        updateCursorPosition(update.view);
      }
    });

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        history(),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          indentWithTab,
        ]),
        markdown({
          base: markdownLanguage,
          codeLanguages: languages,
        }),
        syntaxHighlighting(markdownHighlighting),
        editorTheme,
        updateListener,
        EditorView.lineWrapping,
        placeholder ? EditorView.contentAttributes.of({ 'data-placeholder': placeholder }) : [],
        spellcheckCompartment.of(getSpellcheckAttrs()),
        flashHighlightField,
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

    return () => {
      view.destroy();
      viewRef.current = null;
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

  // Sync external value changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentContent = view.state.doc.toString();
    if (currentContent !== value) {
      view.dispatch({
        changes: {
          from: 0,
          to: currentContent.length,
          insert: value,
        },
      });
    }
  }, [value]);

  // Scroll to line with flash highlight effect
  useEffect(() => {
    if (!scrollToLine || !viewRef.current) return;

    const view = viewRef.current;
    const lineNumber = Math.min(scrollToLine, view.state.doc.lines);
    const line = view.state.doc.line(lineNumber);

    // Scroll and select
    view.dispatch({
      selection: { anchor: line.from },
      scrollIntoView: true,
    });

    // Add flash highlight
    view.dispatch({
      effects: flashLineEffect.of({ from: line.from, to: line.to }),
    });

    // Remove flash highlight after animation
    const timeout = setTimeout(() => {
      if (viewRef.current) {
        viewRef.current.dispatch({
          effects: flashLineEffect.of(null),
        });
      }
    }, 600);

    view.focus();

    return () => clearTimeout(timeout);
  }, [scrollToLine]);

  return (
    <div className="flex flex-col h-full bg-[#D8D8D8]">
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
      />
    </div>
  );
});

CodeMirrorEditor.displayName = 'CodeMirrorEditor';

export default CodeMirrorEditor;
