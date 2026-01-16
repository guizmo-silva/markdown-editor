# Especificações de Design

## Visão Geral
 Editor de textos markdownk, com abas para vários arquivos, barra lateral de fácil acesso a elementos do texto

## Arquivos
- `interface_completa - light mode.png` - Layout geral da aplicação
- `toolbar.png` - Detalhes da barra de ferramentas
- `sidebar.png` - Detalhes da barra lateral de assets
- `/icons` - Todos os ícones em SVG
- `/fonts` - Todos as fontes usadas
- `infobar.png` - Detalhes da infobar da parte de código
- `tabs.png` - Detalhes da barra de abas
- `Editor Hidden Bar - Light Mode.png` - Layout geral com a barra lateral escondida

## Paleta de Cores - Light Mode
- Background: #FFF
- Content & Icons: #000
- BG Icon & Tab: #E9E9E9
- Tab & Line Number: #999999
- Bttn TXT: #FFF
- Code fold icon & outlines: #CCCCCC
- Code TXT: #404040
- Formated txt view: #252525
- Code view BG: #D8D8D8
- SPlit view line: #999999


## Tipografia
- Font família: [Roboto Mono - Interface e código] [Roboto Flex - Visão do texto formatado]
- Tamanhos: 
  - Títulos Sidebar: 20px
    - Subtitulos sidebar: 12px
      - Elementos na sidebar: 11px
  - Código: 12px
  - Abas: 10px


## Componentes
### Toolbar
- Altura: 36px
- Background: #E9E9E9

#### ORDEM DA TOOLBAR:
- Bold
- Itálico
- Strike
- Títulos
- Quote
- Lista numerada
- Lista com bullets
- Código inline
- BLoco de código
- Link
- Imagem
- Tabela
- Linha
- Check box
- Sobrescrito
- Subescrito

### Codeview
- Background: #D8D8D8
- Texto: #666666
- Ícones Toolbar: #000
- Background linebar: #E9E9E9
- Texto linebar: 999999


### Sidebar
- Largura: 230px padrão (pode ser redimensionada)

### Tab bar
- Altura das abas: 30px
- Corner radius: 15 (superior esquerdo e superior direito)
- Cor: BG Icon & Tab
- Fonte: Roboto Mono - Medium - Tamanho 10
  - Cor: Tab & Line number
- Ícone de fechar: 5px x 6px
- Ícone nova aba: 14px x 14px

## Figma
- 🔗 Projeto: https://www.figma.com/design/8ZXI7ppvGwt9p1z9uUpxkR/Editor-Markdown?node-id=1-7961&t=64bqSTgMb8B2QATL-1
- 🔗 Protótipo: https://www.figma.com/proto/8ZXI7ppvGwt9p1z9uUpxkR/Editor-Markdown?node-id=1-7961&t=64bqSTgMb8B2QATL-1
