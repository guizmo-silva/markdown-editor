# Instalação

## Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) 20.10+
- [Docker Compose](https://docs.docker.com/compose/install/) 2.0+

## Instalação rápida

### 1. Baixe o arquivo de configuração

Salve o arquivo [`docker-compose.yml`](./docker-compose.yml) desta pasta em um diretório de sua escolha.

### 2. Configure os volumes

Edite o `docker-compose.yml` e configure as pastas que o editor terá acesso. Apenas as pastas explicitamente mapeadas ficam visíveis dentro do editor — o editor **não tem acesso** ao restante do sistema de arquivos.

**Exemplo com um único workspace:**

```yaml
volumes:
  - /home/usuario/documentos:/workspace
```

**Exemplo com múltiplos volumes:**

```yaml
environment:
  - EXTRA_VOLUMES=projetos:/projetos,notas:/notas
volumes:
  - /home/usuario/documentos:/workspace
  - /home/usuario/projetos:/projetos
  - /home/usuario/notas:/notas
```

> Os nomes definidos em `EXTRA_VOLUMES` são os que aparecem como pastas raiz na barra lateral do editor.

### 3. Suba os containers

```bash
docker compose up -d
```

### 4. Acesse o editor

Abra o navegador em: <http://localhost:3010>

---

## Portas

| Serviço | Porta externa | Porta interna |
| --- | --- | --- |
| Frontend | 3010 | 3000 |
| Backend (API) | 3011 | 3001 |

As portas externas podem ser alteradas no `docker-compose.yml` conforme necessário.

---

## Atualização

Para atualizar para a versão mais recente:

```bash
docker compose pull
docker compose up -d
```

---

## Instalação no ZimaOS

O MKD possui um compose específico para instalação no ZimaOS.

Use o arquivo [`docker-compose.zimaos.yml`](./docker-compose.zimaos.yml) desta pasta, que já vem pré-configurado com o caminho padrão (`/DATA/AppData/mkd/workspace`).

```bash
docker compose -f docker-compose.zimaos.yml up -d
```

### Adicionando novos volumes no ZimaOS

Para adicionar um novo volume (seja no disco local ou outro disco mapeado) vá em "Volumes" e na seção "ZimaOS" procure ou escreva o caminho da pasta desejada. Na seção "MKD" dê um apelido para esse volume, sempre começanco com a barra `/`

---

## Variáveis de ambiente

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `PORT` | `3001` | Porta interna da API |
| `PUID` | `1000` | UID do usuário para permissões de arquivo |
| `PGID` | `1000` | GID do grupo para permissões de arquivo |
| `WORKSPACE_ROOT` | `/workspace` | Caminho interno do volume principal |
| `EXTRA_VOLUMES` | — | Volumes adicionais: `nome_personalizado:/apelido_caminho (como escrito na seção "MKD")`,`nome2:/apelido_caminho2` |