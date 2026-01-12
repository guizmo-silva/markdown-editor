// Simple HTML conversion for Phase 1
// Will be enhanced with proper markdown library

export const convertToHTML = async (markdown: string): Promise<string> => {
  // Basic conversion - will be replaced with proper library (marked, remark, etc)
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown Export</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      color: #333;
    }
    pre {
      background: #f4f4f4;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 1rem;
      overflow-x: auto;
    }
    code {
      background: #f4f4f4;
      padding: 0.2rem 0.4rem;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
    }
    blockquote {
      border-left: 4px solid #ddd;
      margin: 0;
      padding-left: 1rem;
      color: #666;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1rem 0;
    }
    table th, table td {
      border: 1px solid #ddd;
      padding: 0.5rem;
      text-align: left;
    }
    table th {
      background: #f4f4f4;
    }
  </style>
</head>
<body>
  <pre>${escapeHTML(markdown)}</pre>
  <hr>
  <p><em>Note: Full markdown rendering will be implemented in next phase</em></p>
</body>
</html>`;

  return html;
};

function escapeHTML(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
