![Image](https://raw.githubusercontent.com/guizmo-silva/markdown-editor/refs/heads/main/docs/logo/mkd-zimaos-icon.png)
# MKD — Self-hosted Markdown Editor

Self-hosted Markdown editor designed for personal use, running via Docker on home servers, NAS devices, and platforms like ZimaOS.

---

## Features

- **Sidebar** with document element navigator (headings, quotes, links, images, tables, alerts, and footnotes) and integrated file explorer
- **View modes** — code only, preview only, or side-by-side split view
- **Import** `.md`, `.docx`, `.zip` (.md + images) and `.txt` files
- **Export** to `.txt`, `.md`, `.pdf`, `.html` and `.zip` with locally linked images
- **Auto-save**
- **Tabs** — edit multiple documents at the same time
- **Interface and spellcheck in multiple languages** — Portuguese, English, Spanish, French, German, Russian, and Simplified Chinese
- **Image support** — import external or linked images
- **Light and dark modes**
- **Internal trash**

### Supported Markdown

- GitHub Flavored Markdown (GFM): tables, task lists, strikethrough, autolinks
- Alerts (`[!NOTE]`, `[!WARNING]`, `[!TIP]`, etc.)
- Footnotes
- Syntax highlighting in code blocks
- Math formulas

---

## Installation

See the full guide at **[docs/install/SETUP.en-US.md](../install/SETUP.en-US.md)**.

### Quick start

1. Download the [`docker-compose.yml`](../install/docker-compose.yml) from the `docs/install/` folder
1. Configure the volumes with the folders you want to access
1. Start the containers:

```bash
docker compose up -d
```

1. Open <http://localhost:3010> in your browser

> The editor only accesses folders explicitly configured in `docker-compose.yml` — no arbitrary access to the server's file system.

---

## Development

### Prerequisites

| Tool | Minimum version |
| --- | --- |
| Node.js | 20+ |
| npm | 10+ |
| Docker | 20.10+ (for production) |

### Main dependencies

#### Frontend

- [Next.js 15](https://nextjs.org/) + React 19 + TypeScript
- [Tailwind CSS](https://tailwindcss.com/)
- [CodeMirror 6](https://codemirror.net/) — editor core
- [react-markdown](https://github.com/remarkjs/react-markdown) + remark/rehype plugins — preview rendering
- [react-i18next](https://react.i18next.com/) — internationalization
- [nspell](https://github.com/wooorm/nspell) — spellchecking with Hunspell dictionaries

#### Backend

- [Express](https://expressjs.com/) + TypeScript
- [multer](https://github.com/expressjs/multer) — image upload
- [archiver](https://github.com/archiverjs/node-archiver) — ZIP export

### Running locally

**Backend:**

```bash
cd backend
npm install
npm run dev
```

**Frontend** (in another terminal):

```bash
cd frontend
npm install
npm run dev
```

- Frontend: <http://localhost:3000>
- API: <http://localhost:3001>

### Project structure

```text
markdown-editor/
├── frontend/
│   ├── app/                # Routes and layout (Next.js App Router)
│   ├── components/         # React components
│   │   ├── Editor/         # CodeMirror editor
│   │   ├── Preview/        # Markdown rendering
│   │   ├── Toolbar/        # Toolbar
│   │   ├── Sidebar/        # Assets sidebar
│   │   ├── Tabs/           # Tab system
│   │   └── FileBrowser/    # File browser
│   ├── hooks/
│   ├── locales/            # Translations (JSON per language)
│   └── utils/
│
├── backend/
│   └── src/
│       ├── routes/
│       ├── controllers/
│       ├── services/
│       ├── middleware/
│       └── utils/
│
└── docker/
    ├── Dockerfile.frontend
    └── Dockerfile.backend
```

---

##### Did this program help you? Then buy me a coffee 😉

<a href='https://ko-fi.com/M4M41W6IPV' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi1.png?v=6' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>
