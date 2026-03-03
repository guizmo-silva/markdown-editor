# Установка

## Требования

- [Docker](https://docs.docker.com/get-docker/) 20.10+
- [Docker Compose](https://docs.docker.com/compose/install/) 2.0+

## Быстрая установка

### 1. Загрузите файл конфигурации

Сохраните файл [`docker-compose.yml`](./docker-compose.yml) из этой папки в любую удобную директорию.

### 2. Настройте тома

Отредактируйте `docker-compose.yml` и укажите папки, к которым редактор будет иметь доступ. Видны только явно указанные папки — редактор **не имеет доступа** к остальной файловой системе сервера.

**Пример с одним рабочим пространством:**

```yaml
volumes:
  - /home/user/documents:/workspace
```

**Пример с несколькими томами:**

```yaml
environment:
  - EXTRA_VOLUMES=projects:/projects,notes:/notes
volumes:
  - /home/user/documents:/workspace
  - /home/user/projects:/projects
  - /home/user/notes:/notes
```

> Имена, заданные в `EXTRA_VOLUMES`, отображаются как корневые папки на боковой панели редактора.

### 3. Запустите контейнеры

```bash
docker compose up -d
```

### 4. Откройте редактор

Откройте браузер по адресу: <http://localhost:3010>

---

## Установка на ZimaOS

MKD совместим с ZimaOS. Используйте файл [`docker-compose.zimaos.yml`](./docker-compose.zimaos.yml) из этой папки — он уже настроен для стандартного пути данных ZimaOS (`/DATA/AppData/mkd/workspace`).

```bash
docker compose -f docker-compose.zimaos.yml up -d
```

---

## Переменные окружения

| Переменная | По умолчанию | Описание |
| --- | --- | --- |
| `PORT` | `3001` | Внутренний порт API |
| `PUID` | `1000` | UID пользователя для прав доступа к файлам |
| `PGID` | `1000` | GID группы для прав доступа к файлам |
| `WORKSPACE_ROOT` | `/workspace` | Внутренний путь основного тома |
| `EXTRA_VOLUMES` | — | Дополнительные тома: `имя:/путь,имя2:/путь2` |

---

## Порты

| Сервис | Внешний порт | Внутренний порт |
| --- | --- | --- |
| Frontend | 3010 | 3000 |
| Backend (API) | 3011 | 3001 |

Внешние порты можно изменить в `docker-compose.yml` по необходимости.

---

## Обновление

Для обновления до последней версии:

```bash
docker compose pull
docker compose up -d
```
