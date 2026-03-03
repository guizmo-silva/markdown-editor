# Instalación

## Requisitos previos

- [Docker](https://docs.docker.com/get-docker/) 20.10+
- [Docker Compose](https://docs.docker.com/compose/install/) 2.0+

## Instalación rápida

### 1. Descarga el archivo de configuración

Guarda el archivo [`docker-compose.yml`](./docker-compose.yml) de esta carpeta en un directorio de tu elección.

### 2. Configura los volúmenes

Edita el `docker-compose.yml` y configura las carpetas a las que tendrá acceso el editor. Solo las carpetas explícitamente mapeadas son visibles dentro del editor — el editor **no tiene acceso** al resto del sistema de archivos del servidor.

**Ejemplo con un único workspace:**

```yaml
volumes:
  - /home/usuario/documentos:/workspace
```

**Ejemplo con múltiples volúmenes:**

```yaml
environment:
  - EXTRA_VOLUMES=proyectos:/proyectos,notas:/notas
volumes:
  - /home/usuario/documentos:/workspace
  - /home/usuario/proyectos:/proyectos
  - /home/usuario/notas:/notas
```

> Los nombres definidos en `EXTRA_VOLUMES` son los que aparecen como carpetas raíz en la barra lateral del editor.

### 3. Inicia los contenedores

```bash
docker compose up -d
```

### 4. Abre el editor

Abre tu navegador en: <http://localhost:3010>

---

## Instalación en ZimaOS

MKD es compatible con ZimaOS. Usa el archivo [`docker-compose.zimaos.yml`](./docker-compose.zimaos.yml) de esta carpeta, que viene preconfigurado con la ruta de datos predeterminada de ZimaOS (`/DATA/AppData/mkd/workspace`).

```bash
docker compose -f docker-compose.zimaos.yml up -d
```

---

## Variables de entorno

| Variable | Valor predeterminado | Descripción |
| --- | --- | --- |
| `PORT` | `3001` | Puerto interno de la API |
| `PUID` | `1000` | UID del usuario para permisos de archivo |
| `PGID` | `1000` | GID del grupo para permisos de archivo |
| `WORKSPACE_ROOT` | `/workspace` | Ruta interna del volumen principal |
| `EXTRA_VOLUMES` | — | Volúmenes adicionales: `nombre:/ruta,nombre2:/ruta2` |

---

## Puertos

| Servicio | Puerto externo | Puerto interno |
| --- | --- | --- |
| Frontend | 3010 | 3000 |
| Backend (API) | 3011 | 3001 |

Los puertos externos pueden modificarse en `docker-compose.yml` según sea necesario.

---

## Actualización

Para actualizar a la versión más reciente:

```bash
docker compose pull
docker compose up -d
```
