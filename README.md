![Imagem](https://raw.githubusercontent.com/guizmo-silva/markdown-editor/refs/heads/main/docs/logo/mkd-zimaos-icon.png)
# MKD — Editor de Markdown auto-hospedado

[English](docs/about/en-US.md) · [Español](docs/about/es-ES.md) · [Français](docs/about/fr-FR.md) · [Deutsch](docs/about/de-DE.md) · [Русский](docs/about/ru-RU.md) · [हिन्दी](docs/about/hi-IN.md) · [中文](docs/about/zh-CN.md)

Editor de Markdown self-hosted pensado para uso pessoal, rodando via Docker em servidores domésticos, NAS e plataformas como ZimaOS.

---
![MKD - Editor de markdown auto-hospedado](/docs/screens/main_interface.png "Tela principal do editor")


## Funcionalidades

- **Barra lateral** com navegador de elementos do documento (títulos, citações, links, imagens, tabelas, alertas e notas de rodapé) e explorador de arquivos integrado
- **Modos de visualização** — apenas código, apenas preview ou tela dividida lado a lado
- **Importação** de arquivos `.md`, `.docx`, `.zip` (`.md` + imagens) e `.txt`
- **Exportação** em `.txt`, `.md`, `.pdf` `.html`, `.docx` e `.zip` com imagens linkadas localmente;
  - Para ter uma noção precisa de como os elementos são renderizados em formatos como `.docx` e `.pdf`, exporte o arquivo `markdown-cheat-sheet.md` que vem no *workspace* padrão.
- **Salvamento automático**
- **Abas** — edite múltiplos documentos ao mesmo tempo
- **Interface e correção ortográfica em vários idiomas** — Português, Inglês, Espanhol, Francês, Alemão, Russo, Hindi e Chinês Simplificado
- **Suporte a imagens** — importação de imagem externa ou linkada
- **Modos claro e escuro**
- **Lixeira interna**

### Markdown suportado

- GitHub Flavored Markdown (GFM): tabelas, task lists, strikethrough, autolinks
- Alertas (`[!NOTE]`, `[!WARNING]`, `[!TIP]`, etc.)
- Notas de rodapé
- Syntax highlighting em blocos de código
- Fórmulas matemáticas

---

## Instalação

**[Consulte o guia completo em aqui](docs/install/SETUP.md)**.

### Resumo rápido

1. Baixe o [`docker-compose.yml`](docs/install/docker-compose.yml) da pasta `docs/install/`
1. Configure os volumes com as pastas que deseja acessar
1. Suba os containers:

```bash
docker compose up -d
```

1. Acesse em <http://localhost:3010>

> O editor só acessa as pastas explicitamente configuradas no `docker-compose.yml`

---

## Desenvolvimento

### Pré-requisitos

| Ferramenta | Versão mínima |
| --- | --- |
| Node.js | 20+ |
| npm | 10+ |
| Docker | 20.10+ (para produção) |

### Dependências principais

#### Frontend

- [Next.js 16](https://nextjs.org/) + React 19 + TypeScript
- [Tailwind CSS](https://tailwindcss.com/)
- [CodeMirror 6](https://codemirror.net/) — núcleo do editor
- [react-markdown](https://github.com/remarkjs/react-markdown) + plugins remark/rehype — renderização do preview
- [react-i18next](https://react.i18next.com/) — internacionalização
- [nspell](https://github.com/wooorm/nspell) — correção ortográfica com dicionários Hunspell

#### Backend

- [Express](https://expressjs.com/) + TypeScript
- [multer](https://github.com/expressjs/multer) — upload de imagens
- [archiver](https://github.com/archiverjs/node-archiver) — exportação em ZIP

### Rodando localmente

**Backend:**

```bash
cd backend
npm install
npm run dev
```

**Frontend** (em outro terminal):

```bash
cd frontend
npm install
npm run dev
```

- Frontend: <http://localhost:3000>
- API: <http://localhost:3001>

### Estrutura do projeto

```text
markdown-editor/
├── frontend/
│   ├── app/                # Rotas e layout (Next.js App Router)
│   ├── components/         # Componentes React
│   │   ├── Editor/         # Editor CodeMirror
│   │   ├── Preview/        # Renderização Markdown
│   │   ├── Toolbar/        # Barra de ferramentas
│   │   ├── Sidebar/        # Barra lateral de assets
│   │   ├── Tabs/           # Sistema de abas
│   │   └── FileBrowser/    # Navegador de arquivos
│   ├── hooks/
│   ├── locales/            # Traduções (JSON por idioma)
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

##### Esse programa foi útil para você? Então me pague um café 😉

<a href='https://ko-fi.com/M4M41W6IPV' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi1.png?v=6' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>