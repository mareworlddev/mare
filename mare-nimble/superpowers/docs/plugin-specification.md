# Especificação de plugin Superpowers

## Objetivo e escopo

Construir uma integração que torne as skills deste repositório descobertas e utilizáveis por um agente em tarefas de escrita, pesquisa, estratégia, diagnóstico e projetos. Esta é uma especificação independente de plataforma: **não é um plugin instalável** e não garante que uma integração já exista. O implementador deve adaptar o mecanismo de registro e invocação às capacidades reais do ambiente de destino.

## Conteúdo distribuído

A fonte de verdade são os arquivos `skills/<nome>/SKILL.md`:

| Nome | Gatilho e finalidade |
| --- | --- |
| `using-superpowers` | Orientação inicial, seleção das skills e precedência de instruções. |
| `brainstorming` | Esclarecer o objetivo e decisões importantes de uma tarefa criativa. |
| `writing-plans` | Estruturar trabalho de várias etapas e executar o resultado solicitado. |
| `systematic-debugging` | Investigar um problema e testar hipóteses antes de agir. |
| `verification-before-completion` | Verificar o resultado e relatar lacunas antes de afirmar conclusão. |
| `dispatching-parallel-agents` | Dividir trabalho independente e revisar a síntese quando delegação for permitida. |
| `writing-skills` | Criar e revisar procedimentos reutilizáveis. |

Cada arquivo começa com frontmatter YAML contendo `name` e `description`, seguido das instruções. O nome corresponde ao diretório; a descrição informa quando a skill se aplica. Distribua o conteúdo integral e preserve os caminhos relativos das referências. Não é necessário executar scripts para aplicar estas skills.

## Contrato de integração

1. **Registro:** disponibilizar os nomes, descrições e corpos das sete skills. Resolver cada nome exatamente para seu `SKILL.md`; erros de leitura ou registro devem ser informados, não silenciosamente tratados como sucesso.
2. **Orientação inicial:** tornar `using-superpowers` e as descrições disponíveis no início da sessão ou da tarefa, usando o mecanismo suportado pelo ambiente. Após perda de contexto, disponibilizá-las novamente se a plataforma permitir. Não presumir que a simples presença dos arquivos garante ativação automática.
3. **Seleção e carregamento:** permitir que o agente identifique skills pertinentes a partir das descrições e leia suas instruções completas antes de aplicá-las; permitir também solicitação explícita pelo usuário. Não ativar todas as skills cegamente em toda tarefa.
4. **Precedência e proporcionalidade:** respeitar instruções do usuário, políticas e limites de ferramentas. Não exigir esclarecimentos ou aprovação desnecessários para pedidos claros; fazer perguntas curtas quando uma decisão essencial estiver em aberto. Um plano não substitui o entregável pedido.
5. **Fluxo:** para um pedido criativo complexo, esclarecer o que falta com `brainstorming`, estruturar o trabalho com `writing-plans` quando útil, executar o pedido e aplicar `verification-before-completion`. Para problemas de causa desconhecida, aplicar as quatro fases de `systematic-debugging`. Usar `writing-skills` para procedimentos recorrentes.
6. **Delegação opcional:** usar `dispatching-parallel-agents` somente para subproblemas independentes, quando houver autorização e suporte. Fornecer instruções delimitadas, revisar resultados e fontes, e consolidar lacunas. Se não houver permissão ou capacidade, executar no contexto atual e declarar limitações; não contornar restrições nem inventar agentes.
7. **Verificação e honestidade:** conferir o resultado real contra as regras do pedido e as fontes disponíveis. Informar verificações não realizadas, hipóteses e limitações. Não afirmar que uma integração, ação ou checagem foi realizada sem evidência.
8. **Segurança e privacidade:** seguir permissões e escopo concedidos. Não transmitir dados sensíveis desnecessários nem executar ações externas não autorizadas. Conter uma falha de uma skill ou de uma tarefa delegada e relatar o que ficou incompleto.

## Critérios de aceitação

Uma implementação deve demonstrar os seguintes casos no ambiente de destino, registrando ações e evidências observáveis:

- **Descoberta:** os sete nomes e descrições são encontrados; uma solicitação explícita carrega o corpo correto, e uma skill ausente produz erro claro.
- **Redação com lacuna:** diante de um artigo cujo público ou objetivo essencial não foi informado, o agente faz uma pergunta curta pertinente; com contexto suficiente, esboça a estrutura e entrega o artigo sem pedir aprovação desnecessária.
- **Diagnóstico:** para uma queda de vendas sem dados suficientes, distingue observações e hipóteses, propõe evidências ou verificações, e não declara uma causa comprovada.
- **Verificação:** para um texto com limite de palavras e fontes fornecidas, verifica o limite e as afirmações; relata qualquer fonte não acessível em vez de afirmar que a conferiu.
- **Pesquisa paralela:** com delegação autorizada e disponível, divide questões independentes e verifica a síntese; sem autorização ou capacidade, trabalha localmente, sem lançar agentes nem alegar que os usou.
- **Procedimento:** para uma rotina de resumo de reuniões, produz entradas, passos, tratamento de informações ausentes e critérios de qualidade sem inventar decisões ou responsáveis.
- **Proporcionalidade:** para uma tarefa simples e clara, entrega diretamente sem uma entrevista ou plano formal imposto.

Além dos testes estruturais dos arquivos, execute os cenários com o agente real para verificar o comportamento. Um teste estático não demonstra que o agente seleciona ou segue as skills. Não alegue suporte a uma plataforma até realizar essa validação nela.
