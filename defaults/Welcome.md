# MKD — Cheat-sheet 

## Formatação de texto

O editor suporta **negrito,** *itálico*, ***negrito e itálico***, ~~texto tachado~~ e `código inline`.

Você pode escrever H~2~O com subscrito, 2^10^ com sobrescrito e ==destacar palavras== importantes.

---

## Cabeçalhos

# O editor abre direto no navegador
## Sem instalação, sem configuração
### Basta subir o container Docker
#### E apontar para suas pastas
##### A interface fica disponível na porta 3010
###### Funciona em qualquer dispositivo na rede local

---

## Listas

### Funcionalidades disponíveis

- Editor dividido com preview em tempo real
- Barra lateral com navegação por elementos do documento
  - Títulos, links, imagens, tabelas
  - Alertas e notas de rodapé
- Correção ortográfica em múltiplos idiomas
  - Português, Inglês, Espanhol, Francês
  - Alemão, Russo e Chinês Simplificado

### Como subir o editor

1. Baixe o `docker-compose.yml` da pasta `docs/install/`
2. Configure os volumes com suas pastas locais
3. Execute `docker compose up -d`
4. Acesse `http://localhost:3010`

### Status do projeto

- [x] Editor dividido com scroll sincronizado
- [x] Salvamento automático
- [x] Suporte a imagens com drag-and-drop
- [x] Exportação para HTML e ZIP
- [x] Exportação para PDF
- [x] Exportação para DOCX


---

## Citações

> O editor não tem acesso arbitrário ao sistema de arquivos do servidor.
> Apenas as pastas explicitamente configuradas no `docker-compose.yml` ficam visíveis.

> Cada volume mapeado aparece como uma pasta raiz na barra lateral.
>
> > Você pode mapear quantos volumes quiser usando a variável `EXTRA_VOLUMES`.

---

## Alertas

> [!NOTE]
> Novos documentos são nomeados automaticamente com base no primeiro título digitado.

> [!TIP]
> Use a barra lateral para navegar rapidamente entre os títulos do documento atual.

> [!IMPORTANT]
> O auto-rename acontece apenas uma vez — ao nomear o arquivo pela primeira vez.

> [!WARNING]
> Fechar uma aba com alterações não salvas descarta o conteúdo não salvo.

> [!CAUTION]
> O editor conta com uma lixeira interna que é esvaziada a cada 30 dias.

---

## Tabelas

| Funcionalidade | Descrição |
| --- | --- |
| Split View | Código e preview lado a lado |
| Abas | Múltiplos documentos abertos simultaneamente |
| Spellcheck | Dicionários Hunspell por idioma |
| Exportação | MD, TXT, HTML, PDF, DOCX e ZIP com imagens |
| Imagens | Import e drag-and-drop direto no editor |

### Formatos de exportação

| Formato | Disponível | Observação |
|:--------|:----------:|:-----------|
| `.md` | ✓ | Arquivo original |
| `.txt` | ✓ | Texto puro sem formatação |
| `.html` | ✓ | Documento standalone |
| `.zip` | ✓ | HTML + imagens do documento |
| `.pdf` | ✓ | Arquivo em .pdf com múltiplas páginas |
| `.docx` | ✓ | Arquivo em formato Word com transposição de formatações |

---

## Blocos de código

Suba o editor em modo de desenvolvimento:

```bash
docker compose -f docker-compose.dev.yml down && \
docker compose -f docker-compose.dev.yml up -d --build
```

Configure volumes adicionais no compose:

```yaml
environment:
  - EXTRA_VOLUMES=projetos:/projetos,notas:/notas
volumes:
  - /home/usuario/documentos:/workspace
  - /home/usuario/projetos:/projetos
```

Variáveis de ambiente disponíveis:

```env
PORT=3001
WORKSPACE_ROOT=/workspace
EXTRA_VOLUMES=nome1:/caminho1,nome2:/caminho2
PUID=1000
PGID=1000
```

---

## Links

O código-fonte está disponível em [github.com/guizmo-silva/markdown-editor](https://github.com/guizmo-silva/markdown-editor).

Guia de instalação: [docs/install/SETUP.md](../docs/install/SETUP.md)

---

## Notas de rodapé

O editor é self-hosted[^1] e foi construído para rodar em servidores domésticos[^2].

[^1]: Self-hosted significa que você mesmo hospeda e controla a aplicação, sem depender de serviços de terceiros.

[^2]: Testado em ZimaOS e Docker rodando no Fedora 43.

---

## Fórmulas matemáticas

Inline: a equação de atualização de um modelo de linguagem pode ser escrita como $P(w_t | w_{t-1}, \ldots, w_1)$

Em bloco:

$$
\text{TF-IDF}(t, d) = \text{TF}(t, d) \times \log\left(\frac{N}{df(t)}\right)
$$

---

## Combinando elementos

> ### Fluxo de trabalho recomendado
>
> - Crie um **novo documento** pela barra de ferramentas
> - O arquivo é nomeado automaticamente pelo *primeiro título*
> - Use `Ctrl+S` para forçar salvamento manual
>
> ```bash
> # Os arquivos ficam salvos no volume mapeado
> ls /home/usuario/documentos
> ```
>
> > [!TIP]
> > Mantenha imagens na mesma pasta do documento para que o ZIP de exportação as inclua automaticamente.
