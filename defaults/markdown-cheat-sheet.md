# Folha de referência de Markdown

Use este arquivo como um guia para as diferentes formatações que o markdown e este editor suportam. Exporte esse documento em diferentes formatos para ter uma noção de como cada elemento é traduzido.

# Markdown Cheat Sheet

Use this file as a guide to the different formatting options that Markdown and this editor support. Export this document in different formats to get a sense of how each element is rendered.

# Hoja de referencia de Markdown

Usa este archivo como guía para los diferentes formatos que Markdown y este editor admiten. Exporta este documento en distintos formatos para ver cómo se traduce cada elemento.

# Aide-mémoire Markdown

Utilisez ce fichier comme guide pour les différentes mises en forme prises en charge par Markdown et cet éditeur. Exportez ce document dans différents formats pour voir comment chaque élément est rendu.

# Markdown-Referenzblatt

Verwenden Sie diese Datei als Leitfaden für die verschiedenen Formatierungen, die Markdown und dieser Editor unterstützen. Exportieren Sie dieses Dokument in verschiedene Formate, um einen Eindruck davon zu bekommen, wie jedes Element gerendert wird.

# Справочный лист Markdown

Используйте этот файл как руководство по различным видам форматирования, которые поддерживают Markdown и этот редактор. Экспортируйте этот документ в разные форматы, чтобы понять, как каждый элемент отображается.

# Markdown संदर्भ पत्रक

इस फ़ाइल को Markdown और इस संपादक द्वारा समर्थित विभिन्न स्वरूपण विकल्पों की मार्गदर्शिका के रूप में उपयोग करें। यह देखने के लिए कि प्रत्येक तत्व कैसे रेंडर होता है, इस दस्तावेज़ को विभिन्न प्रारूपों में निर्यात करें।

# Markdown 速查表

将此文件用作 Markdown 及本编辑器所支持的各种格式化选项的参考指南。以不同格式导出本文档，了解每个元素的渲染效果。

---

## 1. Títulos (H1–H6)

# H1 — Título Principal
## H2 — Seção
### H3 — Subseção
#### H4 — Sub-subseção
##### H5 — Menor nível comum
###### H6 — Menor nível possível

---

## 2. Ênfase e Formatação de Texto

Texto **negrito** com dois asteriscos.
Texto __negrito__ com dois underscores.
Texto *itálico* com um asterisco.
Texto _itálico_ com um underscore.
Texto ***negrito e itálico*** combinados.
Texto ~~tachado~~ com GFM.
Texto `inline code` com crase.

Texto com `**negrito dentro de código não é formatado**`.

Escape de caracteres especiais: \*não itálico\*, \`não código\`, \# não título.

---

## 3. Parágrafos e Quebras de Linha

Primeiro parágrafo. Texto corrido sem quebra intencional.

Segundo parágrafo separado por linha em branco.

Linha com quebra forçada (dois espaços ao final):
Esta linha está na mesma separação visual mas em nova linha.

---

## 4. Listas Não Ordenadas

- Item 1
- Item 2
  - Sub-item 2.1
  - Sub-item 2.2
    - Sub-sub-item 2.2.1
- Item 3

* Usando asterisco
* Segundo item
  * Aninhado

+ Usando sinal de mais
+ Segundo item

---

## 5. Listas Ordenadas

1. Primeiro
2. Segundo
3. Terceiro
   1. Sub-item 3.1
   2. Sub-item 3.2
4. Quarto

1. Itens com texto mais longo:
   Esta linha continua o item 1 com indentação.
2. Segundo item normal.

---

## 6. Task Lists (GFM)

- [x] Tarefa concluída
- [x] Outra concluída
- [ ] Tarefa pendente
- [ ] Ainda não feita
  - [x] Sub-tarefa concluída
  - [ ] Sub-tarefa pendente

---

## 7. Blockquotes

> Citação simples de uma linha.

> Citação com múltiplas linhas.
> Continuação na próxima linha.

> Citação com **formatação** e `código` interno.

> Blockquote aninhado:
> > Segundo nível de citação.
> > > Terceiro nível.

> ### Título dentro de blockquote
>
> Parágrafo dentro de blockquote.
>
> - Lista dentro de blockquote
> - Segundo item

---

## 8. Alertas / Admonitions (GFM Alerts)

> [!NOTE]
> Informação adicional que o usuário deveria conhecer, mesmo ao passar rapidamente pelo conteúdo.

> [!TIP]
> Informações opcionais para ajudar o usuário a ter mais sucesso.

> [!IMPORTANT]
> Informações cruciais necessárias para o sucesso do usuário.

> [!WARNING]
> Conteúdo crítico exigindo atenção imediata do usuário por causa de riscos potenciais.

> [!CAUTION]
> Possíveis consequências negativas de uma ação.

---

## 9. Código

### Inline

Use `console.log()` para depurar. A variável `const x = 42` é imutável.

### Bloco sem linguagem

```
texto sem destacamento
apenas monospace
```

### JavaScript

```javascript
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

const result = fibonacci(10);
console.log(`Fibonacci(10) = ${result}`);
```

### TypeScript

```typescript
interface User {
  id: number;
  name: string;
  email?: string;
}

function greet(user: User): string {
  return `Olá, ${user.name}!`;
}
```

### Python

```python
def quicksort(arr: list) -> list:
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)
```

### Bash

```bash
#!/bin/bash
for file in *.md; do
  echo "Processando: $file"
  wc -l "$file"
done
```

### JSON

```json
{
  "name": "markdown-editor",
  "version": "0.18.4",
  "dependencies": {
    "react": "^18.0.0",
    "next": "^14.0.0"
  }
}
```

### CSS

```css
.container {
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  background-color: var(--bg-primary);
}

@media (max-width: 768px) {
  .container {
    flex-direction: column;
  }
}
```

### HTML

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Exemplo</title>
</head>
<body>
  <h1>Olá, mundo!</h1>
</body>
</html>
```

### SQL

```sql
SELECT
  u.id,
  u.name,
  COUNT(o.id) AS total_orders
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE u.created_at > '2024-01-01'
GROUP BY u.id, u.name
ORDER BY total_orders DESC
LIMIT 10;
```

### Diff

```diff
- linha removida
+ linha adicionada
  linha sem alteração
- outra remoção
+ outra adição
```

---

## 10. Tabelas (GFM)

### Tabela simples

| Nome     | Idade | Cidade     |
|----------|-------|------------|
| Alice    | 28    | São Paulo  |
| Bob      | 34    | Rio de Janeiro |
| Carol    | 22    | Curitiba   |

### Alinhamento de colunas

| Esquerda | Centro | Direita |
|:---------|:------:|--------:|
| texto    | texto  |   texto |
| longo    | curto  |       1 |
| conteúdo | aqui   |    9999 |

### Tabela com formatação nas células

| Funcionalidade | Status | Notas |
|----------------|--------|-------|
| **Negrito** | ✅ Suportado | Funciona em células |
| `código` | ✅ Suportado | Inline apenas |
| *Itálico* | ✅ Suportado | Ambas as sintaxes |
| [Links](#links) | ✅ Suportado | URLs relativas também |
| ~~Tachado~~ | ✅ Suportado | GFM only |

---

## 11. Links e Autolinks

### Links básicos

[Link externo](https://google.com)

[Link com título](https://Google.com "Título ao passar o mouse")

[Link relativo](./outro-arquivo.md)

[Link para âncora](#5-listas-ordenadas)

### Autolinks (GFM)

URL automática: https://example.com

Email automático: usuario@example.com

### Links de referência

Veja o [guia completo][guia] e a [documentação][docs] para mais detalhes.

[guia]: https://example.com/guia "Guia Completo"
[docs]: https://example.com/docs

---

## 12. Imagens

Imagem com alt text (logo do Python via jsDelivr/devicons, MIT):
![Logo do Python](https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg)

Imagem com título (foto CC0 via Lorem Picsum):
![Foto de natureza](https://picsum.photos/id/1074/320/200.jpg "Foto CC0 — Lorem Picsum #1074")

Imagem como link (badge shields.io):
[![Markdown](https://img.shields.io/badge/markdown-completo-blue)](https://commonmark.org)

---

## 13. Linhas Horizontais

Com hífens:

---

Com asteriscos:

***

Com underscores:

___

---

## 14. Footnotes (Markdown Estendido)

Esta frase tem uma nota de rodapé[^1].

Outra frase com uma nota mais longa[^nota-longa].

Referência duplicada ao rodapé[^1] (mesmo número).

[^1]: Esta é a primeira nota de rodapé, curta.

[^nota-longa]: Esta nota de rodapé é mais longa e pode conter múltiplas linhas e até formatação **negrito** e `código`.

---

## 15. Fórmulas Matemáticas (KaTeX)

### Inline

A fórmula de Euler é $e^{i\pi} + 1 = 0$.

O teorema de Pitágoras: $a^2 + b^2 = c^2$.

### Em bloco

$$
\int_0^\infty \frac{x^3}{e^x - 1}\,dx = \frac{\pi^4}{15}
$$

$$
\nabla^2 \phi = \frac{1}{c^2} \frac{\partial^2 \phi}{\partial t^2}
$$

---

## 16. HTML Inline

### Detalhe / Summary (acordeão)

<details>
<summary>Clique para expandir</summary>

Conteúdo oculto que aparece ao expandir.

- Item 1
- Item 2
- Item 3

</details>

<details>
<summary><strong>Seção avançada com código</strong></summary>

```python
print("Conteúdo dentro de details")
```

</details>

### Teclado

Pressione <kbd>Ctrl</kbd>+<kbd>S</kbd> para salvar.
Use <kbd>Ctrl</kbd>+<kbd>Z</kbd> para desfazer.

### Texto marcado / Highlight

<mark>Texto destacado em amarelo</mark> como um marcador.

### Subscrito e Sobrescrito

H<sub>2</sub>O é a fórmula da água.
E = mc<sup>2</sup> é a equação de Einstein.
CO<sub>2</sub> é dióxido de carbono.

### Abreviação

A sigla <abbr title="HyperText Markup Language">HTML</abbr> é a base da web.
O formato <abbr title="Portable Document Format">PDF</abbr> é amplamente usado.

### Divisor com alinhamento

<div align="center">

**Texto centralizado via HTML**

</div>

### Tabela HTML

<table>
  <thead>
    <tr>
      <th>Col A</th>
      <th>Col B</th>
      <th>Col C</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>célula 1</td>
      <td>célula 2</td>
      <td>célula 3</td>
    </tr>
    <tr>
      <td colspan="2">célula que ocupa 2 colunas</td>
      <td>normal</td>
    </tr>
  </tbody>
</table>

---

## 17. Listas de Definição (HTML)

<dl>
  <dt>Markdown</dt>
  <dd>Linguagem de marcação leve criada por John Gruber em 2004.</dd>

  <dt>GFM</dt>
  <dd>GitHub Flavored Markdown — extensão do CommonMark usada no GitHub.</dd>

  <dt>KaTeX</dt>
  <dd>Biblioteca JavaScript para renderização de fórmulas matemáticas no navegador.</dd>
</dl>

---

## 18. Texto Pré-formatado

<pre>
  Texto pré-formatado
  mantendo espaços   e tabs
  exatamente como escrito
</pre>

---

## 19. Comentários HTML

<!-- Este comentário não deve aparecer no preview -->

Texto visível antes do comentário.

<!--
  Comentário
  de múltiplas
  linhas
-->

Texto visível depois do comentário.

---

## 20. Combinações e Casos Extremos

### Lista com blocos

- Primeiro item com parágrafo longo.

  Este parágrafo pertence ao primeiro item da lista, com indentação de 2 espaços.

- Segundo item com código:

  ```js
  console.log("dentro de lista");
  ```

- Terceiro item com blockquote:

  > Citação dentro de item de lista.

### Blockquote com lista e código

> **Lista dentro de citação:**
>
> 1. Primeiro passo
> 2. Segundo passo
> 3. Terceiro passo
>
> ```bash
> echo "código dentro de citação"
> ```

### Tabela com código inline

| Comando | Descrição |
|---------|-----------|
| `git init` | Inicializa repositório |
| `git add .` | Adiciona todos os arquivos |
| `git commit -m "msg"` | Cria um commit |
| `git push origin main` | Envia para o remoto |

### Listas aninhadas profundas

1. Nível 1
   1. Nível 2
      1. Nível 3
         1. Nível 4
            - Nível 5 não-ordenado
            - Outro item

---

## 21. Emojis

🎉 Festa
🚀 Foguete
✅ Concluído
❌ Erro
⚠️ Aviso
💡 Ideia
📝 Nota
🔧 Ferramenta

Texto com emoji no meio: O projeto está 🚀 em produção!

---

## 22. Texto Longo para Teste de Scroll

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.

Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet.

At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.

---

## 23. Bloco de Código Muito Longo (Scroll Horizontal)

```javascript
const veryLongVariableNameThatExceedsTheNormalLineWidth = someFunction(argument1, argument2, argument3, argument4, argument5, argument6);

// Esta linha é propositalmente muito longa para testar o scroll horizontal dentro do bloco de código e verificar se o overflow está sendo tratado corretamente pelo editor
const anotherLongLine = "string com texto muito longo que ultrapassa a largura normal do container de código para testar o comportamento do scroll horizontal";
```

---

## 24. Seção Final

Este arquivo cobre os principais elementos do:

- **CommonMark** — padrão base
- **GFM (GitHub Flavored Markdown)** — tabelas, task lists, strikethrough, autolinks, alerts
- **Markdown Estendido** — footnotes, fórmulas KaTeX
- **HTML embutido** — details/summary, kbd, mark, sub, sup, abbr, tabelas HTML

Use este arquivo para verificar visualmente se todos os elementos estão sendo renderizados corretamente no preview.
