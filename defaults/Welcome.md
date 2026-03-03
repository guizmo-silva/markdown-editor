# Bem-vindo ao Markdown Editor

Este documento demonstra todas as funcionalidades de formatação suportadas pelo editor. Use-o como referência para criar seus próprios documentos!

---

## Formatação de Texto

Você pode aplicar diferentes estilos ao seu texto:

- **Texto em negrito** usando `**texto**` ou `__texto__`
- *Texto em itálico* usando `*texto*` ou `_texto_`
- ***Texto em negrito e itálico*** usando `***texto***`
- ~~Texto tachado~~ usando `~~texto~~`
- `Código inline` usando crases \`código\`

---

## Cabeçalhos

O Markdown suporta 6 níveis de cabeçalhos:

# Cabeçalho Nível 1
## Cabeçalho Nível 2
### Cabeçalho Nível 3
#### Cabeçalho Nível 4
##### Cabeçalho Nível 5
###### Cabeçalho Nível 6

---

## Listas

### Lista Não Ordenada

- Primeiro item
- Segundo item
  - Subitem 2.1
  - Subitem 2.2
    - Subitem 2.2.1
- Terceiro item

### Lista Ordenada

1. Primeiro passo
2. Segundo passo
   1. Subpasso 2.1
   2. Subpasso 2.2
3. Terceiro passo

### Lista de Tarefas

- [x] Tarefa concluída
- [x] Outra tarefa concluída
- [ ] Tarefa pendente
- [ ] Mais uma tarefa pendente

---

## Citações (Blockquotes)

> Esta é uma citação simples.
> Pode ocupar múltiplas linhas.

> Citações também podem ser aninhadas:
>
> > Esta é uma citação dentro de outra citação.
> >
> > > E esta é ainda mais profunda!

---

## Alertas

O editor suporta os alertas do GitHub Flavored Markdown:

> [!NOTE]
> Esta é uma nota informativa. Use para destacar informações que o usuário deve conhecer.

> [!TIP]
> Esta é uma dica útil. Use para sugerir melhores práticas ou atalhos.

> [!IMPORTANT]
> Esta é uma informação importante. Use para destacar pontos cruciais.

> [!WARNING]
> Este é um aviso. Use para alertar sobre possíveis problemas.

> [!CAUTION]
> Este é um alerta de cuidado. Use para avisar sobre ações perigosas ou irreversíveis.

---

## Tabelas

| Recurso | Suportado | Observações |
|---------|:---------:|-------------|
| Negrito | Sim | Use `**texto**` |
| Itálico | Sim | Use `*texto*` |
| Tabelas | Sim | Alinhamento configurável |
| Código | Sim | Syntax highlighting |

### Tabela com Alinhamentos

| Alinhado à Esquerda | Centralizado | Alinhado à Direita |
|:--------------------|:------------:|-------------------:|
| Texto | Texto | Texto |
| Mais texto | Mais texto | Mais texto |

---

## Blocos de Código

### Código sem Linguagem

```
Este é um bloco de código simples
sem syntax highlighting
```

### JavaScript

```javascript
function saudacao(nome) {
  const mensagem = `Olá, ${nome}!`;
  console.log(mensagem);
  return mensagem;
}

saudacao('Mundo');
```

### Python

```python
def calcular_fibonacci(n):
    """Calcula o n-ésimo número de Fibonacci."""
    if n <= 1:
        return n
    return calcular_fibonacci(n - 1) + calcular_fibonacci(n - 2)

# Imprime os primeiros 10 números
for i in range(10):
    print(f"F({i}) = {calcular_fibonacci(i)}")
```

### TypeScript

```typescript
interface Usuario {
  id: number;
  nome: string;
  email: string;
  ativo: boolean;
}

const criarUsuario = (dados: Partial<Usuario>): Usuario => {
  return {
    id: Date.now(),
    nome: dados.nome ?? 'Anônimo',
    email: dados.email ?? '',
    ativo: dados.ativo ?? true,
  };
};
```

### CSS

```css
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
```

### JSON

```json
{
  "nome": "Markdown Editor",
  "versao": "1.0.0",
  "recursos": [
    "Edição em tempo real",
    "Preview sincronizado",
    "Exportação múltipla"
  ],
  "configuracoes": {
    "tema": "escuro",
    "fonte": "monospace",
    "tamanho": 14
  }
}
```

### Bash

```bash
#!/bin/bash

# Script de exemplo
echo "Iniciando instalação..."

for pacote in node npm docker; do
    if command -v $pacote &> /dev/null; then
        echo "✓ $pacote já está instalado"
    else
        echo "✗ $pacote não encontrado"
    fi
done
```

---

## Links

### Links Inline

- [Visite o GitHub](https://github.com)
- [Documentação do Markdown](https://docs.github.com/pt/get-started/writing-on-github)

### Links de Referência

Este editor foi inspirado em projetos como [VS Code][vscode] e [Obsidian][obsidian].

[vscode]: https://code.visualstudio.com
[obsidian]: https://obsidian.md

### Autolinks

Links são detectados automaticamente: https://github.com

E-mails também: contato@exemplo.com

---

## Imagens

### Imagem com Texto Alternativo

![Logo do Markdown](https://markdown-here.com/img/icon256.png)

### Imagem como Link

[![Clique para visitar](https://via.placeholder.com/200x50/667eea/ffffff?text=Clique+Aqui)](https://github.com)

---

## Notas de Rodapé

O Markdown suporta notas de rodapé[^1] que são muito úteis para adicionar referências[^2] ou explicações adicionais[^nota-longa].

[^1]: Esta é uma nota de rodapé simples.

[^2]: As notas de rodapé aparecem no final do documento.

[^nota-longa]: As notas de rodapé podem ter identificadores descritivos e conter múltiplos parágrafos.

    Basta indentar o conteúdo adicional com 4 espaços.

---

## Fórmulas Matemáticas

O editor suporta fórmulas LaTeX/KaTeX:

### Fórmulas Inline

A famosa equação de Einstein: $E = mc^2$

A fórmula de Bhaskara: $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$

### Fórmulas em Bloco

A integral de Gauss:

$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

Somatório:

$$
\sum_{i=1}^{n} i = \frac{n(n+1)}{2}
$$

Matriz:

$$
\begin{pmatrix}
a & b \\
c & d
\end{pmatrix}
\times
\begin{pmatrix}
e & f \\
g & h
\end{pmatrix}
=
\begin{pmatrix}
ae+bg & af+bh \\
ce+dg & cf+dh
\end{pmatrix}
$$

---

## Linhas Horizontais

Você pode criar linhas horizontais de três formas:

Usando três hífens:

---

Usando três asteriscos:

***

Usando três underscores:

___

---

## Texto Especial

### Subscrito e Sobrescrito

H~2~O é a fórmula da água.

O resultado é 2^10^ = 1024.

### Destaque

Use ==texto destacado== para chamar atenção.

---

## Combinando Elementos

Você pode combinar vários elementos em estruturas complexas:

> ### Citação com Formatação
>
> Esta citação contém:
> - **Texto em negrito**
> - *Texto em itálico*
> - `Código inline`
>
> E até mesmo um bloco de código:
>
> ```python
> print("Olá do bloco de código dentro da citação!")
> ```
>
> > [!TIP]
> > Alertas também funcionam dentro de citações!

---

## Conclusão

Este documento cobriu todas as principais funcionalidades de formatação do Markdown suportadas por este editor. Use estas referências para criar documentos ricos e bem formatados!

**Atalhos úteis:**
- Use a barra de ferramentas para aplicar formatações rapidamente
- Navegue pelos elementos usando a barra lateral
- Exporte seu documento em diferentes formatos

---

*Documento criado para demonstração do Markdown Editor*
