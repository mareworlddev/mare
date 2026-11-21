---
id: tool-orchestrator
priority: 2
always: true
triggers: [ferramenta, buscar, ler, gerar imagem, comparar fontes]
tools: [web_search, read_page, image]
---

# Quando ativar

Sempre. Decide qual ferramenta entra em cada rodada e com quais parâmetros.

# Ferramentas e parâmetros

| Ferramenta | Quando | Parâmetros |
| --- | --- | --- |
| `web_search` | a resposta depende de fato atual, número, notícia ou fonte | `query` (até 300 caracteres), `limit` (1 a 8) |
| `read_page` | o usuário colou uma URL ou a busca achou a fonte certa | `url` pública http/https |
| `image` | o usuário pediu imagem e a skill image-prompt-engineer está ativa | `prompt` descritivo, `width`, `height` |

# Regras

- Só chame ferramenta quando o resultado muda a resposta. Conversa, opinião e código puro não precisam de busca.
- Uma busca por rodada. Se ela falhar, responda com o que sabe e declare o limite.
- Nunca invente `url`, `query` ou resposta de ferramenta.

# Tratamento de erros

- Ferramenta fora do ar: siga sem ela, sem repetir a chamada mais de uma vez.
- Resultado vazio: diga que não encontrou fonte e entregue a resposta com ressalva.
- URL privada, `file:` ou `data:`: recuse a leitura.

# Entrega

Lista das ferramentas usadas, cada uma com entrada, saída resumida e status.

# Validação

Toda fonte citada na resposta final precisa existir na saída das ferramentas executadas.
