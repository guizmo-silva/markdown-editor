# 安装指南

## 前提条件

- [Docker](https://docs.docker.com/get-docker/) 20.10+
- [Docker Compose](https://docs.docker.com/compose/install/) 2.0+

## 快速安装

### 1. 下载配置文件

将本文件夹中的 [`docker-compose.yml`](./docker-compose.yml) 保存到您选择的目录中。

### 2. 配置挂载卷

编辑 `docker-compose.yml`，配置编辑器可以访问的文件夹。只有明确映射的文件夹才会在编辑器中可见 — 编辑器**无法访问**服务器文件系统的其他部分。

**单个工作区示例：**

```yaml
volumes:
  - /home/user/documents:/workspace
```

**多个挂载卷示例：**

```yaml
environment:
  - EXTRA_VOLUMES=projects:/projects,notes:/notes
volumes:
  - /home/user/documents:/workspace
  - /home/user/projects:/projects
  - /home/user/notes:/notes
```

> `EXTRA_VOLUMES` 中定义的名称将作为根文件夹显示在编辑器侧边栏中。

### 3. 启动容器

```bash
docker compose up -d
```

### 4. 打开编辑器

在浏览器中访问：<http://localhost:3010>

---

## ZimaOS 安装

MKD 兼容 ZimaOS。使用本文件夹中的 [`docker-compose.zimaos.yml`](./docker-compose.zimaos.yml) 文件，该文件已预配置 ZimaOS 默认数据路径（`/DATA/AppData/mkd/workspace`）。

```bash
docker compose -f docker-compose.zimaos.yml up -d
```

---

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `3001` | API 内部端口 |
| `PUID` | `1000` | 文件权限用户 UID |
| `PGID` | `1000` | 文件权限组 GID |
| `WORKSPACE_ROOT` | `/workspace` | 主挂载卷内部路径 |
| `EXTRA_VOLUMES` | — | 附加挂载卷：`名称:/路径,名称2:/路径2` |

---

## 端口

| 服务 | 外部端口 | 内部端口 |
| --- | --- | --- |
| Frontend | 3010 | 3000 |
| Backend (API) | 3011 | 3001 |

如有需要，可在 `docker-compose.yml` 中修改外部端口。

---

## 更新

更新到最新版本：

```bash
docker compose pull
docker compose up -d
```
