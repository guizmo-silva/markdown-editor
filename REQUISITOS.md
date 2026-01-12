# Requisitos do Projeto - Editor de Markdown

## Visão Geral

Editor de markdown self-hosted para uso pessoal, com interface moderna e funcionalidades avançadas de gerenciamento de assets. A primeira versão será hospedada em Docker no ZimaOS, com arquitetura preparada para futura adaptação para aplicativo desktop (Windows/Linux) usando Electron ou Tauri.

---

## Stack Tecnológica

### Frontend
- **React** com **TypeScript**
- **Next.js** (framework)
- Bibliotecas modernas para componentes e UI

### Backend
- **Node.js** com **TypeScript**
- **Express** ou framework similar
- API REST para comunicação com frontend

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

---

## Funcionalidades Principais

### 1. Editor Split (Código + Preview)

## Design
Especificações de design e mockups em: `/design`

**Comportamento:**
- Split 50/50 (ajustável pelo usuário futuramente)
- Preview atualiza em tempo real conforme digita
- Sincronização de scroll entre código e preview

---

### 2. Sistema de Abas Internas

**Comportamento:**
- Múltiplos documentos abertos simultaneamente
- Abas horizontais no topo (similar a navegadores)
- Cada aba mantém seu próprio estado (posição do cursor, scroll, etc)
- NÃO abre novas janelas/abas do navegador
- Botão "+" para abrir novo documento
- Botão "x" para fechar aba (com confirmação se houver alterações não salvas)

**Estado:**
- App pode abrir vazio (sem abas)
- Usuário escolhe quais arquivos abrir
- Persistência de abas NÃO é prioridade inicial

---

### 3. Barra de Ferramentas

**Localização:** Topo da interface, acima do editor split

**Botões de formatação:**
- Negrito (`**texto**`)
- Itálico (`*texto*`)
- Tachado (`~~texto~~`)
- Código inline (`` `código` ``)
- Título H1, H2, H3, H4, H5, H6
- Lista não-ordenada
- Lista ordenada
- Checkbox/Task list
- Citação (blockquote)
- Código em bloco (code block)
- Link
- Imagem
- Tabela
- Linha horizontal

**Funcionalidade:**
- Ao clicar, insere a sintaxe markdown correspondente
- Se houver texto selecionado, aplica a formatação no texto selecionado
- Atalhos de teclado (Ctrl+B para negrito, etc)

**Outros controles:**
- Botão de seleção de idioma (spell + interface)
- Botão "Exportar" (dropdown com opções)
- Botão "Salvar"
- Indicador de status (salvo/não salvo)

---

### 4. Barra Lateral de Assets

**Localização:** Lateral direita (ou esquerda, a definir no design)

**Design:** Similar à barra lateral do VS Code
- Retrátil (pode esconder/mostrar)
- Seções expansíveis/colapsáveis
- Ícones para cada tipo de asset

**Seções:**

#### 4.1. Imagens
- Lista todas as imagens referenciadas no documento atual
- Formato: `![alt text](url)`
- Mostra miniatura (thumbnail)
- Mostra alt text
- Ao clicar: navega até a linha do código onde está a imagem

#### 4.2. Links
- Lista todos os links no documento atual
- Formato: `[texto](url)`
- Mostra texto do link
- Mostra URL completa
- Ao clicar: navega até a linha do código onde está o link
- Ícone diferente para links externos vs âncoras internas

#### 4.3. Alerts (GitHub-style)
- Lista todos os alerts no documento
- Formatos suportados:
  - `[!NOTE]`
  - `[!TIP]`
  - `[!IMPORTANT]`
  - `[!WARNING]`
  - `[!CAUTION]`
- Mostra tipo do alert e primeira linha do conteúdo
- Ao clicar: navega até o alert no código

#### 4.4. Notas de Rodapé
- Lista todas as notas de rodapé
- Formato: `[^1]` e definição `[^1]: texto`
- Mostra referência e conteúdo
- Ao clicar: navega até a definição

#### 4.5. Tabelas
- Lista todas as tabelas no documento
- Mostra primeira linha (cabeçalho) como identificador
- Contador de linhas x colunas
- Ao clicar: navega até a tabela no código

**Comportamento geral:**
- Atualiza dinamicamente conforme o documento é editado
- Contador de cada tipo de asset no topo da seção
- Busca/filtro dentro da barra lateral (futuro)

---

### 5. Gerenciamento de Arquivos

**Sistema de arquivos:**
- Acesso ao filesystem do servidor via volumes Docker
- Usuário configura pastas raiz no `docker-compose.yml`
- Exemplo:
  ```yaml
  volumes:
    - /caminho/servidor/documentos:/workspace/docs
    - /caminho/servidor/projetos:/workspace/projetos
  ```

**Navegação:**
- File browser integrado na interface
- Lista arquivos `.md` das pastas configuradas
- Suporte a subpastas (navegação hierárquica)
- Operações básicas:
  - Abrir arquivo (adiciona nova aba)
  - Criar novo arquivo
  - Renomear arquivo
  - Deletar arquivo (com confirmação)
  - Criar pasta
  - Mover arquivo entre pastas

**Limitação inicial:**
- NÃO permite acesso arbitrário a qualquer pasta do servidor
- Apenas pastas configuradas explicitamente no docker-compose

---

### 6. Spellchecking

**Biblioteca:** nspell com dicionários Hunspell

**Comportamento:**
- Verifica ortografia em tempo real
- Palavras incorretas são sublinhadas (estilo personalizado, não o nativo do navegador)
- Ao clicar em palavra incorreta: popup com sugestões
- Opção "Adicionar ao dicionário pessoal"
- Dicionário pessoal salvo por usuário

**Idiomas:**
- Segue o idioma selecionado na interface
- Troca automática quando usuário muda idioma
- Dicionários incluídos:
  - Português (Brasil) - pt-BR
  - Inglês (EUA) - en-US
  - Espanhol - es-ES
  - Francês - fr-FR
  - Alemão - de-DE

**Controle:**
- Botão na toolbar para ativar/desativar
- Botão para forçar troca de idioma do spell (independente da interface)
- Status visível (ativo/inativo)

---

### 7. Internacionalização (i18n)

**Implementação:**
- react-i18next
- Arquivos JSON separados por idioma em `/locales`
- Detecção automática do idioma do navegador
- Seletor de idioma na interface

**Idiomas iniciais:**
1. 🇧🇷 Português (Brasil) - pt-BR
2. 🇺🇸 Inglês (EUA) - en-US
3. 🇪🇸 Espanhol - es-ES
4. 🇫🇷 Francês - fr-FR
5. 🇩🇪 Alemão - de-DE

**Estrutura dos arquivos de tradução:**
```json
{
  "buttons": {
    "save": "Salvar",
    "cancel": "Cancelar",
    "export": "Exportar"
  },
  "toolbar": {
    "bold": "Negrito",
    "italic": "Itálico"
  },
  "sidebar": {
    "images": "Imagens",
    "links": "Links"
  }
}
```

**Contribuições:**
- Estrutura preparada para aceitar Pull Requests com novas traduções
- Documentação clara de como adicionar novos idiomas
- Validação de completude das traduções (todos os idiomas têm as mesmas chaves)

---

### 8. Exportação de Documentos

**Prioridade Fase 1 (MVP):**
- ✅ Markdown (.md) - apenas salvar o arquivo original
- ✅ HTML (.html) - conversão direta markdown → HTML standalone

**Prioridade Fase 2:**
- ⏳ PDF (.pdf) - usando puppeteer ou pdfkit
- ⏳ Word (.docx) - usando biblioteca docx
- ⏳ LibreOffice (.odt) - usando odt-generator

**Comportamento:**
- Botão "Exportar" na toolbar com dropdown
- Usuário seleciona formato desejado
- Download automático do arquivo gerado
- Nome do arquivo: `[nome-do-documento].[extensão]`

**Qualidade da conversão:**
- Preservar formatação (negrito, itálico, títulos, listas)
- Preservar imagens (embed ou referência externa)
- Preservar tabelas
- Preservar links
- Adaptar alerts GitHub para formato visual equivalente
- Code blocks com syntax highlighting (quando possível)

---

## Requisitos Técnicos

### Performance
- Preview deve atualizar em < 100ms após digitação
- Suporte a documentos de até 10.000 linhas sem lag
- Assets sidebar deve carregar de forma lazy (não bloquear renderização)

### Compatibilidade
- Navegadores modernos (Chrome, Firefox, Safari, Edge - últimas 2 versões)
- Responsivo (desktop first, mas funcionando em tablets)

### Segurança
- Sanitização de HTML renderizado no preview (evitar XSS)
- Validação de caminhos de arquivo (evitar path traversal)
- Sem execução de código arbitrário

### Markdown
- Sintaxe GitHub Flavored Markdown (GFM)
- Suporte a:
  - Tables
  - Task lists
  - Strikethrough
  - Autolinks
  - Alerts (`[!NOTE]`, etc)
  - Footnotes
  - Syntax highlighting em code blocks

---

## Estrutura do Projeto

```
markdown-editor/
├── frontend/                 # Aplicação React
│   ├── src/
│   │   ├── components/       # Componentes React
│   │   │   ├── Editor/       # Editor de código
│   │   │   ├── Preview/      # Preview renderizado
│   │   │   ├── Toolbar/      # Barra de ferramentas
│   │   │   ├── Sidebar/      # Barra lateral de assets
│   │   │   ├── Tabs/         # Sistema de abas
│   │   │   └── FileBrowser/  # Navegador de arquivos
│   │   ├── hooks/            # React hooks customizados
│   │   ├── utils/            # Utilitários
│   │   ├── locales/          # Arquivos de tradução
│   │   │   ├── pt-BR.json
│   │   │   ├── en-US.json
│   │   │   ├── es-ES.json
│   │   │   ├── fr-FR.json
│   │   │   └── de-DE.json
│   │   └── styles/           # CSS/SCSS
│   ├── public/               # Assets estáticos
│   └── package.json
│
├── backend/                  # API Node.js
│   ├── src/
│   │   ├── routes/           # Rotas da API
│   │   ├── controllers/      # Lógica de negócio
│   │   ├── services/         # Serviços (filesystem, exportação)
│   │   ├── middleware/       # Middleware Express
│   │   └── utils/            # Utilitários
│   └── package.json
│
├── dictionaries/             # Dicionários do spellcheck
│   ├── pt-BR/
│   ├── en-US/
│   ├── es-ES/
│   ├── fr-FR/
│   └── de-DE/
│
├── docker/
│   ├── Dockerfile.frontend
│   ├── Dockerfile.backend
│   └── nginx.conf            # Se necessário proxy reverso
│
├── docker-compose.yml        # Orquestração dos containers
├── .env.example              # Variáveis de ambiente
├── README.md                 # Documentação do projeto
└── CONTRIBUTING.md           # Guia para contribuições

```

---

## Roadmap de Desenvolvimento

### Fase 1 - MVP Funcional
1. Setup do projeto (estrutura, Docker, dependências)
2. Editor básico split (código + preview)
3. Renderização markdown básica
4. Sistema de salvar/abrir arquivos
5. Toolbar com formatação básica
6. Sistema de abas internas

### Fase 2 - Features Essenciais
1. Barra lateral de assets (imagens, links)
2. File browser integrado
3. Exportação MD e HTML
4. i18n básico (PT-BR e EN-US)

### Fase 3 - Polish & Extras
1. Spellchecking completo
2. Todos os 5 idiomas
3. Assets completos (alerts, footnotes, tables)
4. Exportação PDF e DOCX
5. Otimizações de performance

### Fase 4 - Desktop (Futuro)
1. Adaptação para Electron ou Tauri
2. Empacotamento para Windows/Linux
3. Instaladores e distribuição

---

## Notas de Implementação

### Para o Claude Code:

**Estilo de código:**
- TypeScript strict mode
- ESLint + Prettier configurados
- Comentários em inglês no código
- Nomes de variáveis/funções em inglês
- Interface do usuário traduzida via i18n

**Princípios:**
- Componentes pequenos e reutilizáveis
- Separação clara de responsabilidades
- Testes unitários para lógica crítica (futuro)
- Performance first (lazy loading, memoization)

**Git:**
- Commits semânticos
- Branches para features
- Pull requests para revisão
