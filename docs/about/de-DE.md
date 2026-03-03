# MKD — Selbst gehosteter Markdown-Editor

Selbst gehosteter Markdown-Editor für den persönlichen Gebrauch, der über Docker auf Heimservern, NAS-Geräten und Plattformen wie ZimaOS läuft.

---

## Funktionen

- **Seitenleiste** mit Dokumentennavigator (Überschriften, Zitate, Links, Bilder, Tabellen, Hinweise und Fußnoten) sowie integriertem Datei-Explorer
- **Ansichtsmodi** — nur Code, nur Vorschau oder geteilte Ansicht nebeneinander
- **Import** von `.md`- und `.txt`-Dateien
- **Export** als `.txt`, `.md`, `.html` und ZIP mit lokal verlinkten Bildern; PDF für eine zukünftige Phase geplant
- **Automatisches Speichern**
- **Tabs** — mehrere Dokumente gleichzeitig bearbeiten
- **Oberfläche und Rechtschreibprüfung in mehreren Sprachen** — Portugiesisch, Englisch, Spanisch, Französisch, Deutsch, Russisch und Vereinfachtes Chinesisch
- **Bildunterstützung** — Import externer oder verlinkter Bilder
- **Hell- und Dunkelmodus**

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

- [Next.js 15](https://nextjs.org/) + React 19 + TypeScript
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

---

## Lizenz

[AGPL-3.0](../../LICENSE)
