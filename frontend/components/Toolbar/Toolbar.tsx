'use client';

import { RefObject, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { CodeMirrorHandle } from '@/components/Editor';
import { useThemedIcon } from '@/utils/useThemedIcon';

// Unified interface for textarea-like editors
interface EditorHandle {
  selectionStart: number;
  selectionEnd: number;
  focus: () => void;
  setSelectionRange: (start: number, end: number) => void;
  // Optional: Direct CodeMirror operations (supports undo/redo)
  replaceRange?: (from: number, to: number, text: string) => void;
  getValue?: () => string;
}

interface ToolbarProps {
  textareaRef: RefObject<HTMLTextAreaElement | CodeMirrorHandle | null>;
  value: string;
  onChange: (value: string) => void;
}

export default function Toolbar({
  textareaRef,
  value,
  onChange
}: ToolbarProps) {
  const { t } = useTranslation();
  const { getIconPath } = useThemedIcon();
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);
  const [showAlertMenu, setShowAlertMenu] = useState(false);
  const [showCharMenu, setShowCharMenu] = useState(false);

  // Helper to get editor handle (works with both textarea and CodeMirror)
  const getEditor = (): EditorHandle | null => {
    return textareaRef.current as EditorHandle | null;
  };
  const [showQuoteMenu, setShowQuoteMenu] = useState(false);
  const [showLinkMenu, setShowLinkMenu] = useState(false);
  const [showImageMenu, setShowImageMenu] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [tableHover, setTableHover] = useState({ rows: 0, cols: 0 });
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');

  // Portal mounting state (SSR safety)
  const [isMounted, setIsMounted] = useState(false);

  // Set isMounted after component mounts (for portal SSR safety)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Dropdown position states
  const [headingMenuPos, setHeadingMenuPos] = useState({ top: 0, left: 0 });
  const [quoteMenuPos, setQuoteMenuPos] = useState({ top: 0, left: 0 });
  const [linkMenuPos, setLinkMenuPos] = useState({ top: 0, left: 0 });
  const [imageMenuPos, setImageMenuPos] = useState({ top: 0, left: 0 });
  const [tableMenuPos, setTableMenuPos] = useState({ top: 0, left: 0 });
  const [alertMenuPos, setAlertMenuPos] = useState({ top: 0, left: 0 });
  const [charMenuPos, setCharMenuPos] = useState({ top: 0, left: 0 });
  const headingButtonRef = useRef<HTMLDivElement>(null);
  const alertButtonRef = useRef<HTMLDivElement>(null);
  const charButtonRef = useRef<HTMLDivElement>(null);
  const quoteButtonRef = useRef<HTMLDivElement>(null);
  const linkButtonRef = useRef<HTMLDivElement>(null);
  const imageButtonRef = useRef<HTMLDivElement>(null);
  const tableButtonRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  // Refs for dropdown menus (needed for click outside detection with portals)
  const headingMenuRef = useRef<HTMLDivElement>(null);
  const alertMenuRef = useRef<HTMLDivElement>(null);
  const charMenuRef = useRef<HTMLDivElement>(null);
  const quoteMenuRef = useRef<HTMLDivElement>(null);
  const linkMenuRef = useRef<HTMLDivElement>(null);
  const imageMenuRef = useRef<HTMLDivElement>(null);
  const tableMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (showHeadingMenu) {
        const isInsideButton = headingButtonRef.current?.contains(target);
        const isInsideMenu = headingMenuRef.current?.contains(target);
        if (!isInsideButton && !isInsideMenu) {
          setShowHeadingMenu(false);
        }
      }
      if (showAlertMenu) {
        const isInsideButton = alertButtonRef.current?.contains(target);
        const isInsideMenu = alertMenuRef.current?.contains(target);
        if (!isInsideButton && !isInsideMenu) {
          setShowAlertMenu(false);
        }
      }
      if (showQuoteMenu) {
        const isInsideButton = quoteButtonRef.current?.contains(target);
        const isInsideMenu = quoteMenuRef.current?.contains(target);
        if (!isInsideButton && !isInsideMenu) {
          setShowQuoteMenu(false);
        }
      }
      if (showLinkMenu) {
        const isInsideButton = linkButtonRef.current?.contains(target);
        const isInsideMenu = linkMenuRef.current?.contains(target);
        if (!isInsideButton && !isInsideMenu) {
          setShowLinkMenu(false);
        }
      }
      if (showImageMenu) {
        const isInsideButton = imageButtonRef.current?.contains(target);
        const isInsideMenu = imageMenuRef.current?.contains(target);
        if (!isInsideButton && !isInsideMenu) {
          setShowImageMenu(false);
        }
      }
      if (showTableMenu) {
        const isInsideButton = tableButtonRef.current?.contains(target);
        const isInsideMenu = tableMenuRef.current?.contains(target);
        if (!isInsideButton && !isInsideMenu) {
          setShowTableMenu(false);
          setTableHover({ rows: 0, cols: 0 });
        }
      }
      if (showCharMenu) {
        const isInsideButton = charButtonRef.current?.contains(target);
        const isInsideMenu = charMenuRef.current?.contains(target);
        if (!isInsideButton && !isInsideMenu) {
          setShowCharMenu(false);
        }
      }
    };

    if (showHeadingMenu || showAlertMenu || showQuoteMenu || showLinkMenu || showImageMenu || showTableMenu || showCharMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHeadingMenu, showAlertMenu, showQuoteMenu, showLinkMenu, showImageMenu, showTableMenu, showCharMenu]);

  // Helper function to wrap selected text or insert at cursor
  const wrapText = (prefix: string, suffix: string, placeholder: string = '') => {
    const editor = getEditor();
    if (!editor) return;

    const currentValue = editor.getValue ? editor.getValue() : value;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selectedText = currentValue.substring(start, end);
    const textToInsert = selectedText || placeholder;
    const replacement = prefix + textToInsert + suffix;

    // Use replaceRange if available (CodeMirror) for proper undo support
    if (editor.replaceRange) {
      editor.replaceRange(start, end, replacement);
      setTimeout(() => {
        if (selectedText) {
          editor.setSelectionRange(start, start + replacement.length);
        } else {
          const newPos = start + prefix.length + textToInsert.length;
          editor.setSelectionRange(newPos, newPos);
        }
        editor.focus();
      }, 0);
    } else {
      const newText = currentValue.substring(0, start) + replacement + currentValue.substring(end);
      onChange(newText);
      setTimeout(() => {
        if (selectedText) {
          editor.setSelectionRange(start, start + replacement.length);
        } else {
          const newPos = start + prefix.length + textToInsert.length;
          editor.setSelectionRange(newPos, newPos);
        }
        editor.focus();
      }, 0);
    }
  };

  // Helper function to toggle formatting (add or remove)
  const toggleFormat = (prefix: string, suffix: string, placeholder: string = '') => {
    const editor = getEditor();
    if (!editor) return;

    const currentValue = editor.getValue ? editor.getValue() : value;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selectedText = currentValue.substring(start, end);

    // Check if the selected text is already wrapped with the format
    const beforeSelection = currentValue.substring(Math.max(0, start - prefix.length), start);
    const afterSelection = currentValue.substring(end, end + suffix.length);

    const isAlreadyFormatted = beforeSelection === prefix && afterSelection === suffix;

    if (isAlreadyFormatted) {
      // Remove formatting
      if (editor.replaceRange) {
        editor.replaceRange(start - prefix.length, end + suffix.length, selectedText);
        setTimeout(() => {
          editor.setSelectionRange(start - prefix.length, end - prefix.length);
          editor.focus();
        }, 0);
      } else {
        const newText = currentValue.substring(0, start - prefix.length) + selectedText + currentValue.substring(end + suffix.length);
        onChange(newText);
        setTimeout(() => {
          editor.setSelectionRange(start - prefix.length, end - prefix.length);
          editor.focus();
        }, 0);
      }
    } else {
      // Check if selection includes the formatting markers
      if (selectedText.startsWith(prefix) && selectedText.endsWith(suffix) && selectedText.length > prefix.length + suffix.length) {
        // Remove formatting from the selected text
        const unwrappedText = selectedText.substring(prefix.length, selectedText.length - suffix.length);
        if (editor.replaceRange) {
          editor.replaceRange(start, end, unwrappedText);
          setTimeout(() => {
            editor.setSelectionRange(start, start + unwrappedText.length);
            editor.focus();
          }, 0);
        } else {
          const newText = currentValue.substring(0, start) + unwrappedText + currentValue.substring(end);
          onChange(newText);
          setTimeout(() => {
            editor.setSelectionRange(start, start + unwrappedText.length);
            editor.focus();
          }, 0);
        }
      } else {
        // Add formatting
        const textToInsert = selectedText || placeholder;
        const replacement = prefix + textToInsert + suffix;
        if (editor.replaceRange) {
          editor.replaceRange(start, end, replacement);
          setTimeout(() => {
            if (selectedText) {
              editor.setSelectionRange(start + prefix.length, end + prefix.length);
            } else {
              editor.setSelectionRange(start + prefix.length, start + prefix.length + textToInsert.length);
            }
            editor.focus();
          }, 0);
        } else {
          const newText = currentValue.substring(0, start) + replacement + currentValue.substring(end);
          onChange(newText);
          setTimeout(() => {
            if (selectedText) {
              editor.setSelectionRange(start + prefix.length, end + prefix.length);
            } else {
              editor.setSelectionRange(start + prefix.length, start + prefix.length + textToInsert.length);
            }
            editor.focus();
          }, 0);
        }
      }
    }
  };

  // Helper function to insert text at cursor or replace selection
  const insertText = (text: string) => {
    const editor = getEditor();
    if (!editor) return;

    const currentValue = editor.getValue ? editor.getValue() : value;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;

    // Use replaceRange if available (CodeMirror) for proper undo support
    if (editor.replaceRange) {
      editor.replaceRange(start, end, text);
      setTimeout(() => {
        const newPos = start + text.length;
        editor.setSelectionRange(newPos, newPos);
        editor.focus();
      }, 0);
    } else {
      const newText = currentValue.substring(0, start) + text + currentValue.substring(end);
      onChange(newText);
      setTimeout(() => {
        const newPos = start + text.length;
        editor.setSelectionRange(newPos, newPos);
        editor.focus();
      }, 0);
    }
  };

  // Helper function to add prefix to current line
  const addLinePrefix = (prefix: string) => {
    const editor = getEditor();
    if (!editor) return;

    const currentValue = editor.getValue ? editor.getValue() : value;
    const start = editor.selectionStart;
    const lineStart = currentValue.lastIndexOf('\n', start - 1) + 1;

    // Use replaceRange if available (CodeMirror) for proper undo support
    if (editor.replaceRange) {
      editor.replaceRange(lineStart, lineStart, prefix);
      setTimeout(() => {
        const newPos = start + prefix.length;
        editor.setSelectionRange(newPos, newPos);
        editor.focus();
      }, 0);
    } else {
      const newText = currentValue.substring(0, lineStart) + prefix + currentValue.substring(lineStart);
      onChange(newText);
      setTimeout(() => {
        const newPos = start + prefix.length;
        editor.setSelectionRange(newPos, newPos);
        editor.focus();
      }, 0);
    }
  };

  // Helper function to toggle line prefix (add or remove)
  const toggleLinePrefix = (prefix: string, alternativePrefixes: string[] = []) => {
    const editor = getEditor();
    if (!editor) return;

    const currentValue = editor.getValue ? editor.getValue() : value;
    const start = editor.selectionStart;
    const lineStart = currentValue.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = currentValue.indexOf('\n', start);
    const actualLineEnd = lineEnd === -1 ? currentValue.length : lineEnd;
    const lineContent = currentValue.substring(lineStart, actualLineEnd);

    // Check if line starts with the prefix or any alternative prefix
    const allPrefixes = [prefix, ...alternativePrefixes];
    const matchedPrefix = allPrefixes.find(p => lineContent.startsWith(p));

    if (matchedPrefix) {
      // Remove the prefix
      const newLineContent = lineContent.substring(matchedPrefix.length);
      if (editor.replaceRange) {
        editor.replaceRange(lineStart, actualLineEnd, newLineContent);
        setTimeout(() => {
          const newPos = Math.max(lineStart, start - matchedPrefix.length);
          editor.setSelectionRange(newPos, newPos);
          editor.focus();
        }, 0);
      } else {
        const newText = currentValue.substring(0, lineStart) + newLineContent + currentValue.substring(actualLineEnd);
        onChange(newText);
        setTimeout(() => {
          const newPos = Math.max(lineStart, start - matchedPrefix.length);
          editor.setSelectionRange(newPos, newPos);
          editor.focus();
        }, 0);
      }
    } else {
      // Add the prefix
      if (editor.replaceRange) {
        editor.replaceRange(lineStart, lineStart, prefix);
        setTimeout(() => {
          const newPos = start + prefix.length;
          editor.setSelectionRange(newPos, newPos);
          editor.focus();
        }, 0);
      } else {
        const newText = currentValue.substring(0, lineStart) + prefix + currentValue.substring(lineStart);
        onChange(newText);
        setTimeout(() => {
          const newPos = start + prefix.length;
          editor.setSelectionRange(newPos, newPos);
          editor.focus();
        }, 0);
      }
    }
  };

  const handleBold = () => toggleFormat('**', '**', 'bold text');
  const handleItalic = () => toggleFormat('*', '*', 'italic text');
  const handleStrikethrough = () => toggleFormat('~~', '~~', 'strikethrough text');

  // Heading handlers with long press support
  const handleHeading = (level?: number) => {
    const editor = getEditor();
    if (!editor) return;

    // Get current content - use editor.getValue() if available for accuracy
    const currentValue = editor.getValue ? editor.getValue() : value;

    const start = editor.selectionStart;
    const lineStart = currentValue.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = currentValue.indexOf('\n', start);
    const lineContent = currentValue.substring(lineStart, lineEnd === -1 ? currentValue.length : lineEnd);

    // Check if line already has a heading (with or without space/text after)
    const headingMatch = lineContent.match(/^(#{1,6})(\s|$)/);

    let newLineContent: string;
    let cursorOffset: number;

    if (level !== undefined) {
      // Specific level requested from dropdown menu
      if (headingMatch) {
        // Replace existing heading with new level
        const hasSpace = headingMatch[2] === ' ';
        const textAfterHeading = hasSpace ? lineContent.substring(headingMatch[0].length) : lineContent.substring(headingMatch[1].length);
        newLineContent = '#'.repeat(level) + ' ' + textAfterHeading;
        cursorOffset = level + 1 - headingMatch[1].length - (hasSpace ? 1 : 0);
      } else {
        // Add new heading
        newLineContent = '#'.repeat(level) + ' ' + lineContent;
        cursorOffset = level + 1;
      }
    } else {
      // Quick click - increment heading level
      if (headingMatch) {
        const currentLevel = headingMatch[1].length;
        // If already at max level (6), just refocus and return
        if (currentLevel >= 6) {
          setShowHeadingMenu(false);
          editor.focus();
          return;
        }
        // Increment level
        const newLevel = currentLevel + 1;
        const hasSpace = headingMatch[2] === ' ';
        const textAfterHeading = hasSpace ? lineContent.substring(headingMatch[0].length) : lineContent.substring(headingMatch[1].length);
        newLineContent = '#'.repeat(newLevel) + ' ' + textAfterHeading;
        cursorOffset = hasSpace ? 1 : 2; // Added one # (and space if it wasn't there)
      } else {
        // Add H1
        newLineContent = '# ' + lineContent;
        cursorOffset = 2;
      }
    }

    const actualLineEnd = lineEnd === -1 ? currentValue.length : lineEnd;

    // Use replaceRange if available (CodeMirror) for proper undo support
    if (editor.replaceRange) {
      editor.replaceRange(lineStart, actualLineEnd, newLineContent);
      setTimeout(() => {
        const newPos = start + cursorOffset;
        editor.setSelectionRange(newPos, newPos);
        editor.focus();
      }, 0);
    } else {
      // Fallback for textarea
      const newText = currentValue.substring(0, lineStart) + newLineContent + currentValue.substring(actualLineEnd);
      onChange(newText);
      setTimeout(() => {
        const newPos = start + cursorOffset;
        editor.setSelectionRange(newPos, newPos);
        editor.focus();
      }, 0);
    }

    setShowHeadingMenu(false);
  };

  const handleHeadingMouseDown = () => {
    isLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      if (headingButtonRef.current) {
        const rect = headingButtonRef.current.getBoundingClientRect();
        setHeadingMenuPos({ top: rect.bottom + 4, left: rect.left });
      }
      setShowHeadingMenu(true);
    }, 300);
  };

  const handleHeadingMouseUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (!isLongPressRef.current) {
      handleHeading(); // No level = increment or add H1
    }
  };

  const handleHeadingMouseLeave = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const headingOptions = [
    { level: 1, label: 'H1', description: 'Título 1' },
    { level: 2, label: 'H2', description: 'Título 2' },
    { level: 3, label: 'H3', description: 'Título 3' },
    { level: 4, label: 'H4', description: 'Título 4' },
    { level: 5, label: 'H5', description: 'Título 5' },
    { level: 6, label: 'H6', description: 'Título 6' },
  ];

  // Alert handlers
  const handleAlert = (type: string) => {
    const editor = getEditor();
    if (!editor) return;

    const text = editor.getValue ? editor.getValue() : value;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;

    // Check current nesting level by counting > prefixes on the line at cursor
    const firstLineStart = text.lastIndexOf('\n', start - 1) + 1;
    const firstLineEnd = text.indexOf('\n', start);
    const lineText = text.substring(firstLineStart, firstLineEnd === -1 ? text.length : firstLineEnd);
    const nestingMatch = lineText.match(/^(>\s*)+/);
    const nestingLevel = nestingMatch ? (nestingMatch[0].match(/>/g) || []).length : 0;

    // Prevent more than 2 levels of nesting
    if (nestingLevel >= 2) {
      setShowAlertMenu(false);
      return;
    }

    const selectedText = text.substring(start, end);
    const outerPrefix = nestingLevel > 0 ? '> '.repeat(nestingLevel) : '';
    const alertPrefix = outerPrefix + '> ';

    if (selectedText.length > 0) {
      // Expand range to cover full lines so we replace existing > prefixes
      const rangeStart = firstLineStart;
      const lastLineEnd = text.indexOf('\n', end);
      const rangeEnd = lastLineEnd === -1 ? text.length : lastLineEnd;

      // Get all full lines covered by the selection
      const fullLinesText = text.substring(rangeStart, rangeEnd);
      // Strip existing > prefixes from each line to get clean content
      const strippedLines = fullLinesText.split('\n').map(line => line.replace(/^(>\s*)+/, ''));
      const wrappedLines = strippedLines.map(line => `${alertPrefix}${line}`).join('\n');
      const alertText = `${alertPrefix}[!${type.toUpperCase()}]\n${wrappedLines}`;

      if (editor.replaceRange) {
        editor.replaceRange(rangeStart, rangeEnd, alertText);
      } else {
        onChange(text.substring(0, rangeStart) + alertText + text.substring(rangeEnd));
      }
      setTimeout(() => {
        const contentStart = rangeStart + `${alertPrefix}[!${type.toUpperCase()}]\n`.length;
        editor.setSelectionRange(contentStart, contentStart + wrappedLines.length);
        editor.focus();
      }, 0);
    } else {
      const alertText = `${alertPrefix}[!${type.toUpperCase()}]\n${alertPrefix}`;

      if (editor.replaceRange) {
        editor.replaceRange(start, end, alertText);
      } else {
        onChange(text.substring(0, start) + alertText + text.substring(end));
      }
      setTimeout(() => {
        const newPos = start + alertText.length;
        editor.setSelectionRange(newPos, newPos);
        editor.focus();
      }, 0);
    }

    setShowAlertMenu(false);
  };

  const handleAlertClick = () => {
    if (alertButtonRef.current) {
      const rect = alertButtonRef.current.getBoundingClientRect();
      // Align to right edge since this is the last button
      setAlertMenuPos({ top: rect.bottom + 4, left: rect.right - 180 }); // 180px is min-width
    }
    setShowAlertMenu(true);
  };

  const alertOptions = [
    { type: 'NOTE', label: 'Note', description: t('toolbar.alertNote'), color: '#0969da' },
    { type: 'TIP', label: 'Tip', description: t('toolbar.alertTip'), color: '#1a7f37' },
    { type: 'IMPORTANT', label: 'Important', description: t('toolbar.alertImportant'), color: '#8250df' },
    { type: 'WARNING', label: 'Warning', description: t('toolbar.alertWarning'), color: '#9a6700' },
    { type: 'CAUTION', label: 'Caution', description: t('toolbar.alertCaution'), color: '#cf222e' },
  ];

  const handleSubscript = () => toggleFormat('<sub>', '</sub>', 'subscript');
  const handleSuperscript = () => toggleFormat('<sup>', '</sup>', 'superscript');
  const handleBulletList = () => {
    const editor = getEditor();
    if (!editor) return;

    const currentValue = editor.getValue ? editor.getValue() : value;
    const start = editor.selectionStart;
    const lineStart = currentValue.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = currentValue.indexOf('\n', start);
    const actualLineEnd = lineEnd === -1 ? currentValue.length : lineEnd;
    const lineContent = currentValue.substring(lineStart, actualLineEnd);

    // Check if line already has bullet list prefix
    if (lineContent.match(/^\s*-\s/)) {
      // Line already has bullet, add new line with bullet
      const newItem = '\n- ';
      if (editor.replaceRange) {
        editor.replaceRange(actualLineEnd, actualLineEnd, newItem);
        setTimeout(() => {
          const newPos = actualLineEnd + newItem.length;
          editor.setSelectionRange(newPos, newPos);
          editor.focus();
        }, 0);
      } else {
        const newText = currentValue.substring(0, actualLineEnd) + newItem + currentValue.substring(actualLineEnd);
        onChange(newText);
        setTimeout(() => {
          const newPos = actualLineEnd + newItem.length;
          editor.setSelectionRange(newPos, newPos);
          editor.focus();
        }, 0);
      }
    } else {
      // Add bullet prefix to current line
      addLinePrefix('- ');
    }
  };

  const handleNumberedList = () => {
    const editor = getEditor();
    if (!editor) return;

    const currentValue = editor.getValue ? editor.getValue() : value;
    const start = editor.selectionStart;
    const lineStart = currentValue.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = currentValue.indexOf('\n', start);
    const actualLineEnd = lineEnd === -1 ? currentValue.length : lineEnd;
    const lineContent = currentValue.substring(lineStart, actualLineEnd);

    // Check if line already has numbered list prefix
    const numberMatch = lineContent.match(/^\s*(\d+)\.\s/);
    if (numberMatch) {
      // Line already has number, add new line with next number
      const currentNumber = parseInt(numberMatch[1], 10);
      const nextNumber = currentNumber + 1;
      const newItem = `\n${nextNumber}. `;
      if (editor.replaceRange) {
        editor.replaceRange(actualLineEnd, actualLineEnd, newItem);
        setTimeout(() => {
          const newPos = actualLineEnd + newItem.length;
          editor.setSelectionRange(newPos, newPos);
          editor.focus();
        }, 0);
      } else {
        const newText = currentValue.substring(0, actualLineEnd) + newItem + currentValue.substring(actualLineEnd);
        onChange(newText);
        setTimeout(() => {
          const newPos = actualLineEnd + newItem.length;
          editor.setSelectionRange(newPos, newPos);
          editor.focus();
        }, 0);
      }
    } else {
      // Add number prefix to current line
      addLinePrefix('1. ');
    }
  };

  // Quote handlers with long press support
  const handleQuote = (level?: number) => {
    const editor = getEditor();
    if (!editor) return;

    // Get current content - use editor.getValue() if available for accuracy
    const currentValue = editor.getValue ? editor.getValue() : value;

    const start = editor.selectionStart;
    const lineStart = currentValue.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = currentValue.indexOf('\n', start);
    const lineContent = currentValue.substring(lineStart, lineEnd === -1 ? currentValue.length : lineEnd);

    // Check if line already has a quote (with or without space/text after)
    const quoteMatch = lineContent.match(/^(>{1,4})(\s|$)/);

    let newLineContent: string;
    let cursorOffset: number;

    if (level !== undefined) {
      // Specific level requested from dropdown menu
      if (quoteMatch) {
        // Replace existing quote with new level
        const hasSpace = quoteMatch[2] === ' ';
        const textAfterQuote = hasSpace ? lineContent.substring(quoteMatch[0].length) : lineContent.substring(quoteMatch[1].length);
        newLineContent = '>'.repeat(level) + ' ' + textAfterQuote;
        cursorOffset = level + 1 - quoteMatch[1].length - (hasSpace ? 1 : 0);
      } else {
        // Add new quote
        newLineContent = '>'.repeat(level) + ' ' + lineContent;
        cursorOffset = level + 1;
      }
    } else {
      // Quick click - increment quote level
      if (quoteMatch) {
        const currentLevel = quoteMatch[1].length;
        // If already at max level (4), just refocus and return
        if (currentLevel >= 4) {
          setShowQuoteMenu(false);
          editor.focus();
          return;
        }
        // Increment level
        const newLevel = currentLevel + 1;
        const hasSpace = quoteMatch[2] === ' ';
        const textAfterQuote = hasSpace ? lineContent.substring(quoteMatch[0].length) : lineContent.substring(quoteMatch[1].length);
        newLineContent = '>'.repeat(newLevel) + ' ' + textAfterQuote;
        cursorOffset = hasSpace ? 1 : 2; // Added one > (and space if it wasn't there)
      } else {
        // Add level 1 quote
        newLineContent = '> ' + lineContent;
        cursorOffset = 2;
      }
    }

    const actualLineEnd = lineEnd === -1 ? currentValue.length : lineEnd;

    // Use replaceRange if available (CodeMirror) for proper undo support
    if (editor.replaceRange) {
      editor.replaceRange(lineStart, actualLineEnd, newLineContent);
      setTimeout(() => {
        const newPos = start + cursorOffset;
        editor.setSelectionRange(newPos, newPos);
        editor.focus();
      }, 0);
    } else {
      // Fallback for textarea
      const newText = currentValue.substring(0, lineStart) + newLineContent + currentValue.substring(actualLineEnd);
      onChange(newText);
      setTimeout(() => {
        const newPos = start + cursorOffset;
        editor.setSelectionRange(newPos, newPos);
        editor.focus();
      }, 0);
    }

    setShowQuoteMenu(false);
  };

  const handleQuoteMouseDown = () => {
    isLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      if (quoteButtonRef.current) {
        const rect = quoteButtonRef.current.getBoundingClientRect();
        setQuoteMenuPos({ top: rect.bottom + 4, left: rect.left });
      }
      setShowQuoteMenu(true);
    }, 300);
  };

  const handleQuoteMouseUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (!isLongPressRef.current) {
      handleQuote(); // No level = increment or add level 1
    }
  };

  const handleQuoteMouseLeave = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const quoteOptions = [
    { level: 1, label: '>', description: 'Citação' },
    { level: 2, label: '>>', description: 'Citação nível 2' },
    { level: 3, label: '>>>', description: 'Citação nível 3' },
    { level: 4, label: '>>>>', description: 'Citação nível 4' },
  ];
  const handleTask = () => {
    const editor = getEditor();
    if (!editor) return;

    const currentValue = editor.getValue ? editor.getValue() : value;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const lineStart = currentValue.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = currentValue.indexOf('\n', start);
    const actualLineEnd = lineEnd === -1 ? currentValue.length : lineEnd;
    const lineContent = currentValue.substring(lineStart, actualLineEnd);

    // Check if line already has a task checkbox
    const taskMatch = lineContent.match(/^(\s*-\s*\[[xX ]\]\s*)/);

    if (taskMatch) {
      // Line already has checkbox, add new line with empty checkbox
      const newItem = '\n- [ ] ';
      if (editor.replaceRange) {
        editor.replaceRange(actualLineEnd, actualLineEnd, newItem);
        setTimeout(() => {
          const newPos = actualLineEnd + newItem.length;
          editor.setSelectionRange(newPos, newPos);
          editor.focus();
        }, 0);
      } else {
        const newText = currentValue.substring(0, actualLineEnd) + newItem + currentValue.substring(actualLineEnd);
        onChange(newText);
        setTimeout(() => {
          const newPos = actualLineEnd + newItem.length;
          editor.setSelectionRange(newPos, newPos);
          editor.focus();
        }, 0);
      }
    } else {
      // Add checkbox prefix to current line, preserving any selected text
      const prefix = '- [ ] ';
      const newLineContent = prefix + lineContent;

      if (editor.replaceRange) {
        editor.replaceRange(lineStart, actualLineEnd, newLineContent);
        setTimeout(() => {
          // Position cursor at end of line (after the text)
          const newPos = lineStart + newLineContent.length;
          editor.setSelectionRange(newPos, newPos);
          editor.focus();
        }, 0);
      } else {
        const newText = currentValue.substring(0, lineStart) + newLineContent + currentValue.substring(actualLineEnd);
        onChange(newText);
        setTimeout(() => {
          const newPos = lineStart + newLineContent.length;
          editor.setSelectionRange(newPos, newPos);
          editor.focus();
        }, 0);
      }
    }
  };

  // Link handlers with long press support
  const handleLink = () => {
    const editor = getEditor();
    if (!editor) return;

    const currentValue = editor.getValue ? editor.getValue() : value;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selectedText = currentValue.substring(start, end);

    // Check if cursor/selection is inside a link pattern [text](url)
    // Look backwards for '[' and forwards for '](url)'
    const searchStart = Math.max(0, start - 200); // Look back up to 200 chars
    const searchEnd = Math.min(currentValue.length, end + 200); // Look forward up to 200 chars
    const searchArea = currentValue.substring(searchStart, searchEnd);
    const relativeStart = start - searchStart;
    const relativeEnd = end - searchStart;

    // Find all link patterns in the search area
    const linkRegex = /\[([^\]]*)\]\(([^)]*)\)/g;
    let match;
    let foundLink = null;

    while ((match = linkRegex.exec(searchArea)) !== null) {
      const linkStart = match.index;
      const linkEnd = match.index + match[0].length;

      // Check if cursor/selection is within this link
      if (relativeStart >= linkStart && relativeEnd <= linkEnd) {
        foundLink = {
          fullMatch: match[0],
          text: match[1],
          url: match[2],
          absoluteStart: searchStart + linkStart,
          absoluteEnd: searchStart + linkEnd
        };
        break;
      }
    }

    if (foundLink) {
      // Remove the link - if text is placeholder "link text", remove entirely
      const isPlaceholder = foundLink.text === 'link text' && foundLink.url === 'url';
      const replacement = isPlaceholder ? '' : foundLink.text;

      if (editor.replaceRange) {
        editor.replaceRange(foundLink.absoluteStart, foundLink.absoluteEnd, replacement);
        setTimeout(() => {
          const newPos = foundLink.absoluteStart + replacement.length;
          editor.setSelectionRange(newPos, newPos);
          editor.focus();
        }, 0);
      } else {
        const newText = currentValue.substring(0, foundLink.absoluteStart) + replacement + currentValue.substring(foundLink.absoluteEnd);
        onChange(newText);
        setTimeout(() => {
          const newPos = foundLink.absoluteStart + replacement.length;
          editor.setSelectionRange(newPos, newPos);
          editor.focus();
        }, 0);
      }
    } else {
      // Add link
      const linkText = selectedText || 'link text';
      const replacement = '[' + linkText + '](url)';

      const selectAfterInsert = () => {
        if (selectedText) {
          // Text was pre-selected — select "url" so user can type the URL immediately
          const urlStart = start + 1 + linkText.length + 2; // after "[text]("
          const urlEnd = urlStart + 3; // "url".length
          editor.setSelectionRange(urlStart, urlEnd);
        } else {
          // No text selected — select "link text" placeholder
          const linkTextStart = start + 1;
          const linkTextEnd = linkTextStart + linkText.length;
          editor.setSelectionRange(linkTextStart, linkTextEnd);
        }
        editor.focus();
      };

      if (editor.replaceRange) {
        editor.replaceRange(start, end, replacement);
        setTimeout(selectAfterInsert, 0);
      } else {
        const newText = currentValue.substring(0, start) + replacement + currentValue.substring(end);
        onChange(newText);
        setTimeout(selectAfterInsert, 0);
      }
    }

    setShowLinkMenu(false);
  };

  const handleReferenceLink = () => {
    const editor = getEditor();
    if (!editor) return;

    const currentValue = editor.getValue ? editor.getValue() : value;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selectedText = currentValue.substring(start, end);
    const linkText = selectedText || 'link text';
    const refId = 'ref';

    // Insert the link reference at cursor position
    const linkMarkdown = `[${linkText}][${refId}]`;
    // Add the reference definition at the end of the document
    const refDefinition = `\n\n[${refId}]: url "title"`;

    // Build the complete new text
    const beforeSelection = currentValue.substring(0, start);
    const afterSelection = currentValue.substring(end);
    const finalText = beforeSelection + linkMarkdown + afterSelection + refDefinition;

    if (editor.replaceRange) {
      // Replace entire document to include both changes in one undo operation
      editor.replaceRange(0, currentValue.length, finalText);
      setTimeout(() => {
        const linkTextStart = start + 1;
        const linkTextEnd = linkTextStart + linkText.length;
        editor.setSelectionRange(linkTextStart, linkTextEnd);
        editor.focus();
      }, 0);
    } else {
      onChange(finalText);
      setTimeout(() => {
        const linkTextStart = start + 1;
        const linkTextEnd = linkTextStart + linkText.length;
        editor.setSelectionRange(linkTextStart, linkTextEnd);
        editor.focus();
      }, 0);
    }

    setShowLinkMenu(false);
  };

  const handleLinkMouseDown = () => {
    isLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      if (linkButtonRef.current) {
        const rect = linkButtonRef.current.getBoundingClientRect();
        setLinkMenuPos({ top: rect.bottom + 4, left: rect.left });
      }
      setShowLinkMenu(true);
    }, 300);
  };

  const handleLinkMouseUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (!isLongPressRef.current) {
      handleLink();
    }
  };

  const handleLinkMouseLeave = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Footnote handler with auto-numbering
  const handleFootnote = () => {
    const editor = getEditor();
    if (!editor) return;

    const currentValue = editor.getValue ? editor.getValue() : value;

    // Check if there's an unedited footnote placeholder — if so, navigate to it instead of creating a new one
    const placeholderMatch = currentValue.match(/\[\^(\d+)\]:\s*footnote text\s*$/m);
    if (placeholderMatch) {
      const placeholderIdx = currentValue.indexOf(placeholderMatch[0]);
      const textStart = placeholderIdx + placeholderMatch[0].indexOf('footnote text');
      const textEnd = textStart + 'footnote text'.length;
      editor.setSelectionRange(textStart, textEnd);
      editor.focus();
      return;
    }

    // Find all existing footnotes to determine the next number
    const footnotePattern = /\[\^(\d+)\]/g;
    const existingNumbers: number[] = [];
    let match;
    while ((match = footnotePattern.exec(currentValue)) !== null) {
      existingNumbers.push(parseInt(match[1], 10));
    }

    // Determine the next footnote number
    const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;

    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selectedText = currentValue.substring(start, end);
    const hasSelection = selectedText.length > 0;

    // Insert the footnote reference
    const footnoteRef = `[^${nextNumber}]`;
    const placeholder = 'footnote text';
    const footnoteDefinition = `\n\n[^${nextNumber}]: ${placeholder}`;

    if (hasSelection) {
      // With selection: add reference after selected text, definition with placeholder at end
      const finalText = currentValue.substring(0, end) + footnoteRef + currentValue.substring(end) + footnoteDefinition;

      if (editor.replaceRange) {
        editor.replaceRange(0, currentValue.length, finalText);
        setTimeout(() => {
          const placeholderStart = finalText.length - placeholder.length;
          const placeholderEnd = finalText.length;
          editor.setSelectionRange(placeholderStart, placeholderEnd);
          editor.focus();
        }, 0);
      } else {
        onChange(finalText);
        setTimeout(() => {
          const placeholderStart = finalText.length - placeholder.length;
          const placeholderEnd = finalText.length;
          editor.setSelectionRange(placeholderStart, placeholderEnd);
          editor.focus();
        }, 0);
      }
    } else {
      // Without selection: insert reference at cursor, definition with placeholder at end
      const finalText = currentValue.substring(0, start) + footnoteRef + currentValue.substring(end) + footnoteDefinition;

      if (editor.replaceRange) {
        editor.replaceRange(0, currentValue.length, finalText);
        setTimeout(() => {
          const placeholderStart = finalText.length - placeholder.length;
          const placeholderEnd = finalText.length;
          editor.setSelectionRange(placeholderStart, placeholderEnd);
          editor.focus();
        }, 0);
      } else {
        onChange(finalText);
        setTimeout(() => {
          const placeholderStart = finalText.length - placeholder.length;
          const placeholderEnd = finalText.length;
          editor.setSelectionRange(placeholderStart, placeholderEnd);
          editor.focus();
        }, 0);
      }
    }
  };

  const handleInlineCode = () => toggleFormat('`', '`', 'code');
  const handleCodeBlock = () => {
    const editor = getEditor();
    if (!editor) return;

    const text = editor.getValue ? editor.getValue() : value;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selectedText = text.substring(start, end);

    // Check if cursor/selection is inside an existing code block
    // Find the nearest ``` before and after cursor
    const beforeCursor = text.substring(0, start);
    const afterCursor = text.substring(end);
    const openMatch = beforeCursor.lastIndexOf('```');
    const closeMatch = afterCursor.indexOf('```');

    if (openMatch !== -1 && closeMatch !== -1) {
      // Verify this is a proper open/close pair (open is at line start-ish)
      const openLineStart = text.lastIndexOf('\n', openMatch) + 1;
      const openLine = text.substring(openLineStart, text.indexOf('\n', openMatch));
      const closeAbsPos = end + closeMatch;
      const closeLineStart = text.lastIndexOf('\n', closeAbsPos) + 1;
      const closeLine = text.substring(closeLineStart, closeAbsPos + 3);

      if (openLine.trimStart().startsWith('```') && closeLine.trimStart() === '```') {
        // We're inside a code block — toggle it off (remove the fences)
        const blockStart = openLineStart;
        const blockEndPos = closeAbsPos + 3;
        // Include trailing newline if present
        const blockEnd = text[blockEndPos] === '\n' ? blockEndPos + 1 : blockEndPos;
        // Include leading newline if present
        const actualStart = blockStart > 0 && text[blockStart - 1] === '\n' ? blockStart - 1 : blockStart;

        const blockContent = text.substring(openMatch + 3, closeAbsPos);
        // Strip the opening ``` line (may have language suffix) and get inner content
        const innerStart = blockContent.indexOf('\n');
        const inner = innerStart !== -1 ? blockContent.substring(innerStart + 1) : '';
        // If inner is just the placeholder or empty, remove entirely
        const trimmedInner = inner.trim();
        if (trimmedInner === '' || trimmedInner === 'code') {
          if (editor.replaceRange) {
            editor.replaceRange(actualStart, blockEnd, '');
          } else {
            onChange(text.substring(0, actualStart) + text.substring(blockEnd));
          }
          setTimeout(() => {
            editor.setSelectionRange(actualStart, actualStart);
            editor.focus();
          }, 0);
        } else {
          // Has real content — unwrap: replace block with just the inner content
          if (editor.replaceRange) {
            editor.replaceRange(actualStart, blockEnd, (actualStart > 0 ? '\n' : '') + inner + '\n');
          } else {
            const replacement = (actualStart > 0 ? '\n' : '') + inner + '\n';
            onChange(text.substring(0, actualStart) + replacement + text.substring(blockEnd));
          }
          setTimeout(() => {
            const newStart = actualStart > 0 ? actualStart + 1 : 0;
            editor.setSelectionRange(newStart, newStart + inner.length);
            editor.focus();
          }, 0);
        }
        return;
      }
    }

    // Not inside a code block — insert one
    if (selectedText.length > 0) {
      // Wrap selected text
      const replacement = '\n```\n' + selectedText + '\n```\n';
      if (editor.replaceRange) {
        editor.replaceRange(start, end, replacement);
      } else {
        onChange(text.substring(0, start) + replacement + text.substring(end));
      }
      setTimeout(() => {
        const contentStart = start + 5; // after \n```\n (5 chars)
        editor.setSelectionRange(contentStart, contentStart + selectedText.length);
        editor.focus();
      }, 0);
    } else {
      // Insert empty code block with placeholder selected
      const block = '\n```\ncode\n```\n';
      if (editor.replaceRange) {
        editor.replaceRange(start, end, block);
      } else {
        onChange(text.substring(0, start) + block + text.substring(end));
      }
      setTimeout(() => {
        const placeholderStart = start + 5; // after \n```\n (5 chars)
        const placeholderEnd = placeholderStart + 4; // "code" length
        editor.setSelectionRange(placeholderStart, placeholderEnd);
        editor.focus();
      }, 0);
    }
  };

  // Details/Collapsible handler
  const handleDetails = () => {
    const editor = getEditor();
    if (!editor) return;

    const text = editor.getValue ? editor.getValue() : value;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selectedText = text.substring(start, end);

    // Check if cursor/selection is inside an existing details block
    const beforeCursor = text.substring(0, start);
    const afterCursor = text.substring(end);
    const openMatch = beforeCursor.lastIndexOf('<details>');
    const closeMatch = afterCursor.indexOf('</details>');

    if (openMatch !== -1 && closeMatch !== -1) {
      // Verify we're inside a proper details block (no nested details between open and cursor)
      const textBetweenOpenAndCursor = text.substring(openMatch, start);
      const closingBetween = textBetweenOpenAndCursor.indexOf('</details>');

      if (closingBetween === -1) {
        // We're inside a details block — toggle it off (remove the tags)
        const blockStart = openMatch;
        const blockEnd = end + closeMatch + 10; // '</details>' length = 10

        // Extract content between tags
        const blockContent = text.substring(openMatch + 9, end + closeMatch); // after '<details>'

        // Try to extract summary and content
        const summaryMatch = blockContent.match(/<summary>([\s\S]*?)<\/summary>/);
        let innerContent = '';

        if (summaryMatch) {
          const summaryEnd = blockContent.indexOf('</summary>') + 10;
          innerContent = blockContent.substring(summaryEnd).trim();
          // If content is just placeholder, remove entirely
          if (innerContent === '' || innerContent === 'Content here') {
            if (editor.replaceRange) {
              editor.replaceRange(blockStart, blockEnd, '');
            } else {
              onChange(text.substring(0, blockStart) + text.substring(blockEnd));
            }
            setTimeout(() => {
              editor.setSelectionRange(blockStart, blockStart);
              editor.focus();
            }, 0);
          } else {
            // Has real content — unwrap: keep inner content
            if (editor.replaceRange) {
              editor.replaceRange(blockStart, blockEnd, innerContent);
            } else {
              onChange(text.substring(0, blockStart) + innerContent + text.substring(blockEnd));
            }
            setTimeout(() => {
              editor.setSelectionRange(blockStart, blockStart + innerContent.length);
              editor.focus();
            }, 0);
          }
        } else {
          // No summary found, just remove block
          if (editor.replaceRange) {
            editor.replaceRange(blockStart, blockEnd, '');
          } else {
            onChange(text.substring(0, blockStart) + text.substring(blockEnd));
          }
          setTimeout(() => {
            editor.setSelectionRange(blockStart, blockStart);
            editor.focus();
          }, 0);
        }
        return;
      }
    }

    // Not inside a details block — insert one
    if (selectedText.length > 0) {
      // Use selected text as summary
      const detailsBlock = `<details>\n<summary>${selectedText}</summary>\n\nContent here\n\n</details>`;
      if (editor.replaceRange) {
        editor.replaceRange(start, end, detailsBlock);
      } else {
        onChange(text.substring(0, start) + detailsBlock + text.substring(end));
      }
      setTimeout(() => {
        // Select "Content here" placeholder
        const contentStart = start + `<details>\n<summary>${selectedText}</summary>\n\n`.length;
        const contentEnd = contentStart + 12; // "Content here" length
        editor.setSelectionRange(contentStart, contentEnd);
        editor.focus();
      }, 0);
    } else {
      // Insert with placeholders
      const detailsBlock = '<details>\n<summary>Summary</summary>\n\nContent here\n\n</details>';
      if (editor.replaceRange) {
        editor.replaceRange(start, end, detailsBlock);
      } else {
        onChange(text.substring(0, start) + detailsBlock + text.substring(end));
      }
      setTimeout(() => {
        // Select "Summary" placeholder
        const summaryStart = start + '<details>\n<summary>'.length;
        const summaryEnd = summaryStart + 7; // "Summary" length
        editor.setSelectionRange(summaryStart, summaryEnd);
        editor.focus();
      }, 0);
    }
  };

  // Image handlers with long press support
  const handleImage = () => {
    const editor = getEditor();
    if (!editor) return;

    const currentValue = editor.getValue ? editor.getValue() : value;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selectedText = currentValue.substring(start, end);

    // Check if cursor/selection is inside an image pattern ![alt](url)
    const searchStart = Math.max(0, start - 200);
    const searchEnd = Math.min(currentValue.length, end + 200);
    const searchArea = currentValue.substring(searchStart, searchEnd);
    const relativeStart = start - searchStart;
    const relativeEnd = end - searchStart;

    // Find all image patterns in the search area
    const imageRegex = /!\[([^\]]*)\]\(([^)]*)\)/g;
    let match;
    let foundImage = null;

    while ((match = imageRegex.exec(searchArea)) !== null) {
      const imageStart = match.index;
      const imageEnd = match.index + match[0].length;

      // Check if cursor/selection is within this image
      if (relativeStart >= imageStart && relativeEnd <= imageEnd) {
        foundImage = {
          fullMatch: match[0],
          alt: match[1],
          url: match[2],
          absoluteStart: searchStart + imageStart,
          absoluteEnd: searchStart + imageEnd
        };
        break;
      }
    }

    if (foundImage) {
      // Remove the image - if it's the placeholder, remove entirely
      const isPlaceholder = foundImage.alt === 'alt text' && foundImage.url === 'image-url';
      const replacement = isPlaceholder ? '' : foundImage.alt;

      if (editor.replaceRange) {
        editor.replaceRange(foundImage.absoluteStart, foundImage.absoluteEnd, replacement);
        setTimeout(() => {
          const newPos = foundImage.absoluteStart + replacement.length;
          editor.setSelectionRange(newPos, newPos);
          editor.focus();
        }, 0);
      } else {
        const newText = currentValue.substring(0, foundImage.absoluteStart) + replacement + currentValue.substring(foundImage.absoluteEnd);
        onChange(newText);
        setTimeout(() => {
          const newPos = foundImage.absoluteStart + replacement.length;
          editor.setSelectionRange(newPos, newPos);
          editor.focus();
        }, 0);
      }
    } else {
      // Add image
      const altText = selectedText || 'alt text';
      const replacement = '![' + altText + '](image-url)';

      if (editor.replaceRange) {
        editor.replaceRange(start, end, replacement);
        setTimeout(() => {
          // Select the alt text
          const altStart = start + 2;
          const altEnd = altStart + altText.length;
          editor.setSelectionRange(altStart, altEnd);
          editor.focus();
        }, 0);
      } else {
        const newText = currentValue.substring(0, start) + replacement + currentValue.substring(end);
        onChange(newText);
        setTimeout(() => {
          const altStart = start + 2;
          const altEnd = altStart + altText.length;
          editor.setSelectionRange(altStart, altEnd);
          editor.focus();
        }, 0);
      }
    }

    setShowImageMenu(false);
  };

  const handleImageMouseDown = () => {
    isLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      if (imageButtonRef.current) {
        const rect = imageButtonRef.current.getBoundingClientRect();
        setImageMenuPos({ top: rect.bottom + 4, left: rect.left });
      }
      setShowImageMenu(true);
    }, 300);
  };

  const handleImageMouseUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (!isLongPressRef.current) {
      handleImage();
    }
  };

  const handleImageMouseLeave = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleLocalImage = () => {
    setShowImageMenu(false);
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const imagePath = file.name;
      insertText(`![${file.name}](${imagePath})`);
    }
    // Reset input so the same file can be selected again
    event.target.value = '';
  };

  const handleLinkedImage = () => {
    setShowImageMenu(false);
    setImageUrl('');
    setImageAlt('');
    setShowImageModal(true);
  };

  const handleImageModalConfirm = () => {
    const alt = imageAlt || 'alt text';
    const url = imageUrl || 'image-url';
    insertText(`![${alt}](${url})`);
    setShowImageModal(false);
    setImageUrl('');
    setImageAlt('');
  };

  const handleImageModalCancel = () => {
    setShowImageModal(false);
    setImageUrl('');
    setImageAlt('');
  };

  // Table handlers
  type TableAlignment = 'left' | 'center' | 'right';
  const [tableAlignment, setTableAlignment] = useState<TableAlignment>('center');

  // Snapshot of cursor context captured when dropdown opens, so alignment
  // clicks always reference the original cursor position even after edits.
  const tableSnapshotRef = useRef<{
    selStartLine: number;
    selEndLine: number;
    cursorStart: number;
    cursorEnd: number;
    lines: string[];
    separatorLineIndex: number;
    tableStartLine: number;
    tableEndLine: number;
  } | null>(null);

  const separatorForAlignment = (alignment: TableAlignment): string => {
    if (alignment === 'right') return '----------:';
    if (alignment === 'center') return ':----------:';
    return ':----------';
  };

  const generateTableMarkdown = (rows: number, cols: number, alignment: TableAlignment) => {
    if (rows === 0 || cols === 0) return '';

    const headerRow = '| ' + Array(cols).fill('Column').map((c, i) => `${c} ${i + 1}`).join(' | ') + ' |';
    const separatorRow = '|' + Array(cols).fill(separatorForAlignment(alignment)).join('|') + '|';
    const dataRows = Array(rows - 1).fill(null).map((_, rowIndex) =>
      '| ' + Array(cols).fill('Cell').map((c, colIndex) => `${c} ${rowIndex + 1}-${colIndex + 1}`).join(' | ') + ' |'
    ).join('\n');

    return `\n${headerRow}\n${separatorRow}\n${dataRows}\n`;
  };

  // Regex that matches a table separator row: | :---: | ---: | :--- | --- | etc.
  const tableSeparatorRegex = /^\|\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|$/;
  const tableSeparatorCellRegex = /:?-{3,}:?/g;

  // Helper: get column index from cursor offset within a table row line
  const getColumnIndexAtOffset = (line: string, offsetInLine: number): number => {
    let col = -1; // before first pipe = not in a column yet
    for (let i = 0; i < offsetInLine && i < line.length; i++) {
      if (line[i] === '|') col++;
    }
    return col;
  };

  // Helper: get start/end column indices covered by a selection across table rows
  const getSelectedColumns = (snapshotLines: string[], selStartLine: number, selEndLine: number, cursorStart: number, cursorEnd: number, tableHeaderLine: number): { startCol: number; endCol: number } | null => {
    const lineOffset = (lineIdx: number) => snapshotLines.slice(0, lineIdx).reduce((acc, l) => acc + l.length + 1, 0);

    const startLineOffset = lineOffset(selStartLine);
    const offsetInStartLine = cursorStart - startLineOffset;
    const endLineOffset = lineOffset(selEndLine);
    const offsetInEndLine = cursorEnd - endLineOffset;

    const startIsTableRow = snapshotLines[selStartLine]?.trim().startsWith('|');
    const endIsTableRow = snapshotLines[selEndLine]?.trim().startsWith('|');
    if (!startIsTableRow && !endIsTableRow) return null;

    const separatorLine = snapshotLines[tableHeaderLine + 1];
    if (!separatorLine) return null;
    const totalCols = (separatorLine.match(/:?-{3,}:?/g) || []).length;
    if (totalCols === 0) return null;

    const rawStartCol = startIsTableRow ? getColumnIndexAtOffset(snapshotLines[selStartLine], offsetInStartLine) : 0;
    const rawEndCol = endIsTableRow ? getColumnIndexAtOffset(snapshotLines[selEndLine], offsetInEndLine) : rawStartCol;

    // Clamp to valid column range instead of rejecting out-of-bounds values.
    // Cursor before the first pipe gives -1 → clamp to 0.
    // Cursor after the last pipe gives totalCols → clamp to totalCols-1.
    const clamp = (v: number) => Math.max(0, Math.min(v, totalCols - 1));

    return {
      startCol: Math.min(clamp(rawStartCol), clamp(rawEndCol)),
      endCol: Math.max(clamp(rawStartCol), clamp(rawEndCol))
    };
  };

  // Build a snapshot of the cursor context relative to a table (if any).
  // Called once when the dropdown opens so all alignment clicks use stable data.
  const captureTableSnapshot = () => {
    const editor = getEditor();
    if (!editor) { tableSnapshotRef.current = null; return; }

    const text = editor.getValue ? editor.getValue() : value;
    const cursorStart = editor.selectionStart;
    const cursorEnd = editor.selectionEnd;
    const lines = text.split('\n');

    let charCount = 0;
    let selStartLine = 0;
    let selEndLine = 0;
    for (let i = 0; i < lines.length; i++) {
      const lineEnd = charCount + lines[i].length;
      if (charCount <= cursorStart && cursorStart <= lineEnd) selStartLine = i;
      if (charCount <= cursorEnd && cursorEnd <= lineEnd) selEndLine = i;
      charCount += lines[i].length + 1;
    }

    // Try to find separator line
    const tryFind = (from: number, to: number): number | null => {
      for (let i = from; i <= to; i++) {
        if (tableSeparatorRegex.test(lines[i].trim())) {
          if (i > 0 && lines[i - 1].trim().startsWith('|')) return i;
        }
      }
      return null;
    };

    // Check selection lines first, then scan around
    let sepIdx = tryFind(selStartLine, selEndLine);
    if (sepIdx === null) {
      sepIdx = tryFind(Math.max(0, selStartLine - 10), Math.min(lines.length - 1, selEndLine + 10));
    }

    if (sepIdx === null) { tableSnapshotRef.current = null; return; }

    const tableStart = sepIdx - 1;
    let tableEnd = sepIdx;
    for (let j = sepIdx + 1; j < lines.length; j++) {
      if (lines[j].trim().startsWith('|')) tableEnd = j; else break;
    }

    if (selStartLine > tableEnd || selEndLine < tableStart) {
      tableSnapshotRef.current = null;
      return;
    }

    tableSnapshotRef.current = {
      selStartLine,
      selEndLine,
      cursorStart,
      cursorEnd,
      lines,
      separatorLineIndex: sepIdx,
      tableStartLine: tableStart,
      tableEndLine: tableEnd
    };
  };

  const applyAlignmentToExistingTable = (alignment: TableAlignment) => {
    const editor = getEditor();
    if (!editor) return;
    const snap = tableSnapshotRef.current;
    if (!snap) return;

    // Re-read current text to get the up-to-date separator line position
    // (it may have shifted from previous alignment changes).
    const text = editor.getValue ? editor.getValue() : value;
    const currentLines = text.split('\n');

    // The separator is still at the same line index – only its content changed.
    const sepIdx = snap.separatorLineIndex;
    if (sepIdx >= currentLines.length) return;
    if (!tableSeparatorRegex.test(currentLines[sepIdx].trim())) return;

    const separatorLineStart = currentLines.slice(0, sepIdx).reduce((acc, l) => acc + l.length + 1, 0);
    const separatorLineEnd = separatorLineStart + currentLines[sepIdx].length;
    const oldSeparator = currentLines[sepIdx];

    // Use snapshot's cursor info for column detection (stable across edits)
    const selectedCols = getSelectedColumns(
      snap.lines, snap.selStartLine, snap.selEndLine,
      snap.cursorStart, snap.cursorEnd, snap.tableStartLine
    );

    const newSep = separatorForAlignment(alignment);
    const totalCols = (oldSeparator.match(tableSeparatorCellRegex) || []).length;

    let newSeparator: string;
    if (selectedCols && (selectedCols.startCol !== 0 || selectedCols.endCol !== totalCols - 1)) {
      let colIdx = 0;
      newSeparator = oldSeparator.replace(tableSeparatorCellRegex, (match) => {
        const shouldReplace = colIdx >= selectedCols.startCol && colIdx <= selectedCols.endCol;
        colIdx++;
        return shouldReplace ? newSep : match;
      });
    } else {
      newSeparator = oldSeparator.replace(tableSeparatorCellRegex, () => newSep);
    }

    if (editor.replaceRange) {
      editor.replaceRange(separatorLineStart, separatorLineEnd, newSeparator);
    } else {
      const newText = text.substring(0, separatorLineStart) + newSeparator + text.substring(separatorLineEnd);
      onChange(newText);
    }
  };

  const handleTable = (rows: number, cols: number, alignment: TableAlignment) => {
    const tableMarkdown = generateTableMarkdown(rows, cols, alignment);
    insertText(tableMarkdown);
    setShowTableMenu(false);
    setTableHover({ rows: 0, cols: 0 });
  };

  const handleTableClick = () => {
    if (showTableMenu) {
      setShowTableMenu(false);
      setTableHover({ rows: 0, cols: 0 });
      return;
    }
    // Capture cursor context BEFORE focus moves to the dropdown
    captureTableSnapshot();
    if (tableButtonRef.current) {
      const rect = tableButtonRef.current.getBoundingClientRect();
      setTableMenuPos({ top: rect.bottom + 4, left: rect.left });
    }
    setShowTableMenu(true);
  };

  const handleAlignmentClick = (alignment: TableAlignment) => {
    setTableAlignment(alignment);
    if (tableSnapshotRef.current) {
      applyAlignmentToExistingTable(alignment);
    }
  };

  const handleTableGridClick = (rows: number, cols: number) => {
    handleTable(rows, cols, tableAlignment);
  };

  const handleHorizontalLine = () => {
    const editor = getEditor();
    if (!editor) return;

    const end = editor.selectionEnd;

    // Use '\n\n---\n' to ensure a blank line before the hr
    // This prevents the previous text from becoming a setext heading
    const insertText = '\n\n---\n';

    // Use replaceRange if available (CodeMirror) for proper undo support
    if (editor.replaceRange) {
      editor.replaceRange(end, end, insertText);
      setTimeout(() => {
        const newPos = end + insertText.length;
        editor.setSelectionRange(newPos, newPos);
        editor.focus();
      }, 0);
    } else {
      // Fallback for textarea
      const newText = value.substring(0, end) + insertText + value.substring(end);
      onChange(newText);
      setTimeout(() => {
        const newPos = end + insertText.length;
        editor.setSelectionRange(newPos, newPos);
        editor.focus();
      }, 0);
    }
  };

  // Special characters grid data
  const specialCharCategories = [
    { label: 'Typo', chars: [
      { char: '\u2014', title: 'Em dash' },
      { char: '\u2013', title: 'En dash' },
      { char: '\u2026', title: 'Ellipsis' },
      { char: '\u00B7', title: 'Middle dot' },
      { char: '\u2022', title: 'Bullet' },
      { char: '\u203D', title: 'Interrobang' },
    ]},
    { label: '\u2192', chars: [
      { char: '\u2190', title: 'Left arrow' },
      { char: '\u2192', title: 'Right arrow' },
      { char: '\u2191', title: 'Up arrow' },
      { char: '\u2193', title: 'Down arrow' },
      { char: '\u2194', title: 'Left right arrow' },
      { char: '\u21D2', title: 'Right double arrow' },
    ]},
    { label: '\u00D7', chars: [
      { char: '\u00D7', title: 'Multiplication' },
      { char: '\u00F7', title: 'Division' },
      { char: '\u00B1', title: 'Plus minus' },
      { char: '\u2260', title: 'Not equal' },
      { char: '\u2248', title: 'Almost equal' },
      { char: '\u2264', title: 'Less or equal' },
      { char: '\u2265', title: 'Greater or equal' },
      { char: '\u221E', title: 'Infinity' },
    ]},
    { label: '\u00A9', chars: [
      { char: '\u00A9', title: 'Copyright' },
      { char: '\u00AE', title: 'Registered' },
      { char: '\u2122', title: 'Trademark' },
      { char: '\u00B0', title: 'Degree' },
      { char: '\u00A7', title: 'Section' },
      { char: '\u2020', title: 'Dagger' },
    ]},
  ];

  const insertSpecialChar = (char: string) => {
    const editor = getEditor();
    if (!editor) return;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    if (editor.replaceRange) {
      editor.replaceRange(start, end, char);
      setTimeout(() => {
        editor.setSelectionRange(start + char.length, start + char.length);
        editor.focus();
      }, 0);
    } else {
      const currentValue = editor.getValue ? editor.getValue() : value;
      const newText = currentValue.substring(0, start) + char + currentValue.substring(end);
      onChange(newText);
      setTimeout(() => {
        editor.setSelectionRange(start + char.length, start + char.length);
        editor.focus();
      }, 0);
    }
    setShowCharMenu(false);
  };

  const handleCharClick = () => {
    if (charButtonRef.current) {
      const rect = charButtonRef.current.getBoundingClientRect();
      setCharMenuPos({ top: rect.bottom + 4, left: rect.left });
    }
    setShowCharMenu(!showCharMenu);
  };

  // Simple formatting buttons (don't create sidebar elements)
  const simpleFormattingButtons = [
    { icon: getIconPath('Bold_icon.svg'), translationKey: 'toolbar.bold', onClick: handleBold },
    { icon: getIconPath('Italic_icon.svg'), translationKey: 'toolbar.italic', onClick: handleItalic },
    { icon: getIconPath('Strike_icon.svg'), translationKey: 'toolbar.strikethrough', onClick: handleStrikethrough },
    { icon: getIconPath('InLineCode_icon.svg'), translationKey: 'toolbar.code', onClick: handleInlineCode },
    { icon: getIconPath('Sobrescrito_icon.svg'), translationKey: 'toolbar.superscript', onClick: handleSuperscript },
    { icon: getIconPath('Subescrito_icon.svg'), translationKey: 'toolbar.subscript', onClick: handleSubscript },
    { icon: getIconPath('Line_icon.svg'), translationKey: 'toolbar.horizontalRule', onClick: handleHorizontalLine },
  ];

  // Buttons that create sidebar elements (lists)
  const listButtons = [
    { icon: getIconPath('NumberedList_icon.svg'), translationKey: 'toolbar.orderedList', onClick: handleNumberedList },
    { icon: getIconPath('List_icon.svg'), translationKey: 'toolbar.unorderedList', onClick: handleBulletList },
    { icon: getIconPath('Task_icon.svg'), translationKey: 'toolbar.taskList', onClick: handleTask },
  ];

  // Other sidebar element buttons
  const otherSidebarButtons = [
    { icon: getIconPath('CodeBlock_icon.svg'), translationKey: 'toolbar.codeBlock', onClick: handleCodeBlock },
    { icon: getIconPath('Footnote_icon.svg'), translationKey: 'toolbar.footnote', onClick: handleFootnote },
    { icon: getIconPath('Details_icon.svg'), translationKey: 'toolbar.details', onClick: handleDetails },
  ];

  const GRID_COLS = 10;
  const GRID_ROWS = 8;

  const renderButton = (button: { icon: string; translationKey: string; onClick: () => void }, index: number) => {
    const label = t(button.translationKey);
    return (
      <button
        key={index}
        onClick={button.onClick}
        className="w-[30px] h-[30px] flex-shrink-0 flex items-center justify-center hover:bg-[var(--hover-bg)] rounded transition-colors"
        aria-label={label}
        title={label}
      >
        <img src={button.icon} alt={label} className="w-6 h-6" />
      </button>
    );
  };

  return (
    <>
      <div className="min-h-[40px] bg-[var(--bg-secondary)] flex items-center justify-center flex-wrap px-3 py-2 gap-[5px] border-b border-[var(--border-primary)]">
        {/* Simple formatting buttons */}
        {simpleFormattingButtons.map(renderButton)}

        {/* Vertical separator */}
        <div className="w-px h-5 bg-[var(--split-line)] mx-3 flex-shrink-0" />

        {/* Heading button with dropdown */}
        <div className="relative flex-shrink-0" ref={headingButtonRef}>
          <button
            onMouseDown={handleHeadingMouseDown}
            onMouseUp={handleHeadingMouseUp}
            onMouseLeave={handleHeadingMouseLeave}
            className="w-[30px] h-[30px] flex items-center justify-center hover:bg-[var(--hover-bg)] rounded transition-colors"
            aria-label={t('toolbar.heading')}
            title={t('toolbar.heading')}
          >
            <img src={getIconPath('Heading_icon.svg')} alt={t('toolbar.heading')} className="w-6 h-6" />
          </button>

          {showHeadingMenu && isMounted && createPortal(
            <div
              ref={headingMenuRef}
              className="fixed bg-[var(--dropdown-bg)] border border-[var(--border-primary)] rounded-lg shadow-lg z-[9999] min-w-[120px] overflow-hidden"
              style={{ top: headingMenuPos.top, left: headingMenuPos.left }}
            >
              {headingOptions.map((option) => (
                <button
                  key={option.level}
                  onClick={() => handleHeading(option.level)}
                  className="w-full px-3 py-1.5 text-left hover:bg-[var(--bg-secondary)] flex items-center gap-2 text-sm"
                >
                  <span className="font-bold text-[var(--text-secondary)]">{option.label}</span>
                  <span className="text-[var(--text-muted)] text-xs">{option.description}</span>
                </button>
              ))}
            </div>,
            document.body
          )}
        </div>

        {/* Quote button with dropdown */}
        <div className="relative flex-shrink-0" ref={quoteButtonRef}>
          <button
            onMouseDown={handleQuoteMouseDown}
            onMouseUp={handleQuoteMouseUp}
            onMouseLeave={handleQuoteMouseLeave}
            className="w-[30px] h-[30px] flex items-center justify-center hover:bg-[var(--hover-bg)] rounded transition-colors"
            aria-label={t('toolbar.blockquote')}
            title={t('toolbar.blockquote')}
          >
            <img src={getIconPath('Quote_icon.svg')} alt={t('toolbar.blockquote')} className="w-6 h-6" />
          </button>

          {showQuoteMenu && isMounted && createPortal(
            <div
              ref={quoteMenuRef}
              className="fixed bg-[var(--dropdown-bg)] border border-[var(--border-primary)] rounded-lg shadow-lg z-[9999] min-w-[180px] overflow-hidden"
              style={{ top: quoteMenuPos.top, left: quoteMenuPos.left }}
            >
              {quoteOptions.map((option) => (
                <button
                  key={option.level}
                  onClick={() => handleQuote(option.level)}
                  className="w-full px-3 py-1.5 text-left hover:bg-[var(--bg-secondary)] flex items-center gap-2 text-sm"
                >
                  <span className="font-bold text-[var(--text-secondary)] font-mono">{option.label}</span>
                  <span className="text-[var(--text-muted)] text-xs">{option.description}</span>
                </button>
              ))}
            </div>,
            document.body
          )}
        </div>

        {/* List buttons */}
        {listButtons.map((button, index) => renderButton(button, index + 100))}

        {/* Link button with dropdown */}
        <div className="relative flex-shrink-0" ref={linkButtonRef}>
          <button
            onMouseDown={handleLinkMouseDown}
            onMouseUp={handleLinkMouseUp}
            onMouseLeave={handleLinkMouseLeave}
            className="w-[30px] h-[30px] flex items-center justify-center hover:bg-[var(--hover-bg)] rounded transition-colors"
            aria-label={t('toolbar.link')}
            title={t('toolbar.link')}
          >
            <img src={getIconPath('URL_icon.svg')} alt={t('toolbar.link')} className="w-6 h-6" />
          </button>

          {showLinkMenu && isMounted && createPortal(
            <div
              ref={linkMenuRef}
              className="fixed bg-[var(--dropdown-bg)] border border-[var(--border-primary)] rounded-lg shadow-lg z-[9999] min-w-[180px] overflow-hidden"
              style={{ top: linkMenuPos.top, left: linkMenuPos.left }}
            >
              <button
                onClick={handleLink}
                className="w-full px-3 py-1.5 text-left hover:bg-[var(--bg-secondary)] flex items-center gap-2 text-sm"
              >
                <span className="text-[var(--text-secondary)]">{t('toolbar.linkInline')}</span>
              </button>
              <button
                onClick={handleReferenceLink}
                className="w-full px-3 py-1.5 text-left hover:bg-[var(--bg-secondary)] flex items-center gap-2 text-sm"
              >
                <span className="text-[var(--text-secondary)]">{t('toolbar.linkReference')}</span>
              </button>
            </div>,
            document.body
          )}
        </div>

        {/* Image button with dropdown */}
        <div className="relative flex-shrink-0" ref={imageButtonRef}>
          <button
            onMouseDown={handleImageMouseDown}
            onMouseUp={handleImageMouseUp}
            onMouseLeave={handleImageMouseLeave}
            className="w-[30px] h-[30px] flex items-center justify-center hover:bg-[var(--hover-bg)] rounded transition-colors"
            aria-label={t('toolbar.image')}
            title={t('toolbar.image')}
          >
            <img src={getIconPath('Image_icon.svg')} alt={t('toolbar.image')} className="w-6 h-6" />
          </button>

          {showImageMenu && isMounted && createPortal(
            <div
              ref={imageMenuRef}
              className="fixed bg-[var(--dropdown-bg)] border border-[var(--border-primary)] rounded-lg shadow-lg z-[9999] min-w-[180px] overflow-hidden"
              style={{ top: imageMenuPos.top, left: imageMenuPos.left }}
            >
              <button
                onClick={handleLocalImage}
                className="w-full px-3 py-1.5 text-left hover:bg-[var(--bg-secondary)] flex items-center gap-2 text-sm"
              >
                <span className="text-[var(--text-secondary)]">{t('toolbar.localImage')}</span>
              </button>
              <button
                onClick={handleLinkedImage}
                className="w-full px-3 py-1.5 text-left hover:bg-[var(--bg-secondary)] flex items-center gap-2 text-sm"
              >
                <span className="text-[var(--text-secondary)]">{t('toolbar.linkedImage')}</span>
              </button>
            </div>,
            document.body
          )}
        </div>

        {/* Hidden file input for local images */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*"
          className="hidden"
        />

        {/* Table button with grid dropdown */}
        <div className="relative flex-shrink-0" ref={tableButtonRef}>
          <button
            onClick={handleTableClick}
            className="w-[30px] h-[30px] flex items-center justify-center hover:bg-[var(--hover-bg)] rounded transition-colors"
            aria-label={t('toolbar.table')}
            title={t('toolbar.table')}
          >
            <img src={getIconPath('Table_icon.svg')} alt={t('toolbar.table')} className="w-6 h-6" />
          </button>

          {showTableMenu && isMounted && createPortal(
            <div
              ref={tableMenuRef}
              className="fixed bg-[var(--dropdown-bg)] border border-[var(--border-primary)] rounded-lg shadow-lg z-[9999] p-2"
              style={{ top: tableMenuPos.top, left: tableMenuPos.left }}
            >
              <div className="text-xs text-[var(--text-secondary)] mb-2 text-center">
                {tableHover.rows > 0 && tableHover.cols > 0
                  ? `${tableHover.rows} × ${tableHover.cols}`
                  : t('toolbar.selectTableSize')}
              </div>
              <div
                className="grid gap-[2px]"
                style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)` }}
                onMouseLeave={() => setTableHover({ rows: 0, cols: 0 })}
              >
                {Array(GRID_ROWS).fill(null).map((_, rowIndex) =>
                  Array(GRID_COLS).fill(null).map((_, colIndex) => {
                    const isHighlighted = rowIndex < tableHover.rows && colIndex < tableHover.cols;
                    return (
                      <div
                        key={`${rowIndex}-${colIndex}`}
                        className={`w-4 h-4 border cursor-pointer transition-colors ${
                          isHighlighted
                            ? 'bg-[var(--text-secondary)] border-[var(--text-secondary)]'
                            : 'bg-[var(--bg-primary)] border-[var(--border-primary)] hover:border-[var(--text-muted)]'
                        }`}
                        onMouseEnter={() => setTableHover({ rows: rowIndex + 1, cols: colIndex + 1 })}
                        onClick={() => handleTableGridClick(rowIndex + 1, colIndex + 1)}
                      />
                    );
                  })
                )}
              </div>
              <div className="border-t border-[var(--border-primary)] mt-2 pt-2 flex gap-1">
                {(['left', 'center', 'right'] as TableAlignment[]).map((align) => (
                  <button
                    key={align}
                    onClick={() => handleAlignmentClick(align)}
                    className={`flex-1 text-xs py-1 px-2 rounded transition-colors ${
                      tableAlignment === align
                        ? 'bg-[var(--text-secondary)] text-[var(--bg-primary)]'
                        : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]'
                    }`}
                  >
                    {t(`toolbar.align${align.charAt(0).toUpperCase() + align.slice(1)}`)}
                  </button>
                ))}
              </div>
            </div>,
            document.body
          )}
        </div>

        {/* Other sidebar element buttons */}
        {otherSidebarButtons.map((button, index) => renderButton(button, index + 200))}

        {/* Special characters button with dropdown */}
        <div className="relative flex-shrink-0" ref={charButtonRef}>
          <button
            onClick={handleCharClick}
            className="w-[30px] h-[30px] flex items-center justify-center hover:bg-[var(--hover-bg)] rounded transition-colors"
            aria-label={t('toolbar.specialChars')}
            title={t('toolbar.specialChars')}
          >
            <img src={getIconPath('SpecialChar_icon.svg')} alt={t('toolbar.specialChars')} className="w-6 h-6" />
          </button>

          {showCharMenu && isMounted && createPortal(
            <div
              ref={charMenuRef}
              className="fixed bg-[var(--dropdown-bg)] border border-[var(--border-primary)] rounded-lg shadow-lg z-[9999] p-2 w-[220px]"
              style={{ top: charMenuPos.top, left: charMenuPos.left }}
            >
              {specialCharCategories.map((category) => (
                <div key={category.label}>
                  <div className="text-[10px] text-[var(--text-muted)] px-1 pt-1 pb-0.5">{category.label}</div>
                  <div className="grid grid-cols-6 gap-1">
                    {category.chars.map((item) => (
                      <button
                        key={item.char}
                        onClick={() => insertSpecialChar(item.char)}
                        title={item.title}
                        className="w-8 h-8 flex items-center justify-center text-base text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] rounded transition-colors"
                      >
                        {item.char}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>,
            document.body
          )}
        </div>

        {/* Alert button with dropdown */}
        <div className="relative flex-shrink-0" ref={alertButtonRef}>
          <button
            onClick={handleAlertClick}
            className="w-[30px] h-[30px] flex items-center justify-center hover:bg-[var(--hover-bg)] rounded transition-colors"
            aria-label={t('toolbar.alert')}
            title={t('toolbar.alert')}
          >
            <img src={getIconPath('Alerts_icon.svg')} alt={t('toolbar.alert')} className="w-6 h-6" />
          </button>

          {showAlertMenu && isMounted && createPortal(
            <div
              ref={alertMenuRef}
              className="fixed bg-[var(--dropdown-bg)] border border-[var(--border-primary)] rounded-lg shadow-lg z-[9999] min-w-[180px] overflow-hidden"
              style={{ top: alertMenuPos.top, left: alertMenuPos.left }}
            >
              {alertOptions.map((option) => (
                <button
                  key={option.type}
                  onClick={() => handleAlert(option.type)}
                  className="w-full px-3 py-1.5 text-left hover:bg-[var(--bg-secondary)] flex items-center gap-2 text-sm"
                >
                  <span
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: option.color }}
                  />
                  <span className="font-semibold text-[var(--text-secondary)]">{option.label}</span>
                  <span className="text-[var(--text-muted)] text-xs">{option.description}</span>
                </button>
              ))}
            </div>,
            document.body
          )}
        </div>
      </div>

      {/* Modal for linked image */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-[var(--dropdown-bg)] rounded-lg shadow-xl p-6 w-[400px] max-w-[90vw]">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">{t('toolbar.insertLinkedImage')}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1">{t('toolbar.imageUrl')}</label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://exemplo.com/imagem.png"
                  className="w-full px-3 py-2 border border-[var(--border-primary)] rounded focus:outline-none focus:border-[var(--text-secondary)] bg-[var(--bg-primary)] text-[var(--text-preview)]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1">{t('toolbar.altText')}</label>
                <input
                  type="text"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  placeholder="Descrição da imagem"
                  className="w-full px-3 py-2 border border-[var(--border-primary)] rounded focus:outline-none focus:border-[var(--text-secondary)] bg-[var(--bg-primary)] text-[var(--text-preview)]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={handleImageModalCancel}
                className="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] rounded transition-colors"
              >
                {t('buttons.cancel')}
              </button>
              <button
                onClick={handleImageModalConfirm}
                className="px-4 py-2 bg-[var(--button-bg)] text-[var(--text-button)] rounded hover:bg-[var(--button-hover)] transition-colors"
              >
                {t('toolbar.insert')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
