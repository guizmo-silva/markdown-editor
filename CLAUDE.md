## Visão Geral

Editor de markdown self-hosted. Primeiro será feita uma versão em docker com futura adaptação para aplicativo desktop (Windows/Linux) usando Electron ou Tauri.

## Instruções básicas
Não é necessário rodar o projeto com `npm run dev`.

---

## Stack Tecnológica

### Frontend
- **React** com **TypeScript**
- **Next.js** (framework)
- **Tailwind CSS** (estilização)

### Backend
- **Node.js** com **TypeScript**
- **Express** (API REST para comunicação com frontend)

### Containerização
- **Docker** com **docker-compose**
- Acesso ao filesystem do servidor via volumes

### Internacionalização
- **react-i18next** para suporte multi-idioma
- Arquivos de tradução separados em `/locales`

### Spellchecking
- **nspell** com dicionários Hunspell
- Suporte a múltiplos idiomas
- Sugestões de correção

## Design
Especificações de design e mockups em: `/design`


## Funcionalidades Principais

- Editor Split (Código + Preview)
- Sistema de Abas Internas para cada arquivo
- Barra lateral com "navegador" de elementos em markdown


### Barra Lateral de Assets

**Design:** Similar à barra lateral do VS Code
- Retrátil (pode esconder/mostrar)
- Seções expansíveis/colapsáveis
- Ícones para cada tipo de asset

### Gerenciamento de Arquivos

**Sistema de arquivos:**
- Acesso ao filesystem do servidor via volumes Docker
- Usuário configura pastas raiz no `docker-compose.yml`
- Exemplo:
  ```yaml
  volumes:
    - /caminho/servidor/documentos:/workspace/docs
    - /caminho/servidor/projetos:/workspace/projetos
  ```

**Limitação inicial:**
- NÃO permite acesso arbitrário a qualquer pasta do servidor
- Apenas pastas configuradas explicitamente no docker-compose

## Spellchecking

**Biblioteca:** nspell com dicionários Hunspell


## Internacionalização (i18n)

**Implementação:**
- react-i18next
- Arquivos JSON separados por idioma em `/locales`
- Detecção automática do idioma do navegador
- Seletor de idioma na interface

## Exportação de Documentos

**Prioridade Fase 1 (MVP):**
- ✅ Markdown (.md) - apenas salvar o arquivo original
- ✅ HTML (.html) - conversão direta markdown → HTML standalone

**Prioridade Fase 2:**
- ⏳ PDF (.pdf) - usando puppeteer ou pdfkit
- ⏳ Word (.docx) - usando biblioteca docx
- ⏳ LibreOffice (.odt) - usando odt-generator


## Markdown
- Sintaxe GitHub Flavored Markdown (GFM)
- Suporte a:
  - Tables
  - Task lists
  - Strikethrough
  - Autolinks
  - Alerts (`[!NOTE]`, etc)
  - Footnotes
  - Syntax highlighting em code blocks
  - Formulas