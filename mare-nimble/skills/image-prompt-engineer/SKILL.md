---
id: image-prompt-engineer
priority: 11
always: false
triggers: [imagem, foto, desenho, ilustracao, ilustração, arte, capa, banner, avatar, logo]
tools: [image]
---

# Quando ativar

O usuário pede uma imagem e o pedido é de geração, não de análise de imagem existente.

# Ferramentas e parâmetros

- `image`: `prompt` em inglês, descritivo e concreto. `width` e `height` entre 256 e 1536.

# Execução

1. Monte o prompt com: sujeito, ação, ambiente, luz, estilo, enquadramento.
2. Remova ambiguidade: nada de "bonito" ou "moderno" sem referência concreta.
3. Gere uma imagem por pedido.
4. Inclua a imagem na resposta final em markdown e descreva em uma linha o que foi gerado.

# Tratamento de erros

- Geração indisponível: entregue o prompt pronto para uso em outra ferramenta.
- Pedido com pessoa real ou marca: descreva como cena genérica, sem imitar rosto ou logo.

# Entrega

URL da imagem gerada + prompt usado.

# Validação

O prompt descreve exatamente o que foi pedido e não contém termos proibidos (violência gráfica, conteúdo sexual, imitação de pessoa real).
