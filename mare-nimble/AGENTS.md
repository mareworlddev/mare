# mare-nimble

Modelo agêntico próprio da Mare: roteia skills, coleta evidência, orquestra e escreve.

## Modelos

| Papel | Modelo | Provedor | Variável |
| --- | --- | --- | --- |
| Orquestrador (pensa e planeja) | `qwen-3.8-27b` | Cerebras | `CEREBRAS_API_KEY` |
| Escritor (resposta final) | `openai/gpt-oss-20b` | Pollinations | `POLLI_KEY` |
| Pesquisa | FireCrawl | FireCrawl | `FIRE_CRAWLER_API_KEY` |
| Imagem | `microsoft/mai-image-2.7-flash` | Pollinations | `POLLI_KEY` |

Modelos avulsos disponíveis na interface: `openai/gpt-5-nano` e
`openai/gpt-oss-20b`, ambos pela Pollinations.

## Skills

Ordem de prioridade: reasoning-planner, tool-orchestrator, deep-research, fact-checker,
self-correction, coding-engineer, error-recovery, context-memory, security-auditor,
response-quality, image-prompt-engineer.

Cada `skills/<id>/SKILL.md` é instrução executável, não texto descritivo. O frontmatter
define o roteamento:

```yaml
id: deep-research
priority: 3          # menor entra primeiro
always: false        # true = sempre ativa
triggers: [...]      # casa com o texto do usuário (sem acento, caixa baixa)
tools: [web_search, read_page, image]
```

O corpo precisa cobrir: quando ativar, ferramentas e parâmetros, execução, tratamento de
erros, entrega e validação. O runtime injeta o corpo inteiro no prompt do escritor.

## Runtime

| Arquivo | Papel |
| --- | --- |
| `runtime/skill-router.ts` | lê os SKILL.md e escolhe até 4 skills (always + comando + gatilhos) |
| `runtime/executor.ts` | executa ferramentas, chama o orquestrador, monta o prompt do escritor |
| `runtime/memory.ts` | corta o histórico e anexa as evidências coletadas |
| `runtime/validator.ts` | reprova a resposta antes de entregar (fonte, placeholder, código) |

Fluxo de uma rodada:

1. `routeSkills` escolhe as skills.
2. `collectEvidence` roda `web_search`/`read_page` quando uma skill autoriza.
3. `planWithOrchestrator` pede o plano ao Qwen na Cerebras.
4. O escritor (GPT-OSS 20B) responde em stream.
5. `validateAnswer` reprova e uma autocorreção reescreve, se necessário.

## Regras

- Ferramenta só entra quando muda a resposta.
- Nenhuma fonte, URL ou número inventado.
- Falha de etapa não vira resposta falsa: a resposta declara o que faltou.
- Segredo nunca aparece em log, resposta ou mensagem de erro.
