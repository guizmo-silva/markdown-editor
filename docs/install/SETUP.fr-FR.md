# Installation

## Prérequis

- [Docker](https://docs.docker.com/get-docker/) 20.10+
- [Docker Compose](https://docs.docker.com/compose/install/) 2.0+

## Installation rapide

### 1. Téléchargez le fichier de configuration

Enregistrez le fichier [`docker-compose.yml`](./docker-compose.yml) de ce dossier dans un répertoire de votre choix.

### 2. Configurez les volumes

Modifiez le `docker-compose.yml` et configurez les dossiers auxquels l'éditeur aura accès. Seuls les dossiers explicitement mappés sont visibles dans l'éditeur — l'éditeur **n'a pas accès** au reste du système de fichiers du serveur.

**Exemple avec un seul workspace :**

```yaml
volumes:
  - /home/utilisateur/documents:/workspace
```

**Exemple avec plusieurs volumes :**

```yaml
environment:
  - EXTRA_VOLUMES=projets:/projets,notes:/notes
volumes:
  - /home/utilisateur/documents:/workspace
  - /home/utilisateur/projets:/projets
  - /home/utilisateur/notes:/notes
```

> Les noms définis dans `EXTRA_VOLUMES` sont ceux qui apparaissent comme dossiers racines dans la barre latérale de l'éditeur.

### 3. Démarrez les conteneurs

```bash
docker compose up -d
```

### 4. Ouvrez l'éditeur

Ouvrez votre navigateur à l'adresse : <http://localhost:3010>

---

## Installation sur ZimaOS

MKD est compatible avec ZimaOS. Utilisez le fichier [`docker-compose.zimaos.yml`](./docker-compose.zimaos.yml) de ce dossier, qui est préconfiguré avec le chemin de données par défaut de ZimaOS (`/DATA/AppData/mkd/workspace`).

```bash
docker compose -f docker-compose.zimaos.yml up -d
```

---

## Variables d'environnement

| Variable | Valeur par défaut | Description |
| --- | --- | --- |
| `PORT` | `3001` | Port interne de l'API |
| `PUID` | `1000` | UID utilisateur pour les permissions de fichiers |
| `PGID` | `1000` | GID du groupe pour les permissions de fichiers |
| `WORKSPACE_ROOT` | `/workspace` | Chemin interne du volume principal |
| `EXTRA_VOLUMES` | — | Volumes supplémentaires : `nom:/chemin,nom2:/chemin2` |

---

## Ports

| Service | Port externe | Port interne |
| --- | --- | --- |
| Frontend | 3010 | 3000 |
| Backend (API) | 3011 | 3001 |

Les ports externes peuvent être modifiés dans `docker-compose.yml` selon vos besoins.

---

## Mise à jour

Pour mettre à jour vers la dernière version :

```bash
docker compose pull
docker compose up -d
```
