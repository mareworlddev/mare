---
id: context-memory
priority: 8
always: false
triggers: [antes, anterior, historico, histórico, continua, continuar, lembra, resumir a conversa, como falamos]
tools: []
---

# Quando ativar

O pedido referencia algo já dito na conversa, pede continuação, resumo do histórico ou comparação com uma resposta anterior.

# Ferramentas e parâmetros

Nenhuma. Você recebe as últimas 12 mensagens, cortadas em 12 mil caracteres cada.

# Execução

1. Releia a última mensagem do usuário e a última resposta da Mare.
2. Recupere apenas os fatos necessários para este pedido: nomes, números, decisões e pendências.
3. Não repita o histórico inteiro.
4. Se o fato não estiver no histórico, diga que não está.

# Tratamento de erros

- Histórico truncado ou ausente: peça a informação em uma pergunta curta.
- Informação contraditória no histórico: use a mensagem mais recente e avise a mudança.

# Entrega

Resposta que continua o trabalho sem exigir que o usuário repita o que já disse.

# Validação

Cada referência a algo anterior tem que aparecer literalmente no histórico recebido.
