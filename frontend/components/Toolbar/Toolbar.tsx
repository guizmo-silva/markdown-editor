'use client';

import { RefObject, useState, useRef, useEffect } from 'react';

interface ToolbarProps {
  textareaRef: RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (value: string) => void;
}

export default function Toolbar({
  textareaRef,
  value,
  onChange
}: ToolbarProps) {
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);
  const [showQuoteMenu, setShowQuoteMenu] = useState(false);
  const [showImageMenu, setShowImageMenu] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [tableHover, setTableHover] = useState({ rows: 0, cols: 0 });
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const headingButtonRef = useRef<HTMLDivElement>(null);
  const quoteButtonRef = useRef<HTMLDivElement>(null);
  const imageButtonRef = useRef<HTMLDivElement>(null);
  const tableButtonRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  // Close dropdown menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headingButtonRef.current && !headingButtonRef.current.contains(event.target as Node)) {
        setShowHeadingMenu(false);
      }
      if (quoteButtonRef.current && !quoteButtonRef.current.contains(event.target as Node)) {
        setShowQuoteMenu(false);
      }
      if (imageButtonRef.current && !imageButtonRef.current.contains(event.target as Node)) {
        setShowImageMenu(false);
      }
      if (tableButtonRef.current && !tableButtonRef.current.contains(event.target as Node)) {
        setShowTableMenu(false);
        setTableHover({ rows: 0, cols: 0 });
      }
    };

    if (showHeadingMenu || showQuoteMenu || showImageMenu || showTableMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHeadingMenu, showQuoteMenu, showImageMenu, showTableMenu]);

  // Helper function to wrap selected text or insert at cursor
  const wrapText = (prefix: string, suffix: string, placeholder: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const textToInsert = selectedText || placeholder;
    const newText = value.substring(0, start) + prefix + textToInsert + suffix + value.substring(end);

    onChange(newText);

    // Set cursor position
    setTimeout(() => {
      if (selectedText) {
        textarea.selectionStart = start;
        textarea.selectionEnd = end + prefix.length + suffix.length;
      } else {
        textarea.selectionStart = textarea.selectionEnd = start + prefix.length + textToInsert.length;
      }
      textarea.focus();
    }, 0);
  };

  // Helper function to toggle formatting (add or remove)
  const toggleFormat = (prefix: string, suffix: string, placeholder: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    // Check if the selected text is already wrapped with the format
    const beforeSelection = value.substring(Math.max(0, start - prefix.length), start);
    const afterSelection = value.substring(end, end + suffix.length);

    const isAlreadyFormatted = beforeSelection === prefix && afterSelection === suffix;

    if (isAlreadyFormatted) {
      // Remove formatting
      const newText =
        value.substring(0, start - prefix.length) +
        selectedText +
        value.substring(end + suffix.length);

      onChange(newText);

      // Adjust cursor position
      setTimeout(() => {
        textarea.selectionStart = start - prefix.length;
        textarea.selectionEnd = end - prefix.length;
        textarea.focus();
      }, 0);
    } else {
      // Check if selection includes the formatting markers
      if (selectedText.startsWith(prefix) && selectedText.endsWith(suffix) && selectedText.length > prefix.length + suffix.length) {
        // Remove formatting from the selected text
        const unwrappedText = selectedText.substring(prefix.length, selectedText.length - suffix.length);
        const newText = value.substring(0, start) + unwrappedText + value.substring(end);

        onChange(newText);

        setTimeout(() => {
          textarea.selectionStart = start;
          textarea.selectionEnd = start + unwrappedText.length;
          textarea.focus();
        }, 0);
      } else {
        // Add formatting
        const textToInsert = selectedText || placeholder;
        const newText = value.substring(0, start) + prefix + textToInsert + suffix + value.substring(end);

        onChange(newText);

        setTimeout(() => {
          if (selectedText) {
            textarea.selectionStart = start + prefix.length;
            textarea.selectionEnd = end + prefix.length;
          } else {
            textarea.selectionStart = textarea.selectionEnd = start + prefix.length + textToInsert.length;
          }
          textarea.focus();
        }, 0);
      }
    }
  };

  // Helper function to insert text at cursor or replace selection
  const insertText = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = value.substring(0, start) + text + value.substring(end);

    onChange(newText);

    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + text.length;
      textarea.focus();
    }, 0);
  };

  // Helper function to add prefix to current line
  const addLinePrefix = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const newText = value.substring(0, lineStart) + prefix + value.substring(lineStart);

    onChange(newText);

    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + prefix.length;
      textarea.focus();
    }, 0);
  };

  // Helper function to toggle line prefix (add or remove)
  const toggleLinePrefix = (prefix: string, alternativePrefixes: string[] = []) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = value.indexOf('\n', start);
    const lineContent = value.substring(lineStart, lineEnd === -1 ? value.length : lineEnd);

    // Check if line starts with the prefix or any alternative prefix
    const allPrefixes = [prefix, ...alternativePrefixes];
    const matchedPrefix = allPrefixes.find(p => lineContent.startsWith(p));

    if (matchedPrefix) {
      // Remove the prefix
      const newText = value.substring(0, lineStart) + lineContent.substring(matchedPrefix.length) + value.substring(lineEnd === -1 ? value.length : lineEnd);
      onChange(newText);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = Math.max(lineStart, start - matchedPrefix.length);
        textarea.focus();
      }, 0);
    } else {
      // Add the prefix
      const newText = value.substring(0, lineStart) + prefix + value.substring(lineStart);
      onChange(newText);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + prefix.length;
        textarea.focus();
      }, 0);
    }
  };

  const handleBold = () => toggleFormat('**', '**', 'bold text');
  const handleItalic = () => toggleFormat('*', '*', 'italic text');
  const handleStrikethrough = () => toggleFormat('~~', '~~', 'strikethrough text');

  // Heading handlers with long press support
  const handleHeading = (level: number = 1) => {
    const prefix = '#'.repeat(level) + ' ';
    addLinePrefix(prefix);
    setShowHeadingMenu(false);
  };

  const handleHeadingMouseDown = () => {
    isLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setShowHeadingMenu(true);
    }, 300);
  };

  const handleHeadingMouseUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (!isLongPressRef.current) {
      handleHeading(1);
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
  const handleSubscript = () => toggleFormat('<sub>', '</sub>', 'subscript');
  const handleSuperscript = () => toggleFormat('<sup>', '</sup>', 'superscript');
  const handleBulletList = () => addLinePrefix('- ');
  const handleNumberedList = () => addLinePrefix('1. ');

  // Quote handlers with long press support
  const handleQuote = (level: number = 1) => {
    const prefix = '>'.repeat(level) + ' ';
    addLinePrefix(prefix);
    setShowQuoteMenu(false);
  };

  const handleQuoteMouseDown = () => {
    isLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setShowQuoteMenu(true);
    }, 300);
  };

  const handleQuoteMouseUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (!isLongPressRef.current) {
      handleQuote(1);
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
  const handleTask = () => toggleLinePrefix('- [ ] ', ['- [x] ', '- [X] ']);
  const handleLink = () => wrapText('[', '](url)', 'link text');
  const handleInlineCode = () => toggleFormat('`', '`', 'code');
  const handleCodeBlock = () => insertText('\n```\ncode\n```\n');

  // Image handlers with long press support
  const handleImage = () => {
    insertText('![alt text](image-url)');
    setShowImageMenu(false);
  };

  const handleImageMouseDown = () => {
    isLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
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

  // Table handlers with long press support
  const generateTableMarkdown = (rows: number, cols: number) => {
    if (rows === 0 || cols === 0) return '';

    const headerRow = '| ' + Array(cols).fill('Column').map((c, i) => `${c} ${i + 1}`).join(' | ') + ' |';
    const separatorRow = '|' + Array(cols).fill('----------').join('|') + '|';
    const dataRows = Array(rows - 1).fill(null).map((_, rowIndex) =>
      '| ' + Array(cols).fill('Cell').map((c, colIndex) => `${c} ${rowIndex + 1}-${colIndex + 1}`).join(' | ') + ' |'
    ).join('\n');

    return `\n${headerRow}\n${separatorRow}\n${dataRows}\n`;
  };

  const handleTable = (rows: number = 2, cols: number = 2) => {
    const tableMarkdown = generateTableMarkdown(rows, cols);
    insertText(tableMarkdown);
    setShowTableMenu(false);
    setTableHover({ rows: 0, cols: 0 });
  };

  const handleTableMouseDown = () => {
    isLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setShowTableMenu(true);
    }, 300);
  };

  const handleTableMouseUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (!isLongPressRef.current) {
      handleTable(2, 2);
    }
  };

  const handleTableMouseLeave = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTableGridClick = (rows: number, cols: number) => {
    handleTable(rows, cols);
  };

  const handleHorizontalLine = () => insertText('\n---\n');

  const buttonsBeforeHeading = [
    { icon: '/Bold_icon.svg', alt: 'Bold', onClick: handleBold },
    { icon: '/Italic_icon.svg', alt: 'Italic', onClick: handleItalic },
    { icon: '/Strike_icon.svg', alt: 'Strikethrough', onClick: handleStrikethrough },
  ];

  const buttonsBetweenQuoteAndImage = [
    { icon: '/NumberedList_icon.svg', alt: 'Numbered List', onClick: handleNumberedList },
    { icon: '/List_icon.svg', alt: 'Bullet List', onClick: handleBulletList },
    { icon: '/InLineCode_icon.svg', alt: 'Inline Code', onClick: handleInlineCode },
    { icon: '/CodeBlock_icon.svg', alt: 'Code Block', onClick: handleCodeBlock },
    { icon: '/URL_icon.svg', alt: 'Link', onClick: handleLink },
  ];

  const buttonsAfterTable = [
    { icon: '/Line_icon.svg', alt: 'Horizontal Line', onClick: handleHorizontalLine },
    { icon: '/Task_icon.svg', alt: 'Task', onClick: handleTask },
    { icon: '/Sobrescrito_icon.svg', alt: 'Superscript', onClick: handleSuperscript },
    { icon: '/Subescrito_icon.svg', alt: 'Subscript', onClick: handleSubscript }
  ];

  const GRID_SIZE = 8;

  const renderButton = (button: { icon: string; alt: string; onClick: () => void }, index: number) => (
    <button
      key={index}
      onClick={button.onClick}
      className="w-6 h-6 flex items-center justify-center hover:bg-[#DADADA] rounded transition-colors"
      aria-label={button.alt}
    >
      <img src={button.icon} alt={button.alt} className="w-full h-full" />
    </button>
  );

  return (
    <>
      <div className="h-[40px] min-h-[40px] max-h-[40px] bg-[#E9E9E9] flex items-center justify-center px-3 gap-2 border-b border-[#CCCCCC]">
        {buttonsBeforeHeading.map(renderButton)}

        {/* Heading button with dropdown */}
        <div className="relative" ref={headingButtonRef}>
          <button
            onMouseDown={handleHeadingMouseDown}
            onMouseUp={handleHeadingMouseUp}
            onMouseLeave={handleHeadingMouseLeave}
            className="w-6 h-6 flex items-center justify-center hover:bg-[#DADADA] rounded transition-colors"
            aria-label="Heading"
          >
            <img src="/Heading_icon.svg" alt="Heading" className="w-full h-full" />
          </button>

          {showHeadingMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-[#CCCCCC] rounded shadow-lg z-50 min-w-[120px]">
              {headingOptions.map((option) => (
                <button
                  key={option.level}
                  onClick={() => handleHeading(option.level)}
                  className="w-full px-3 py-1.5 text-left hover:bg-[#E9E9E9] flex items-center gap-2 text-sm"
                >
                  <span className="font-bold text-[#666666]">{option.label}</span>
                  <span className="text-[#999999] text-xs">{option.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quote button with dropdown */}
        <div className="relative" ref={quoteButtonRef}>
          <button
            onMouseDown={handleQuoteMouseDown}
            onMouseUp={handleQuoteMouseUp}
            onMouseLeave={handleQuoteMouseLeave}
            className="w-6 h-6 flex items-center justify-center hover:bg-[#DADADA] rounded transition-colors"
            aria-label="Quote"
          >
            <img src="/Quote_icon.svg" alt="Quote" className="w-full h-full" />
          </button>

          {showQuoteMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-[#CCCCCC] rounded shadow-lg z-50 min-w-[180px]">
              {quoteOptions.map((option) => (
                <button
                  key={option.level}
                  onClick={() => handleQuote(option.level)}
                  className="w-full px-3 py-1.5 text-left hover:bg-[#E9E9E9] flex items-center gap-2 text-sm"
                >
                  <span className="font-bold text-[#666666] font-mono">{option.label}</span>
                  <span className="text-[#999999] text-xs">{option.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {buttonsBetweenQuoteAndImage.map((button, index) => renderButton(button, index + 100))}

        {/* Image button with dropdown */}
        <div className="relative" ref={imageButtonRef}>
          <button
            onMouseDown={handleImageMouseDown}
            onMouseUp={handleImageMouseUp}
            onMouseLeave={handleImageMouseLeave}
            className="w-6 h-6 flex items-center justify-center hover:bg-[#DADADA] rounded transition-colors"
            aria-label="Image"
          >
            <img src="/Image_icon.svg" alt="Image" className="w-full h-full" />
          </button>

          {showImageMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-[#CCCCCC] rounded shadow-lg z-50 min-w-[180px]">
              <button
                onClick={handleLocalImage}
                className="w-full px-3 py-1.5 text-left hover:bg-[#E9E9E9] flex items-center gap-2 text-sm"
              >
                <span className="text-[#666666]">Importar local</span>
              </button>
              <button
                onClick={handleLinkedImage}
                className="w-full px-3 py-1.5 text-left hover:bg-[#E9E9E9] flex items-center gap-2 text-sm"
              >
                <span className="text-[#666666]">Imagem linkada</span>
              </button>
            </div>
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
        <div className="relative" ref={tableButtonRef}>
          <button
            onMouseDown={handleTableMouseDown}
            onMouseUp={handleTableMouseUp}
            onMouseLeave={handleTableMouseLeave}
            className="w-6 h-6 flex items-center justify-center hover:bg-[#DADADA] rounded transition-colors"
            aria-label="Table"
          >
            <img src="/Table_icon.svg" alt="Table" className="w-full h-full" />
          </button>

          {showTableMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-[#CCCCCC] rounded shadow-lg z-50 p-2">
              <div className="text-xs text-[#666] mb-2 text-center">
                {tableHover.rows > 0 && tableHover.cols > 0
                  ? `${tableHover.rows} × ${tableHover.cols}`
                  : 'Selecione o tamanho'}
              </div>
              <div
                className="grid gap-[2px]"
                style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}
                onMouseLeave={() => setTableHover({ rows: 0, cols: 0 })}
              >
                {Array(GRID_SIZE).fill(null).map((_, rowIndex) =>
                  Array(GRID_SIZE).fill(null).map((_, colIndex) => {
                    const isHighlighted = rowIndex < tableHover.rows && colIndex < tableHover.cols;
                    return (
                      <div
                        key={`${rowIndex}-${colIndex}`}
                        className={`w-4 h-4 border cursor-pointer transition-colors ${
                          isHighlighted
                            ? 'bg-[#666] border-[#555]'
                            : 'bg-white border-[#CCCCCC] hover:border-[#999]'
                        }`}
                        onMouseEnter={() => setTableHover({ rows: rowIndex + 1, cols: colIndex + 1 })}
                        onClick={() => handleTableGridClick(rowIndex + 1, colIndex + 1)}
                      />
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {buttonsAfterTable.map((button, index) => renderButton(button, index + 200))}
      </div>

      {/* Modal for linked image */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-lg shadow-xl p-6 w-[400px] max-w-[90vw]">
            <h3 className="text-lg font-semibold text-[#333] mb-4">Inserir imagem linkada</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#666] mb-1">URL da imagem</label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://exemplo.com/imagem.png"
                  className="w-full px-3 py-2 border border-[#CCCCCC] rounded focus:outline-none focus:border-[#666] text-[#252525]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm text-[#666] mb-1">Texto alternativo (Alt)</label>
                <input
                  type="text"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  placeholder="Descrição da imagem"
                  className="w-full px-3 py-2 border border-[#CCCCCC] rounded focus:outline-none focus:border-[#666] text-[#252525]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={handleImageModalCancel}
                className="px-4 py-2 text-[#666] hover:bg-[#E9E9E9] rounded transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleImageModalConfirm}
                className="px-4 py-2 bg-[#333] text-white rounded hover:bg-[#555] transition-colors"
              >
                Inserir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
