'use client';

import { RefObject } from 'react';

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

  const handleBold = () => wrapText('**', '**', 'bold text');
  const handleItalic = () => wrapText('*', '*', 'italic text');
  const handleStrikethrough = () => wrapText('~~', '~~', 'strikethrough text');
  const handleHeading = () => addLinePrefix('# ');
  const handleSubscript = () => wrapText('<sub>', '</sub>', 'subscript');
  const handleSuperscript = () => wrapText('<sup>', '</sup>', 'superscript');
  const handleBulletList = () => addLinePrefix('- ');
  const handleNumberedList = () => addLinePrefix('1. ');
  const handleQuote = () => addLinePrefix('> ');
  const handleTask = () => addLinePrefix('- [ ] ');
  const handleLink = () => wrapText('[', '](url)', 'link text');
  const handleInlineCode = () => wrapText('`', '`', 'code');
  const handleCodeBlock = () => insertText('\n```\ncode\n```\n');
  const handleImage = () => insertText('![alt text](image-url)');
  const handleTable = () => insertText('\n| Column 1 | Column 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |\n');
  const handleHorizontalLine = () => insertText('\n---\n');

  const toolbarButtons = [
    { icon: '/Bold_icon.svg', alt: 'Bold', onClick: handleBold },
    { icon: '/Italic_icon.svg', alt: 'Italic', onClick: handleItalic },
    { icon: '/Strike_icon.svg', alt: 'Strikethrough', onClick: handleStrikethrough },
    { icon: '/Heading_icon.svg', alt: 'Heading', onClick: handleHeading },
    { icon: '/Subescrito_icon.svg', alt: 'Subscript', onClick: handleSubscript },
    { icon: '/Sobrescrito_icon.svg', alt: 'Superscript', onClick: handleSuperscript },
    { icon: '/List_icon.svg', alt: 'Bullet List', onClick: handleBulletList },
    { icon: '/NumberedList_icon.svg', alt: 'Numbered List', onClick: handleNumberedList },
    { icon: '/Quote_icon.svg', alt: 'Quote', onClick: handleQuote },
    { icon: '/Task_icon.svg', alt: 'Task', onClick: handleTask },
    { icon: '/URL_icon.svg', alt: 'Link', onClick: handleLink },
    { icon: '/InLineCode_icon.svg', alt: 'Inline Code', onClick: handleInlineCode },
    { icon: '/CodeBlock_icon.svg', alt: 'Code Block', onClick: handleCodeBlock },
    { icon: '/Image_icon.svg', alt: 'Image', onClick: handleImage },
    { icon: '/Table_icon.svg', alt: 'Table', onClick: handleTable },
    { icon: '/Line_icon.svg', alt: 'Horizontal Line', onClick: handleHorizontalLine }
  ];

  return (
    <div className="h-[36px] bg-[#E9E9E9] flex items-center justify-center px-3 gap-2 border-b border-[#CCCCCC]">
      {toolbarButtons.map((button, index) => (
        <button
          key={index}
          onClick={button.onClick}
          className="w-6 h-6 flex items-center justify-center hover:bg-[#DADADA] rounded transition-colors"
          aria-label={button.alt}
        >
          <img src={button.icon} alt={button.alt} className="w-full h-full" />
        </button>
      ))}
    </div>
  );
}
