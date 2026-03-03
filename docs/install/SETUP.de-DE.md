# Installation

## Voraussetzungen

- [Docker](https://docs.docker.com/get-docker/) 20.10+
- [Docker Compose](https://docs.docker.com/compose/install/) 2.0+

## Schnellinstallation

### 1. Konfigurationsdatei herunterladen

Speichern Sie die Datei [`docker-compose.yml`](./docker-compose.yml) aus diesem Ordner in einem Verzeichnis Ihrer Wahl.

### 2. Volumes konfigurieren

Bearbeiten Sie `docker-compose.yml` und konfigurieren Sie die Ordner, auf die der Editor zugreifen soll. Nur explizit gemappte Ordner sind im Editor sichtbar — der Editor hat **keinen Zugriff** auf den Rest des Server-Dateisystems.

**Beispiel mit einem einzelnen Workspace:**

```yaml
volumes:
  - /home/benutzer/dokumente:/workspace
```

**Beispiel mit mehreren Volumes:**

```yaml
environment:
  - EXTRA_VOLUMES=projekte:/projekte,notizen:/notizen
volumes:
  - /home/benutzer/dokumente:/workspace
  - /home/benutzer/projekte:/projekte
  - /home/benutzer/notizen:/notizen
```

> Die in `EXTRA_VOLUMES` definierten Namen erscheinen als Stammordner in der Seitenleiste des Editors.

### 3. Container starten

```bash
docker compose up -d
```

### 4. Editor öffnen

Öffnen Sie Ihren Browser unter: <http://localhost:3010>

---

## Installation auf ZimaOS

MKD ist mit ZimaOS kompatibel. Verwenden Sie die Datei [`docker-compose.zimaos.yml`](./docker-compose.zimaos.yml) aus diesem Ordner, die bereits mit dem Standard-Datenpfad von ZimaOS (`/DATA/AppData/mkd/workspace`) vorkonfiguriert ist.

```bash
docker compose -f docker-compose.zimaos.yml up -d
```

---

## Umgebungsvariablen

| Variable | Standard | Beschreibung |
| --- | --- | --- |
| `PORT` | `3001` | Interner API-Port |
| `PUID` | `1000` | Benutzer-UID für Dateiberechtigungen |
| `PGID` | `1000` | Gruppen-GID für Dateiberechtigungen |
| `WORKSPACE_ROOT` | `/workspace` | Interner Pfad des Hauptvolumes |
| `EXTRA_VOLUMES` | — | Zusätzliche Volumes: `name:/pfad,name2:/pfad2` |

---

## Ports

| Dienst | Externer Port | Interner Port |
| --- | --- | --- |
| Frontend | 3010 | 3000 |
| Backend (API) | 3011 | 3001 |

Externe Ports können bei Bedarf in `docker-compose.yml` geändert werden.

---

## Aktualisierung

So aktualisieren Sie auf die neueste Version:

```bash
docker compose pull
docker compose up -d
```
