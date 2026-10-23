/* Lightweight Markdown renderer (no deps).
   Supports: # h1-h3, **bold**, *italic*, `inline code`,
   ```fenced code blocks```, - lists, 1. ordered lists,
   > blockquote, links [t](u), horizontal --- rules. */

const escHtml = (s) => s
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

const inline = (txt) => {
  let s = escHtml(txt);
  s = s.replace(/`([^`]+)`/g, '<code class="font-mono text-[12.5px] bg-bg/60 text-primary-2 px-1.5 py-0.5 rounded ring-1 ring-inset ring-white/5">$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-text1">$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em class="italic text-text1">$1</em>');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary-2 underline decoration-primary/40 hover:decoration-primary">$1</a>');
  return s;
};

const renderMarkdown = (md) => {
  if (!md) return '';
  const lines = md.split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const ln = lines[i];

    // Fenced code block
    if (/^```/.test(ln)) {
      const lang = ln.replace(/^```/, '').trim();
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++;
      out.push(
        `<pre class="bg-bg/80 ring-1 ring-inset ring-white/5 rounded-md p-3 overflow-auto my-3">` +
          (lang ? `<div class="text-[10px] uppercase tracking-wider text-text3 mb-1.5 font-mono">${escHtml(lang)}</div>` : '') +
          `<code class="font-mono text-[12.5px] text-text1 leading-relaxed whitespace-pre">${escHtml(buf.join('\n'))}</code>` +
        `</pre>`
      );
      continue;
    }

    if (/^### /.test(ln)) { out.push(`<h3 class="text-[15px] font-semibold text-text1 mt-4 mb-2">${inline(ln.slice(4))}</h3>`); i++; continue; }
    if (/^## /.test(ln))  { out.push(`<h2 class="text-[17px] font-semibold text-text1 mt-4 mb-2">${inline(ln.slice(3))}</h2>`); i++; continue; }
    if (/^# /.test(ln))   { out.push(`<h1 class="text-[20px] font-bold text-text1 mt-4 mb-2">${inline(ln.slice(2))}</h1>`); i++; continue; }
    if (/^---+\s*$/.test(ln)) { out.push(`<hr class="border-white/10 my-3"/>`); i++; continue; }

    if (/^\s*>\s/.test(ln)) {
      const buf = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
      out.push(`<blockquote class="border-l-2 border-primary/50 pl-3 my-3 text-text2 italic">${inline(buf.join(' '))}</blockquote>`);
      continue;
    }

    if (/^\s*[-*]\s/.test(ln)) {
      const buf = [];
      while (i < lines.length && /^\s*[-*]\s/.test(lines[i])) { buf.push(lines[i].replace(/^\s*[-*]\s/, '')); i++; }
      out.push(`<ul class="list-disc pl-5 space-y-1 my-2 text-text1">${buf.map((x) => `<li>${inline(x)}</li>`).join('')}</ul>`);
      continue;
    }

    if (/^\s*\d+\.\s/.test(ln)) {
      const buf = [];
      while (i < lines.length && /^\s*\d+\.\s/.test(lines[i])) { buf.push(lines[i].replace(/^\s*\d+\.\s/, '')); i++; }
      out.push(`<ol class="list-decimal pl-5 space-y-1 my-2 text-text1">${buf.map((x) => `<li>${inline(x)}</li>`).join('')}</ol>`);
      continue;
    }

    if (ln.trim() === '') { i++; continue; }

    // Paragraph (gather contiguous lines)
    const buf = [ln];
    i++;
    while (i < lines.length && lines[i].trim() !== '' &&
           !/^(#{1,3} |\s*[-*]\s|\s*\d+\.\s|\s*>\s|```|---)/.test(lines[i])) {
      buf.push(lines[i]); i++;
    }
    out.push(`<p class="text-[13.5px] text-text1 leading-relaxed my-2">${inline(buf.join(' '))}</p>`);
  }
  return out.join('');
};

const Markdown = ({ children }) => (
  <div
    className="markdown-body"
    dangerouslySetInnerHTML={{ __html: renderMarkdown(children) }}
  />
);

/* Sample markdown response per task — demonstrates RF07 */
const SAMPLE_RESPONSE_MD = {
  'T-1042':
`## Raiz quadrada de 2048

A raiz quadrada de 2048 é aproximadamente \`45.2548\`.

### Método de Newton-Raphson

Partimos de uma estimativa inicial \`x₀ = 45\` e iteramos:

\`\`\`python
def sqrt_newton(n, x0=None, tol=1e-9):
    x = x0 or n / 2
    for _ in range(20):
        x = 0.5 * (x + n / x)
        if abs(x*x - n) < tol:
            return x
    return x

sqrt_newton(2048)  # → 45.254833995939045
\`\`\`

**Convergência:** quadrática típica do método. Em 3 iterações o erro absoluto fica abaixo de \`1e-6\`.

> A escolha de x₀ próximo de √n acelera dramaticamente a convergência.

### Validação
- 45² = 2025  (abaixo)
- 45.2548² ≈ 2047.998
- Erro relativo: \`< 1e-6\``,

  'T-1041':
`## Resumo: LangGraph

LangGraph é um framework para orquestração de agentes baseados em LLM com **grafos de estado computacionais**.

### Conceitos centrais
1. **Nós** representam funções (agentes ou ferramentas)
2. **Arestas** definem o fluxo entre estados
3. **Estado** é compartilhado e tipado entre nós
4. Suporta **ciclos** — diferente de DAGs tradicionais

### Por que importa para o CDH
O CDH é implementado como uma máquina de estados em LangGraph, onde o nó *Supervisor* pode rotear de volta para si mesmo enquanto a desambiguação não converge.

\`\`\`python
graph.add_edge("supervisor", "worker")
graph.add_conditional_edges("worker", route_fn, {
    "ambiguous": "supervisor",  # ← ciclo de desambiguação
    "done": END,
})
\`\`\`

> *"A capacidade de auto-correção via ciclos é o que diferencia LangGraph de orquestradores DAG."*`,

  'T-1040':
`## Falha — limite de recursão atingido

A execução foi abortada após **15 iterações ReAct** consecutivas sem convergência.

### Causa raiz
- O Worker PESQ entrou em loop de re-formulação da query
- Sem mecanismo de desambiguação proativa (modo Baseline)
- Cada iteração gastou ~150 tokens; perda total: **2.3k tokens**

### Recomendação
Re-executar em modo CDH para que o Supervisor desambigue o escopo da pesquisa antes da delegação.`,
};

const responseFor = (id, fallbackTask) => SAMPLE_RESPONSE_MD[id] ||
`## Resposta

${fallbackTask || 'Resposta gerada pelo sistema multi-agente.'}

### Detalhes
- Modo de execução respeitado
- Resposta produzida pelo worker apropriado
- Validada pelo Supervisor antes do retorno`;

Object.assign(window, { Markdown, renderMarkdown, SAMPLE_RESPONSE_MD, responseFor });
