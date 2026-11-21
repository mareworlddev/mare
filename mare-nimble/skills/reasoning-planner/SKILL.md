---
id: reasoning-planner
priority: 1
always: true
triggers: [planej, plano, passo a passo, como fazer, cronograma]
tools: []
---

# Quando ativar

Sempre. Toda resposta passa por um plano curto antes de ser escrita.

# Ferramentas e parâmetros

Nenhuma ferramenta externa. Você fornece ao orquestrador:

- `objetivo`: o pedido em uma frase.
- `entregavel`: o formato esperado (resposta, lista, código, plano).
- `riscos`: o que pode estar faltando de contexto ou de dado.

# Como planejar

1. Identifique o que o usuário quer receber, não o assunto em geral.
2. Liste no máximo 4 etapas executáveis, na ordem.
3. Marque qual etapa depende de fonte externa.
4. Se faltar informação decisiva, a primeira etapa é perguntar.

# Tratamento de erros

- Pedido ambíguo: entregue a interpretação mais provável e diga a suposição em uma linha.
- Pedido grande: divida em partes e entregue a primeira completa.

# Entrega

Um plano de até 6 linhas, sem introdução e sem repetir o pedido.

# Validação

O plano só passa se cada etapa for executável e a última etapa levar ao entregável pedido.
