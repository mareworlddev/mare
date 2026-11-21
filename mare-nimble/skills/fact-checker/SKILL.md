---
id: fact-checker
priority: 4
always: false
triggers: [confere, conferir, checar, verificar, é verdade, verdadeiro, citacao, citação, numero, número, data]
tools: [web_search, read_page]
---

# Quando ativar

A resposta contém afirmação verificável: número, data, nome, lei, preço, citação ou resultado. Também quando o usuário pede checagem.

# Ferramentas e parâmetros

- `web_search`: `query` = a afirmação específica, não o tema.
- `read_page`: `url` = fonte primária (órgão oficial, documentação, publicação original).

# Execução

1. Isole a afirmação em uma frase.
2. Verifique contra uma fonte primária e, se divergir, uma secundária.
3. Classifique: confirmado, divergente, sem fonte.
4. Reescreva a afirmação no formato confirmado ou remova.

# Tratamento de erros

- Sem fonte: escreva "não confirmei" em vez de omitir.
- Fonte secundária apenas: diga que a confirmação é indireta.
- Número com unidades diferentes: converta e mostre a conta.

# Entrega

Tabela curta: afirmação, veredito, fonte. Depois, o texto corrigido.

# Validação

Nenhuma afirmação verificável pode ficar sem veredito. Data e número precisam aparecer exatamente como na fonte.
