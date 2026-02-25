# Installation

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) 20.10+
- [Docker Compose](https://docs.docker.com/compose/install/) 2.0+

## Quick install

### 1. Download the configuration file

Save the [`docker-compose.yml`](./docker-compose.yml) file from this folder to a directory of your choice.

### 2. Configure the volumes

Edit `docker-compose.yml` and configure the folders the editor will have access to. Only explicitly mapped folders are visible inside the editor — the editor **has no access** to the rest of the server's file system.

**Single workspace example:**

```yaml
volumes:
  - /home/user/documents:/workspace
```

**Multiple volumes example:**

```yaml
environment:
  - EXTRA_VOLUMES=projects:/projects,notes:/notes
volumes:
  - /home/user/documents:/workspace
  - /home/user/projects:/projects
  - /home/user/notes:/notes
```

> The names defined in `EXTRA_VOLUMES` are the ones that appear as root folders in the editor's sidebar.

### 3. Start the containers

```bash
docker compose up -d
```

### 4. Open the editor

Open your browser at: <http://localhost:3010>

---

## ZimaOS installation

MKD is compatible with ZimaOS. Use the [`docker-compose.zimaos.yml`](./docker-compose.zimaos.yml) file from this folder, which comes pre-configured with the default ZimaOS data path (`/DATA/AppData/mkd/workspace`).

```bash
docker compose -f docker-compose.zimaos.yml up -d
```

---

## Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3001` | Internal API port |
| `PUID` | `1000` | User UID for file permissions |
| `PGID` | `1000` | Group GID for file permissions |
| `WORKSPACE_ROOT` | `/workspace` | Internal path of the main volume |
| `EXTRA_VOLUMES` | — | Additional volumes: `name:/path,name2:/path2` |

---

## Ports

| Service | External port | Internal port |
| --- | --- | --- |
| Frontend | 3010 | 3000 |
| Backend (API) | 3011 | 3001 |

External ports can be changed in `docker-compose.yml` as needed.

---

## Updating

To update to the latest version:

```bash
docker compose pull
docker compose up -d
```
