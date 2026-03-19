# MKD — Editor de Markdown autoalojado

Editor de Markdown self-hosted pensado para uso personal, ejecutándose mediante Docker en servidores domésticos, NAS y plataformas como ZimaOS.

---

## Funcionalidades

- **Barra lateral** con navegador de elementos del documento (títulos, citas, enlaces, imágenes, tablas, alertas y notas al pie) y explorador de archivos integrado
- **Modos de visualización** — solo código, solo vista previa o vista dividida lado a lado
- **Importación** de archivos `.md` y `.txt`
- **Exportación** a `.txt`, `.md`, `.pdf`, `.html` y ZIP con imágenes enlazadas localmente
- **Guardado automático**
- **Pestañas** — edita múltiples documentos al mismo tiempo
- **Interfaz y corrección ortográfica en varios idiomas** — Portugués, Inglés, Español, Francés, Alemán, Ruso y Chino Simplificado
- **Soporte de imágenes** — importación de imágenes externas o enlazadas
- **Modos claro y oscuro**
- **Papelera interna**

### Markdown compatible

- GitHub Flavored Markdown (GFM): tablas, listas de tareas, tachado, autoenlaces
- Alertas (`[!NOTE]`, `[!WARNING]`, `[!TIP]`, etc.)
- Notas al pie
- Resaltado de sintaxis en bloques de código
- Fórmulas matemáticas

---

## Instalación

Consulta la guía completa en **[docs/install/SETUP.es-ES.md](../install/SETUP.es-ES.md)**.

### Inicio rápido

1. Descarga el [`docker-compose.yml`](../install/docker-compose.yml) de la carpeta `docs/install/`
1. Configura los volúmenes con las carpetas a las que deseas acceder
1. Inicia los contenedores:

```bash
docker compose up -d
```

1. Abre <http://localhost:3010> en tu navegador

> El editor solo accede a las carpetas explícitamente configuradas en `docker-compose.yml` — sin acceso arbitrario al sistema de archivos del servidor.

---

## Desarrollo

### Requisitos previos

| Herramienta | Versión mínima |
| --- | --- |
| Node.js | 20+ |
| npm | 10+ |
| Docker | 20.10+ (para producción) |

### Dependencias principales

#### Frontend

- [Next.js 15](https://nextjs.org/) + React 19 + TypeScript
- [Tailwind CSS](https://tailwindcss.com/)
- [CodeMirror 6](https://codemirror.net/) — núcleo del editor
- [react-markdown](https://github.com/remarkjs/react-markdown) + plugins remark/rehype — renderizado del preview
- [react-i18next](https://react.i18next.com/) — internacionalización
- [nspell](https://github.com/wooorm/nspell) — corrección ortográfica con diccionarios Hunspell

#### Backend

- [Express](https://expressjs.com/) + TypeScript
- [multer](https://github.com/expressjs/multer) — subida de imágenes
- [archiver](https://github.com/archiverjs/node-archiver) — exportación en ZIP

### Ejecución local

**Backend:**

```bash
cd backend
npm install
npm run dev
```

**Frontend** (en otra terminal):

```bash
cd frontend
npm install
npm run dev
```

- Frontend: <http://localhost:3000>
- API: <http://localhost:3001>

---

## Licencia

[AGPL-3.0](../../LICENSE)
