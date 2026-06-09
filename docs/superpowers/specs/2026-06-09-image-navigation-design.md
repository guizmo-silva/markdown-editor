# Image Navigation — Scroll Editor to Image Reference

**Date:** 2026-06-09  
**Status:** Approved

## Overview

When the user clicks on a local image in the file browser, the editor scrolls to the first occurrence of that image's markdown reference. Subsequent clicks on the same image cycle through all occurrences in order. Clicking a different image resets the cycle.

## Behaviour

- **First click on image X:** find all occurrences of `![...](X)` in the active document; scroll to index 0 and flash the line.
- **Subsequent clicks on image X:** advance index (`index = (index + 1) % total`); scroll and flash.
- **Click on a different image Y:** reset index to 0; scroll to first occurrence of `![...](Y)`.
- **No occurrences found:** show toast `t('errors.imageNotReferenced', 'Imagem não referenciada no documento')`, add key to all locale files.
- **Tab switch:** reset cycle state (`imageNavRef.current = null`).
- **Scroll method:** uses existing `editorRef.current.scrollToOffset(charOffset)`, which already handles virtual viewport positioning and line flash animation.

## Search Algorithm

```
regex = new RegExp('!\\[[^\\]]*\\]\\(' + escapeRegex(imageName) + '\\)', 'g')
offsets = all match.index values in current markdown
```

`escapeRegex` escapes special regex characters in the filename. Only the exact filename is matched — no path prefix handling needed, since the codebase inserts images as `![alt](filename.ext)` without path prefixes.

## State

A single ref in `EditorLayout`:

```ts
const imageNavRef = useRef<{ name: string; index: number } | null>(null);
```

- Lives in `EditorLayout` alongside `markdown`, `editorRef`, and tab state.
- Reset to `null` in the existing `useEffect([activeTabId])` that already resets preview scroll.

## Data Flow

```
FileBrowser
  ↓ onImageSelect(imageName: string)   [new prop]
AssetsSidebar
  ↓ onImageSelect(imageName: string)   [new prop, forwarded via stableCallback ref]
EditorLayout.handleImageSelect(imageName)
  → searches markdown with regex
  → updates imageNavRef
  → calls editorRef.current.scrollToOffset(offset)
  OR showError(t('errors.imageNotReferenced'))
```

## Components Changed

| File | Change |
|---|---|
| `FileBrowser/FileBrowser.tsx` | Add `onImageSelect?: (name: string) => void` prop; call it in `handleClick` for `type === 'image'` |
| `Sidebar/AssetsSidebar.tsx` | Add `onImageSelect?: (name: string) => void` prop; create stable wrapper ref; pass to `FileBrowser` |
| `EditorLayout.tsx` | Add `imageNavRef`; add `handleImageSelect` callback; reset ref on tab change; add `imageNotReferenced` error key to all 8 locale files; pass callback to `AssetsSidebar` |

## Error Handling

- Image name contains regex special chars (e.g. `photo (1).jpg`): filename is escaped before use in regex.
- `editorRef.current` is null (editor not mounted): guard with early return.
- Active document has no content: offsets array is empty → toast shown.

## Out of Scope

- Navigating to images referenced with a path prefix (`./foto.jpg`, `../foto.jpg`).
- Selecting or highlighting the image syntax in the editor.
- Navigation when in preview-only mode (editor not visible).
