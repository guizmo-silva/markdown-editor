# TODO - Markdown Editor

## Em Andamento

- [ ] Exportação de arquivos

## Concluído

### Sessão Atual
- [x] **Modo escuro (Dark Mode)** - Implementação completa com:
  - ThemeProvider com toggle e persistência no localStorage
  - Variáveis CSS para light/dark mode em globals.css
  - Temas light/dark no CodeMirror com syntax highlighting específico
  - Estilos dark mode no preview (preview.css, prism-theme.css)
- [x] **Sistema de ícones por tema** - Hook `useThemedIcon` criado para carregar ícones baseado no tema atual
- [x] **Ícones organizados** - Estrutura `public/icons/light/` e `public/icons/dark/` com todos os ícones
- [x] **Componentes atualizados para ícones por tema**:
  - Toolbar (17 ícones de formatação)
  - LogoMenu (logo muda conforme tema)
  - AssetsSidebar (ícone hide sidebar)
  - EditorLayout (logo e sidebar na versão colapsada)
  - AssetSection (ícone de fold/expand)
  - FileBrowser (ícone de chevron nas pastas)
  - Tabs (ícones close e new tab)
- [x] **Traduções da InfoBar** - Corrigido "Line/Col/Characters" para usar i18n em todos os 5 idiomas
- [x] **Traduções da PreviewInfoBar** - Corrigido "Words/Characters" para usar i18n em todos os 5 idiomas
- [x] **Gutter de linhas otimizado** - Reduzido minWidth de 40px para 32px (3 dígitos), expande automaticamente se necessário

### Sessão Anterior
- [x] **GFM Alerts** - Suporte a alertas do GitHub ([!NOTE], [!TIP], [!IMPORTANT], [!WARNING], [!CAUTION]) com estilos coloridos

### Anteriores
- [x] **Syntax highlight na visão de código** - Implementado com cores adequadas para modo claro (markdown highlighting)
- [x] **Syntax highlight na visão de texto formatado** - Blocos de código com Prism.js e tema de bom contraste
- [x] **Cores corrigidas** - Texto da visão de código agora usa #666666 conforme DESIGN-SPECS
- [x] **Views redimensionáveis** - Barra divisória no modo split permite arrastar para redimensionar (20%-80%)
- [x] **Toolbar responsiva** - Ícones mantêm tamanho fixo e quebram linha quando não há espaço
- [x] **Spellcheck implementado** - Correção ortográfica com seleção de idioma na InfoBar
- [x] Adicionar menu de traduções no logo
- [x] Adicionar tooltips às ferramentas
- [x] Corrigir erros de tradução
- [x] Melhorar toolbar com UX aprimorada
- [x] Implementar sistema de abas
- [x] Adicionar funcionalidade de colapsar sidebar
- [x] Implementar navegação em árvore na sidebar
- [x] Adicionar toolbar de formatação markdown funcional

## Próximos Passos

- [ ] Testar syntax highlight com diferentes linguagens de código
- [ ] Sincronização de scroll entre visão de código e preview
- [ ] Salvar/carregar arquivos
- [ ] Implementar funcionalidade de exportação (PDF, HTML, etc.)
