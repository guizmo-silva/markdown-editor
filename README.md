# Markdown Editor

Self-hosted markdown editor with advanced features for personal use.

## Features

- **Split Editor**: Side-by-side code and preview with real-time rendering
- **Tab System**: Multiple documents open simultaneously
- **Toolbar**: Quick formatting buttons for all markdown syntax
- **Assets Sidebar**: Track images, links, alerts, footnotes, and tables
- **File Browser**: Navigate and manage markdown files
- **Spellcheck**: Multi-language support (pt-BR, en-US, es-ES, fr-FR, de-DE)
- **i18n**: Interface available in 5 languages
- **Export**: MD and HTML export (PDF and DOCX in Phase 2)

## Tech Stack

### Frontend
- React with TypeScript
- Next.js 15
- Tailwind CSS
- react-i18next (internationalization)
- nspell (spellchecking)

### Backend
- Node.js with TypeScript
- Express
- REST API

### Deployment
- Docker & Docker Compose
- ZimaOS ready

## Quick Start

### Development Mode

#### Frontend
```bash
cd frontend
npm install  # May have issues on certain filesystems
npm run dev
```

#### Backend
```bash
cd backend
npm install  # May have issues on certain filesystems
npm run dev
```

### Production Mode (Docker)

1. Build and start containers:
```bash
docker-compose up -d
```

2. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

3. Configure workspace volumes in `docker-compose.yml`:
```yaml
volumes:
  - /your/documents/path:/workspace/docs
  - /your/projects/path:/workspace/projects
```

## Project Structure

```
markdown-editor/
├── frontend/                 # React/Next.js application
│   ├── app/                 # Next.js app directory
│   ├── components/          # React components
│   │   ├── Editor/
│   │   ├── Preview/
│   │   ├── Toolbar/
│   │   ├── Sidebar/
│   │   ├── Tabs/
│   │   └── FileBrowser/
│   ├── hooks/               # Custom React hooks
│   ├── utils/               # Utilities
│   ├── locales/             # Translation files
│   └── styles/              # CSS files
│
├── backend/                 # Node.js/Express API
│   └── src/
│       ├── routes/          # API routes
│       ├── controllers/     # Route controllers
│       ├── services/        # Business logic
│       ├── middleware/      # Express middleware
│       └── utils/           # Utilities
│
├── docker/                  # Docker configurations
│   ├── Dockerfile.frontend
│   └── Dockerfile.backend
│
├── dictionaries/            # Spellcheck dictionaries (TODO)
│
├── docker-compose.yml       # Container orchestration
├── .env.example            # Environment variables template
└── README.md               # This file
```

## Environment Variables

### Backend (.env)
```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
WORKSPACE_ROOT=/workspace
```

## Development Roadmap

### Phase 1 - MVP (Current)
- [x] Project setup
- [X] Basic split editor
- [X] Markdown rendering
- [X] File save/open
- [X] Basic toolbar
- [X] Tab system

### Phase 2 - Essential Features
- [X] Assets sidebar
- [X] File browser
- [X] MD & HTML export
- [X] i18n (pt-BR & en-US)

### Phase 3 - Polish
- [X] Full spellchecking
- [X] All 5 languages
- [X] Complete assets tracking
- [ ] PDF & DOCX export
- [ ] Performance optimizations

### Phase 4 - Desktop (Future)
- [ ] Electron/Tauri adaptation
- [ ] Windows/Linux packages


## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:
- Adding new translations
- Code style
- Pull request process

## License

Private project for personal use.

## Support

For issues and questions, check the project documentation in `/design` and `REQUISITOS.md`.
