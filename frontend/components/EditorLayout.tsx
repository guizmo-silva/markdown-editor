'use client';

import { useState } from 'react';
import { CodeEditor } from './Editor';
import { MarkdownPreview } from './Preview';
import { AssetsSidebar, ViewMode } from './Sidebar';

export default function EditorLayout() {
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [markdown, setMarkdown] = useState(`# Welcome to Markdown Editor

Start typing your markdown here...

## Features
- **Real-time preview**
- *Line numbers*
- ~~Character count~~
- \`Tab support\`
- Click assets in sidebar to navigate[^1]

## Images

Here's an example image:
![Markdown Logo](https://markdown-here.com/img/icon256.png)
![Another Image](https://via.placeholder.com/150)

## Links

Check out these resources:
- [GitHub](https://github.com)
- [Markdown Guide](https://www.markdownguide.org)
- [Internal link](#features)

## Code Example

\`\`\`javascript
function hello() {
  console.log("Hello, World!");
}
\`\`\`

## Table

| Feature | Status |
|---------|--------|
| Editor  | ✅ Done |
| Preview | ✅ Done |
| Sidebar | ✅ Done |
| Export  | 🔄 TODO |

## Alerts

[!NOTE] This is a note alert with important information.

[!TIP] Here's a helpful tip for you!

[!IMPORTANT] Pay attention to this important message.

[!WARNING] Be careful with this warning.

[!CAUTION] This is a caution alert.

## Blockquote

> This is a blockquote example.
> It can span multiple lines.

---

**Bold text** and *italic text* work perfectly!

## Footnotes

This text has a footnote reference[^1] and another one[^2].

[^1]: This is the first footnote definition.
[^2]: This is the second footnote with more details.`);

  const [scrollToLine, setScrollToLine] = useState<number | undefined>();

  const handleNavigateToLine = (line: number) => {
    setScrollToLine(line);
    // Reset after navigation to allow re-navigation to same line
    setTimeout(() => setScrollToLine(undefined), 100);
  };

  const handleFileSelect = (filePath: string) => {
    // TODO: Load file content from backend
    console.log('Selected file:', filePath);
    // For now, just log the selection
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-white">
      {/* Header */}
      <div className="h-[36px] bg-[#E9E9E9] border-b border-[#CCCCCC] flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold">Markdown Editor</span>
        </div>
      </div>

      {/* Layout: Sidebar (left) + Content (right) */}
      <div className="flex-1 flex flex-row overflow-hidden">
        {/* Sidebar - Left side */}
        <AssetsSidebar
          markdown={markdown}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onNavigateToLine={handleNavigateToLine}
          onFileSelect={handleFileSelect}
        />

        {/* Content Area - Based on view mode */}
        <div className="flex-1 flex overflow-hidden">
          {/* Code Editor */}
          {(viewMode === 'code' || viewMode === 'split') && (
            <div className={`${viewMode === 'split' ? 'flex-1 border-r border-[#999999]' : 'w-full'}`}>
              <CodeEditor
                value={markdown}
                onChange={setMarkdown}
                placeholder="Start typing your markdown..."
                scrollToLine={scrollToLine}
              />
            </div>
          )}

          {/* Preview */}
          {(viewMode === 'preview' || viewMode === 'split') && (
            <div className={viewMode === 'split' ? 'flex-1' : 'w-full'}>
              <MarkdownPreview content={markdown} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
