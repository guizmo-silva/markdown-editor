/**
 * CSS constants for PDF export via Puppeteer.
 * Dark mode selectors (.preview-container.dark) are included but won't match
 * since the PDF HTML has no such class — only light mode rules apply.
 */

/** Light mode CSS variable values — injected at :root in the PDF document. */
export const PDF_CSS_VARS = `
  --bg-primary: #FFFFFF;
  --bg-secondary: #E9E9E9;
  --bg-code: #D8D8D8;
  --text-preview: #252525;
  --text-secondary: #666666;
  --border-primary: #CCCCCC;
`;

/** Styles from frontend/components/Preview/preview.css */
export const PREVIEW_CSS = `
.markdown-preview {
  line-height: 1.6;
  word-wrap: break-word;
  color: var(--text-preview);
}

.markdown-preview h1 {
  font-size: 2em;
  font-weight: 700;
  margin-top: 24px;
  margin-bottom: 16px;
  line-height: 1.25;
  border-bottom: 1px solid var(--border-primary);
  padding-bottom: 0.3em;
}

.markdown-preview h2 {
  font-size: 1.5em;
  font-weight: 700;
  margin-top: 24px;
  margin-bottom: 16px;
  line-height: 1.25;
  border-bottom: 1px solid var(--border-primary);
  padding-bottom: 0.3em;
}

.markdown-preview h3 {
  font-size: 1.25em;
  font-weight: 700;
  margin-top: 24px;
  margin-bottom: 16px;
  line-height: 1.25;
}

.markdown-preview h4 {
  font-size: 1em;
  font-weight: 700;
  margin-top: 24px;
  margin-bottom: 16px;
  line-height: 1.25;
}

.markdown-preview h5 {
  font-size: 0.875em;
  font-weight: 700;
  margin-top: 24px;
  margin-bottom: 16px;
  line-height: 1.25;
}

.markdown-preview h6 {
  font-size: 0.85em;
  font-weight: 700;
  margin-top: 24px;
  margin-bottom: 16px;
  line-height: 1.25;
  color: var(--text-secondary);
}

.markdown-preview p {
  margin-top: 0;
  margin-bottom: 16px;
}

.markdown-preview a {
  color: #0969da;
  text-decoration: none;
}

.markdown-preview a:hover {
  text-decoration: underline;
}

.markdown-preview strong {
  font-weight: 700;
}

.markdown-preview em {
  font-style: italic;
}

.markdown-preview del {
  text-decoration: line-through;
}

.markdown-preview mark {
  background-color: #fff3b0;
  color: inherit;
  border-radius: 3px;
  padding: 0.1em 0.2em;
}

.markdown-preview ul,
.markdown-preview ol {
  margin-top: 0;
  margin-bottom: 16px;
  padding-left: 2em;
}

.markdown-preview ul {
  list-style-type: disc;
}

.markdown-preview ol {
  list-style-type: decimal;
}

.markdown-preview li {
  margin-top: 0.25em;
}

.markdown-preview li > p {
  margin-bottom: 0.25em;
}

.markdown-preview input[type="checkbox"] {
  margin-right: 0.5em;
}

.markdown-preview blockquote {
  margin: 0 0 16px 0;
  padding: 0 1em;
  color: var(--text-secondary);
  border-left: 0.25em solid var(--border-primary);
}

.markdown-preview blockquote > :first-child {
  margin-top: 0;
}

.markdown-preview blockquote > :last-child {
  margin-bottom: 0;
}

.markdown-preview .inline-code {
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: 85%;
  background-color: rgba(175, 184, 193, 0.2);
  border-radius: 6px;
  font-family: 'Roboto Mono', monospace;
  color: #c7254e;
}

.markdown-preview pre {
  margin-top: 0;
  margin-bottom: 16px;
}

.markdown-preview table {
  border-spacing: 0;
  border-collapse: collapse;
  margin-top: 0;
  margin-bottom: 16px;
  width: 100%;
  overflow: auto;
}

.markdown-preview table th {
  font-weight: 700;
  padding: 6px 13px;
  border: 1px solid var(--border-primary);
  background-color: var(--bg-secondary);
}

.markdown-preview table td {
  padding: 6px 13px;
  border: 1px solid var(--border-primary);
}

.markdown-preview table tr {
  background-color: var(--bg-primary);
  border-top: 1px solid var(--border-primary);
}

.markdown-preview table tr:nth-child(2n) {
  background-color: var(--bg-secondary);
}

.markdown-preview hr {
  height: 0.25em;
  padding: 0;
  margin: 24px 0;
  background-color: var(--border-primary);
  border: 0;
}

.markdown-preview img {
  max-width: 100%;
  height: auto;
  margin: 16px 0;
  border-radius: 6px;
}

.markdown-preview > *:first-child {
  margin-top: 0 !important;
}

.markdown-preview > *:last-child {
  margin-bottom: 0 !important;
}

.markdown-preview .markdown-alert {
  border-radius: 6px;
}

.markdown-preview .markdown-alert > :first-child {
  margin-top: 0;
}

.markdown-preview .markdown-alert-title {
  font-weight: 600;
  margin-bottom: 4px;
}

.markdown-preview .markdown-alert-note {
  background-color: rgba(9, 105, 218, 0.1);
}

.markdown-preview .markdown-alert-tip {
  background-color: rgba(26, 127, 55, 0.1);
}

.markdown-preview .markdown-alert-important {
  background-color: rgba(130, 80, 223, 0.1);
}

.markdown-preview .markdown-alert-warning {
  background-color: rgba(154, 103, 0, 0.1);
}

.markdown-preview .markdown-alert-caution {
  background-color: rgba(207, 34, 46, 0.1);
}
`;

/** Light mode styles from frontend/components/Preview/prism-theme.css (lines 1-229 + diff section) */
export const PRISM_CSS = `
.markdown-preview .code-block {
  margin: 0 0 16px 0;
  padding: 16px;
  background-color: #f6f8fa;
  border-radius: 6px;
  overflow-x: auto;
  font-family: 'Roboto Mono', monospace;
  font-size: 14px;
  line-height: 1.5;
}

.markdown-preview .code-block code {
  background: transparent;
  padding: 0;
  margin: 0;
  font-size: inherit;
  color: #24292e;
  white-space: pre;
  word-break: normal;
  word-wrap: normal;
}

.markdown-preview .code-block .token {
  color: #24292e;
}

.markdown-preview .code-block .token.comment,
.markdown-preview .code-block .token.prolog,
.markdown-preview .code-block .token.doctype,
.markdown-preview .code-block .token.cdata {
  color: #6a737d;
  font-style: italic;
}

.markdown-preview .code-block .token.punctuation {
  color: #24292e;
}

.markdown-preview .code-block .token.string,
.markdown-preview .code-block .token.attr-value {
  color: #032f62;
}

.markdown-preview .code-block .token.keyword {
  color: #d73a49;
}

.markdown-preview .code-block .token.operator {
  color: #d73a49;
}

.markdown-preview .code-block .token.number,
.markdown-preview .code-block .token.boolean {
  color: #005cc5;
}

.markdown-preview .code-block .token.function {
  color: #6f42c1;
}

.markdown-preview .code-block .token.class-name,
.markdown-preview .code-block .token.builtin {
  color: #6f42c1;
}

.markdown-preview .code-block .token.property,
.markdown-preview .code-block .token.constant,
.markdown-preview .code-block .token.symbol {
  color: #005cc5;
}

.markdown-preview .code-block .token.tag {
  color: #22863a;
}

.markdown-preview .code-block .token.attr-name {
  color: #6f42c1;
}

.markdown-preview .code-block .token.selector {
  color: #6f42c1;
}

.markdown-preview .code-block .token.regex {
  color: #032f62;
}

.markdown-preview .code-block .token.important {
  color: #d73a49;
  font-weight: bold;
}

.markdown-preview .code-block .token.entity {
  color: #6f42c1;
}

.markdown-preview .code-block .token.url {
  color: #032f62;
}

.markdown-preview .code-block .token.inserted {
  color: #22863a;
  background-color: #f0fff4;
}

.markdown-preview .code-block .token.deleted {
  color: #b31d28;
  background-color: #ffeef0;
}

.markdown-preview .code-block .token.namespace {
  opacity: 0.7;
}

.markdown-preview .code-block .token.bold {
  font-weight: bold;
}

.markdown-preview .code-block .token.italic {
  font-style: italic;
}

.markdown-preview .code-block.language-javascript .token.template-string,
.markdown-preview .code-block.language-typescript .token.template-string {
  color: #032f62;
}

.markdown-preview .code-block.language-javascript .token.template-punctuation,
.markdown-preview .code-block.language-typescript .token.template-punctuation {
  color: #d73a49;
}

.markdown-preview .code-block.language-python .token.decorator {
  color: #6f42c1;
}

.markdown-preview .code-block.language-python .token.triple-quoted-string {
  color: #032f62;
}

.markdown-preview .code-block.language-json .token.property {
  color: #005cc5;
}

.markdown-preview .code-block.language-yaml .token.key {
  color: #22863a;
}

.markdown-preview .code-block.language-bash .token.function {
  color: #005cc5;
}

.markdown-preview .code-block.language-bash .token.variable {
  color: #e36209;
}

.markdown-preview .code-block.language-css .token.property {
  color: #005cc5;
}

.markdown-preview .code-block.language-css .token.unit {
  color: #e36209;
}

.markdown-preview .code-block.language-markup .token.tag .token.tag {
  color: #22863a;
}

.markdown-preview .code-block.language-markup .token.tag .token.attr-name {
  color: #6f42c1;
}

.markdown-preview .code-block.language-markup .token.tag .token.attr-value {
  color: #032f62;
}

.markdown-preview .code-block.language-sql .token.keyword {
  color: #d73a49;
}

.markdown-preview .code-block.language-go .token.builtin {
  color: #005cc5;
}

.markdown-preview .code-block.language-rust .token.macro {
  color: #6f42c1;
}

.markdown-preview .code-block.language-rust .token.lifetime {
  color: #e36209;
}

.markdown-preview .code-block.language-diff {
  padding: 0;
}

.markdown-preview .code-block.language-diff code {
  display: block;
  padding: 16px;
}

.markdown-preview .code-block.language-diff .token.deleted {
  display: block;
  background-color: #ffebe9;
  color: #b31d28;
  margin: 0 -16px;
  padding: 0 16px;
}

.markdown-preview .code-block.language-diff .token.inserted {
  display: block;
  background-color: #e6ffec;
  color: #22863a;
  margin: 0 -16px;
  padding: 0 16px;
}

.markdown-preview .code-block.language-diff .token.coord {
  display: block;
  background-color: #ddf4ff;
  color: #0550ae;
  margin: 0 -16px;
  padding: 0 16px;
}

.markdown-preview .code-block.language-diff .token.prefix {
  user-select: none;
  font-weight: bold;
}

.markdown-preview .code-block.language-diff .token.prefix.deleted {
  color: #b31d28;
  background: transparent;
  display: inline;
  margin: 0;
  padding: 0;
}

.markdown-preview .code-block.language-diff .token.prefix.inserted {
  color: #22863a;
  background: transparent;
  display: inline;
  margin: 0;
  padding: 0;
}
`;
