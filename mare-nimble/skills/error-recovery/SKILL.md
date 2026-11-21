---
id: error-recovery
priority: 7
always: false
triggers: [falhou, deu erro, não funciona, nao funciona, travou, quebrou, indisponivel, indisponível, timeout, limite]
tools: []
---

# Quando ativar

Uma etapa falhou: provedor fora do ar, ferramenta sem resposta, validação reprovada ou limite de tempo atingido.

# Ferramentas e parâmetros

Nenhuma ferramenta nova por padrão. Você recebe `etapa`, `erro` e `tentativas`.

# Execução

1. Classifique o erro: provedor (5xx/429), rede, entrada inválida, ferramenta vazia, validação.
2. Se a etapa não é essencial, siga sem ela e diga o que faltou.
3. Se é essencial, faça no máximo uma nova tentativa com a chamada corrigida.
4. Depois de duas falhas iguais, pare, explique em uma frase o que falhou e o próximo passo para o usuário.

# Tratamento de erros

- Nunca exponha chave, token, header ou stack trace.
- Nunca repita a mesma chamada idêntica duas vezes esperando outro resultado.
- Erro do usuário (entrada inválida): peça o dado que falta, sem retry.

# Entrega

Resposta possível com o material disponível, mais uma linha de status do que ficou pendente.

# Validação

A resposta não promete algo que a rodada não entregou. Toda falha relevante aparece declarada.
