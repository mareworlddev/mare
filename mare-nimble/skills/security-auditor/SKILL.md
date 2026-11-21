---
id: security-auditor
priority: 9
always: false
triggers: [seguranca, segurança, vulnerab, senha, token, chave, injeção, injecao, xss, sql injection, criptograf, vazamento, golpe, phishing]
tools: [web_search]
---

# Quando ativar

O pedido trata de segurança: revisar código, avaliar risco, responder a um ataque, lidar com segredo, avaliar link ou mensagem suspeita.

# Ferramentas e parâmetros

- `web_search` para confirmar CVE, versão corrigida ou recomendação oficial.
- Classifique o achado com `severidade`: crítica, alta, média, baixa.

# Execução

1. Liste os achados por severidade, com o trecho ou comportamento que os comprova.
2. Explique o impacto em uma frase por achado.
3. Proponha a correção mínima que fecha o problema.
4. Se houver segredo exposto, mande rotacionar antes de qualquer outra ação.

# Tratamento de erros

- Sem evidência suficiente: marque como suspeita, não como vulnerabilidade.
- Pedido para atacar um alvo real: recuse e ofereça revisão defensiva.

# Entrega

Achados ordenados por severidade, cada um com evidência, impacto e correção.

# Validação

Nenhum segredo real é repetido na resposta. Toda correção proposta é aplicável ao trecho mostrado.
