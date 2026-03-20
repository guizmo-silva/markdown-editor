![Image](https://raw.githubusercontent.com/guizmo-silva/markdown-editor/refs/heads/main/docs/logo/mkd-zimaos-icon.png)
# MKD — Самостоятельно размещаемый Markdown-редактор

Markdown-редактор с самостоятельным размещением, разработанный для личного использования. Работает через Docker на домашних серверах, NAS-устройствах и платформах, таких как ZimaOS.

---

## Возможности

- **Боковая панель** с навигатором элементов документа (заголовки, цитаты, ссылки, изображения, таблицы, уведомления и сноски) и встроенным файловым менеджером
- **Режимы просмотра** — только код, только предварительный просмотр или разделённый экран
- **Импорт** файлов `.md`, `.docx`, `.zip` (.md + изображения) и `.txt`
- **Экспорт** в форматы `.txt`, `.md`, `.pdf`, `.html` и `.zip` с локально связанными изображениями
- **Автосохранение**
- **Вкладки** — редактирование нескольких документов одновременно
- **Интерфейс и проверка орфографии на нескольких языках** — Португальский, Английский, Испанский, Французский, Немецкий, Русский и Упрощённый Китайский
- **Поддержка изображений** — импорт внешних или связанных изображений
- **Светлая и тёмная темы**
- **Внутренняя корзина**

### Поддерживаемый Markdown

- GitHub Flavored Markdown (GFM): таблицы, списки задач, зачёркивание, автоссылки
- Уведомления (`[!NOTE]`, `[!WARNING]`, `[!TIP]` и др.)
- Сноски
- Подсветка синтаксиса в блоках кода
- Математические формулы

---

## Установка

Полное руководство находится в **[docs/install/SETUP.ru-RU.md](../install/SETUP.ru-RU.md)**.

### Быстрый старт

1. Загрузите [`docker-compose.yml`](../install/docker-compose.yml) из папки `docs/install/`
1. Настройте тома с папками, к которым нужен доступ
1. Запустите контейнеры:

```bash
docker compose up -d
```

1. Откройте <http://localhost:3010> в браузере

> Редактор имеет доступ только к папкам, явно указанным в `docker-compose.yml` — произвольный доступ к файловой системе сервера исключён.

---

## Разработка

### Требования

| Инструмент | Минимальная версия |
| --- | --- |
| Node.js | 20+ |
| npm | 10+ |
| Docker | 20.10+ (для продакшена) |

### Основные зависимости

#### Frontend

- [Next.js 15](https://nextjs.org/) + React 19 + TypeScript
- [Tailwind CSS](https://tailwindcss.com/)
- [CodeMirror 6](https://codemirror.net/) — ядро редактора
- [react-markdown](https://github.com/remarkjs/react-markdown) + плагины remark/rehype — рендеринг предпросмотра
- [react-i18next](https://react.i18next.com/) — интернационализация
- [nspell](https://github.com/wooorm/nspell) — проверка орфографии со словарями Hunspell

#### Backend

- [Express](https://expressjs.com/) + TypeScript
- [multer](https://github.com/expressjs/multer) — загрузка изображений
- [archiver](https://github.com/archiverjs/node-archiver) — экспорт в ZIP

### Локальный запуск

**Backend:**

```bash
cd backend
npm install
npm run dev
```

**Frontend** (в другом терминале):

```bash
cd frontend
npm install
npm run dev
```

- Frontend: <http://localhost:3000>
- API: <http://localhost:3001>

### Структура проекта

```text
markdown-editor/
├── frontend/
│   ├── app/                # Маршруты и макет (Next.js App Router)
│   ├── components/         # React-компоненты
│   │   ├── Editor/         # Редактор CodeMirror
│   │   ├── Preview/        # Рендеринг предпросмотра
│   │   ├── Toolbar/        # Панель инструментов
│   │   ├── Sidebar/        # Боковая панель ресурсов
│   │   ├── Tabs/           # Система вкладок
│   │   └── FileBrowser/    # Файловый менеджер
│   ├── hooks/
│   ├── locales/            # Переводы (JSON по языкам)
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

##### Эта программа оказалась полезной? Угостите меня кофе! 😉

<a href='https://ko-fi.com/M4M41W6IPV' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi1.png?v=6' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>
