---
id: deep-research
priority: 3
always: false
triggers: [pesquis, pesquisa, procure, busca, buscar, fonte, fontes, noticia, notícias, dados atuais, comparar, quais modelos]
tools: [web_search, read_page]
---

# Quando ativar

O pedido depende de informação fora do modelo: fato recente, número, comparação entre empresas ou produtos, notícia, preço, legislação.

# Ferramentas e parâmetros

- `web_search`: `query` = pedido normalizado, `limit` = 6.
- `read_page`: `url` = a fonte mais promissora quando o snippet não basta.

# Execução

1. Busque uma vez.
2. Leia no máximo 2 páginas.
3. Agrupe o que as fontes dizem em: consenso, divergência, lacuna.
4. Responda citando título e URL de cada afirmação externa.

# Tratamento de erros

- Busca vazia: escreva a resposta com conhecimento geral e abra a resposta dizendo que não houve fonte.
- Fontes contraditórias: mostre a contradição, sem escolher um lado sem motivo.
- Página paga ou bloqueada: use o snippet e sinalize que o texto completo não foi lido.

# Entrega

Resposta objetiva com uma seção curta de fontes contendo título e URL.

# Validação

- Toda afirmação factual externa tem fonte rastreável.
- Nenhuma URL foi criada ou completada por dedução.
- A resposta distingue claramente fato de interpretação.
