![Image](https://raw.githubusercontent.com/guizmo-silva/markdown-editor/refs/heads/main/docs/logo/mkd-zimaos-icon.png)
# MKD — Selbst gehosteter Markdown-Editor

Selbst gehosteter Markdown-Editor für den persönlichen Gebrauch, der über Docker auf Heimservern, NAS-Geräten und Plattformen wie ZimaOS läuft.

---
![MKD - Selbst gehosteter Markdown-Editor](../../docs/screens/main_interface.png "Hauptbildschirm des Editors")

## Funktionen

- **Seitenleiste** mit Dokumentennavigator (Überschriften, Zitate, Links, Bilder, Tabellen, Hinweise und Fußnoten) sowie integriertem Datei-Explorer
- **Ansichtsmodi** — nur Code, nur Vorschau oder geteilte Ansicht nebeneinander
- **Import** von `.md`-, `.docx`-, `.zip`- (`.md` + Bilder) und `.txt`-Dateien
- **Export** als `.txt`, `.md`, `.pdf`, `.html`, `.docx` und `.zip` mit lokal verlinkten Bildern;
  - Um eine genaue Vorstellung davon zu bekommen, wie Elemente in Formaten wie `.docx` und `.pdf` gerendert werden, exportieren Sie die Datei `markdown-cheat-sheet.md` aus dem Standard-*Workspace*.
- **Automatisches Speichern**
- **Tabs** — mehrere Dokumente gleichzeitig bearbeiten
- **Oberfläche und Rechtschreibprüfung in mehreren Sprachen** — Portugiesisch, Englisch, Spanisch, Französisch, Deutsch, Russisch, Hindi und Vereinfachtes Chinesisch
- **Bildunterstützung** — Import externer oder verlinkter Bilder
- **Hell- und Dunkelmodus**
- **Interner Papierkorb**

### Unterstütztes Markdown

- GitHub Flavored Markdown (GFM): Tabellen, Aufgabenlisten, Durchgestrichen, Autolinks
- Hinweise (`[!NOTE]`, `[!WARNING]`, `[!TIP]`, etc.)
- Fußnoten
- Syntax-Highlighting in Codeblöcken
- Mathematische Formeln

---

## Installation

Die vollständige Anleitung finden Sie unter **[docs/install/SETUP.de-DE.md](../install/SETUP.de-DE.md)**.

### Schnellstart

1. Laden Sie die [`docker-compose.yml`](../install/docker-compose.yml) aus dem Ordner `docs/install/` herunter
1. Konfigurieren Sie die Volumes mit den Ordnern, auf die Sie zugreifen möchten
1. Starten Sie die Container:

```bash
docker compose up -d
```

1. Öffnen Sie <http://localhost:3010> im Browser

> Der Editor greift nur auf Ordner zu, die explizit in `docker-compose.yml` konfiguriert sind — kein beliebiger Zugriff auf das Dateisystem des Servers.

---

## Entwicklung

### Voraussetzungen

| Werkzeug | Mindestversion |
| --- | --- |
| Node.js | 20+ |
| npm | 10+ |
| Docker | 20.10+ (für Produktion) |

### Hauptabhängigkeiten

#### Frontend

- [Next.js 16](https://nextjs.org/) + React 19 + TypeScript
- [Tailwind CSS](https://tailwindcss.com/)
- [CodeMirror 6](https://codemirror.net/) — Editor-Kern
- [react-markdown](https://github.com/remarkjs/react-markdown) + remark/rehype-Plugins — Vorschau-Rendering
- [react-i18next](https://react.i18next.com/) — Internationalisierung
- [nspell](https://github.com/wooorm/nspell) — Rechtschreibprüfung mit Hunspell-Wörterbüchern

#### Backend

- [Express](https://expressjs.com/) + TypeScript
- [multer](https://github.com/expressjs/multer) — Bild-Upload
- [archiver](https://github.com/archiverjs/node-archiver) — ZIP-Export

### Lokal ausführen

**Backend:**

```bash
cd backend
npm install
npm run dev
```

**Frontend** (in einem anderen Terminal):

```bash
cd frontend
npm install
npm run dev
```

- Frontend: <http://localhost:3000>
- API: <http://localhost:3001>

### Projektstruktur

```text
markdown-editor/
├── frontend/
│   ├── app/                # Routen und Layout (Next.js App Router)
│   ├── components/         # React-Komponenten
│   │   ├── Editor/         # CodeMirror-Editor
│   │   ├── Preview/        # Vorschau-Rendering
│   │   ├── Toolbar/        # Symbolleiste
│   │   ├── Sidebar/        # Assets-Seitenleiste
│   │   ├── Tabs/           # Tab-System
│   │   └── FileBrowser/    # Datei-Browser
│   ├── hooks/
│   ├── locales/            # Übersetzungen (JSON pro Sprache)
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

##### Hat Ihnen dieses Programm geholfen? Dann spendieren Sie mir einen Kaffee! 😉

<a href='https://ko-fi.com/M4M41W6IPV' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi1.png?v=6' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>
