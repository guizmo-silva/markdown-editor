'use client';

import { useRef, useState, useCallback, useEffect, forwardRef } from 'react';
import InfoBar from './InfoBar';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  scrollToLine?: number;
}

const CodeEditor = forwardRef<HTMLTextAreaElement, CodeEditorProps>(
  ({ value, onChange, placeholder, scrollToLine }, forwardedRef) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [characterCount, setCharacterCount] = useState(0);
  const [spellcheckEnabled, setSpellcheckEnabled] = useState(false);
  const [spellcheckLanguage, setSpellcheckLanguage] = useState('pt-BR');

  // Sync forwarded ref with internal ref
  useEffect(() => {
    if (forwardedRef) {
      if (typeof forwardedRef === 'function') {
        forwardedRef(textareaRef.current);
      } else {
        (forwardedRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = textareaRef.current;
      }
    }
  }, [forwardedRef]);

  // Calculate line count
  const lineCount = value.split('\n').length;

  // Update cursor position
  const updateCursorPosition = useCallback(() => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const lines = textBeforeCursor.split('\n');
    const line = lines.length;
    const column = lines[lines.length - 1].length + 1;

    setCursorPosition({ line, column });
  }, [value]);

  // Update character count
  useEffect(() => {
    setCharacterCount(value.length);
  }, [value]);

  // Scroll to specific line when requested
  useEffect(() => {
    if (scrollToLine && textareaRef.current) {
      const textarea = textareaRef.current;
      const lines = value.split('\n');

      // Calculate character position at the start of the target line
      let charPosition = 0;
      for (let i = 0; i < scrollToLine - 1 && i < lines.length; i++) {
        charPosition += lines[i].length + 1; // +1 for newline
      }

      // Set cursor to the start of the line
      textarea.focus();
      textarea.setSelectionRange(charPosition, charPosition);

      // Scroll the line into view
      const lineHeight = 20; // matches leading-[20px]
      const targetScrollTop = (scrollToLine - 1) * lineHeight - textarea.clientHeight / 2 + lineHeight;
      textarea.scrollTop = Math.max(0, targetScrollTop);

      updateCursorPosition();
    }
  }, [scrollToLine, value, updateCursorPosition]);

  // Handle text change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  // Sync scroll between line numbers and textarea
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Handle keyboard events for cursor position updates
  const handleKeyUp = () => {
    updateCursorPosition();
  };

  const handleClick = () => {
    updateCursorPosition();
  };

  // Handle tab key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.substring(0, start) + '\t' + value.substring(end);

      onChange(newValue);

      // Set cursor position after the tab
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1;
        updateCursorPosition();
      }, 0);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#D8D8D8]">
      {/* Editor Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Line Numbers */}
        <div
          ref={lineNumbersRef}
          className="flex-shrink-0 w-[50px] bg-[#E9E9E9] overflow-hidden select-none"
          style={{ fontFamily: 'Roboto Mono, monospace' }}
        >
          <div className="text-[12px] leading-[20px] text-[#999999] text-right pr-2 pt-2">
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i + 1}>{i + 1}</div>
            ))}
          </div>
        </div>

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onScroll={handleScroll}
          onKeyUp={handleKeyUp}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-[#D8D8D8] text-[#666666] text-[12px] leading-[20px] p-2 resize-none outline-none overflow-auto"
          style={{
            fontFamily: 'Roboto Mono, monospace',
            tabSize: 2,
          }}
          spellCheck={false}
        />
      </div>

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

CodeEditor.displayName = 'CodeEditor';

export default CodeEditor;
