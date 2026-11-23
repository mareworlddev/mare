<div align="center">

<img src="public/mare/opt/foto-perfil.png" width="170" alt="Mare, a mascote do projeto: uma égua cinza pintada em aquarela" />

# Mare

Um agente de IA companheiro. Pesquisa na web, escreve com rigor, gera imagens,
organiza conversas em projetos com kanban e pasta grama pela tela enquanto trabalha.

[![Next.js 16](https://img.shields.io/badge/Next.js%2016-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React 19](https://img.shields.io/badge/React%2019-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript%205-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-0F172A?style=flat-square&logo=tailwindcss&logoColor=38BDF8)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-1C1C1C?style=flat-square&logo=supabase&logoColor=3FCF8E)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Deploy%20na%20Vercel-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com)

[![npm audit](https://img.shields.io/badge/npm%20audit-0%20vulnerabilidades-2EA043?style=flat-square)](https://docs.npmjs.com/cli/v10/commands/npm-audit)
[![Auditoria de segurança](https://img.shields.io/badge/auditoria%20de%20seguran%C3%A7a-3%20rodadas-8250DF?style=flat-square)](#segurança)
[![Feito com Mistral Vibe](https://img.shields.io/badge/feito%20com-Mistral%20Vibe-FA520F?style=flat-square&logo=mistralai&logoColor=white)](https://mistral.ai)

<img src="docs/divisor-grama.png" width="205" alt="Tufo de grama em aquarela, onde a Mare pasta" />

</div>

## Visão geral

A Mare roda na web com duas formas de responder. No caminho direto, o usuário escolhe
um modelo e conversa em streaming com raciocínio visível, fontes e chamadas de
ferramenta. No caminho do agente, o pipeline `mare-nimble` planeja, coleta evidências,
redige e valida a própria resposta antes de entregá-la.

A interface traz ainda um pet animado: a égua pasta, come maçã, bebe água e reage ao
mouse, com sons e guloseimas arrastáveis. Tudo isso convive com o trabalho sério:
projetos, kanban, anexos e histórico sincronizado entre abas.

## O que a Mare faz

| Recurso | Como funciona |
|---|---|
| Conversa em streaming | Respostas ao vivo, com raciocínio, fontes e chamadas de ferramenta exibidas no chat |
| Pesquisa na web | Busca e leitura de páginas via FireCrawl, com fontes revalidadas na renderização |
| Geração de imagens | Tool calling real: o modelo anuncia `generate_image`, o agente executa e a imagem aparece na conversa |
| Leitura de anexos | PDF, DOCX, XLSX, CSV, PPTX, TXT e MD, com extração limitada e truncamento por etapa |
| Projetos e kanban | Organize conversas em projetos, arraste cards e passe uma tarefa direto para a Mare executar |
| Login com Google | OAuth com PKCE e sessão em cookies via Supabase, opcional no desenvolvimento local |
| Pet vivo | A égua pasta, come maçã, bebe água e reage ao mouse, com sons e celebrações |

<img src="docs/divisor-grama.png" width="160" alt="Grama em aquarela" />

## Como ela pensa

Cada resposta do agente passa por um orquestrador que decide o caminho. Ferramentas
coletam evidências, um escritor redige e um validador confere o resultado antes do
streaming para a interface.

> pedido -> roteamento de skills -> evidencias (web_search, read_page) -> plano do
> orquestrador -> escritor -> validacao e autocorrecao -> stream

### As 11 skills

| Skill | Papel |
|---|---|
| `tool-orchestrator` | Decide quando acionar busca e leitura de páginas |
| `deep-research` | Investigação com múltiplas fontes |
| `fact-checker` | Checagem de dados, datas e valores |
| `reasoning-planner` | Decomposição de problemas em passos |
| `coding-engineer` | Código revisado, com contexto da pergunta |
| `image-prompt-engineer` | Prompts de imagem bem escritos, sem recusa |
| `security-auditor` | Cuidado com dados sensíveis e segredos colados no chat |
| `self-correction` | Detecta e corrige o próprio esboço |
| `error-recovery` | Degrada com elegância quando um provedor falha |
| `response-quality` | Português claro, sem enrolação |
| `context-memory` | Continuidade entre mensagens da conversa |

O executor, o roteador de skills, o validador e a memória ficam em `mare-nimble/runtime`.
O teste do validador roda com `npm run test:nimble`.

## Stack

| Camada | O quê |
|---|---|
| Front-end | Next.js 16 (App Router), React 19, Tailwind CSS, Motion, Lucide e LobeHub icons |
| Back-end | Route Handlers Node.js com proxy de IA, chaves apenas no servidor |
| IA | Pollinations (GPT-5 Nano, GPT-OSS 20B e `mai-image-2.7-flash`) e Cerebras no pipeline |
| Dados | Supabase: Auth com Google via PKCE, Postgres com RLS e Storage para o estado |
| Ferramentas | FireCrawl, pdf-parse, mammoth, SheetJS, JSZip e Howler |

## Rodando localmente

No desenvolvimento com `npm run dev`, o login é opcional: a Mare conversa mesmo sem
Supabase configurado. São necessárias apenas as chaves de IA.

```bash
git clone https://github.com/mareworlddev/mare.git
cd mare
npm install
cp .env.example .env.local
```

Preencha as chaves em `.env.local` e inicie:

```bash
npm run dev
```

### Variáveis de ambiente

| Variável | Onde pegar | Pra quê |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Sua origem | Base do callback OAuth e links públicos |
| `POLLI_KEY` | Pollinations | Modelo principal e geração de imagens, apenas no servidor |
| `CEREBRAS_API_KEY` | Cerebras | Escritor e orquestrador do pipeline, apenas no servidor |
| `FIRE_CRAWLER_API_KEY` | FireCrawl | Busca e leitura de páginas, apenas no servidor |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase, Settings, API | Endereço do projeto |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase, Settings, API | Chave pública do navegador |

As chaves `NEXT_PUBLIC_*` chegam ao navegador por design. Nunca coloque segredos nelas.

### Ativando o banco no Supabase

No SQL Editor do seu projeto, rode as migrações nesta ordem:

| Ordem | Migration | Cria |
|---|---|---|
| 1 | `supabase/migrations/0001_tables.sql` | Tabelas `projects`, `tasks`, `chats` e `messages` |
| 2 | `supabase/migrations/0002_security.sql` | RLS, políticas, grants e rate limit por usuário |
| 3 | `supabase/migrations/0003_storage.sql` | Bucket privado `mare-state` para sincronia entre abas |

As migrações são idempotentes. Depois disso, ative o provider Google em Supabase Auth
e cadastre as URLs de callback. O guia completo está em `supabase/README.md`.

## Deploy na Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmareworlddev%2Fmare&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,POLLI_KEY,CEREBRAS_API_KEY,FIRE_CRAWLER_API_KEY,NEXT_PUBLIC_SITE_URL)

Em produção o login é obrigatório e o app opera em fail-closed: sem Supabase
configurado, o workspace redireciona para `/login` e as rotas de IA respondem erro
neutro. Nada fica aberto por acidente.

<img src="docs/divisor-grama.png" width="160" alt="Grama em aquarela" />

## Segurança

O projeto passou por três rodadas de auditoria adversária, sem vulnerabilidades
abertas ao final.

- RLS em todas as tabelas, com `auth.uid() = user_id` em leitura e escrita, além de `WITH CHECK` contra troca de dono e vínculo com projeto de terceiros
- Chaves de IA restritas ao servidor; o navegador fala apenas com as rotas do app, que validam a sessão com `getUser()` antes de contatar provedores
- Rate limit por usuário no Postgres, por função RPC atômica, com contadores separados para chat, anexos e sincronização
- Anexos com extensão validada, limite de 8 MB e tetos de materialização no parse de planilhas e slides
- CSP fechada, sem exfiltração por imagem em Markdown, sem `eval`, frames e snippets travados
- Cancelamento fim a fim: fechar a aba ou pressionar parar aborta as chamadas de IA
- Dependências auditadas com `npm audit` limpo, erros de provedor saneados e mensagens de UI sem detalhes internos

## Estrutura

```text
AgentMare/
├── src/
│   ├── app/
│   │   ├── api/mare/          # chat, anexos, imagem e estado
│   │   ├── auth/callback/     # troca PKCE do codigo OAuth
│   │   ├── login/             # tela de login
│   │   └── mare/              # workspace protegido
│   ├── components/Mare/       # UI do agente, do pet e do kanban
│   ├── lib/
│   │   ├── mare/              # agente, provedores, ferramentas e limites
│   │   ├── security/          # validacao de URLs
│   │   └── supabase/          # clientes e guardas de rota
│   └── proxy.ts               # protecao de rotas no servidor
├── mare-nimble/
│   ├── runtime/               # executor, roteador, validador e memoria
│   └── skills/                # as 11 skills da Mare
├── supabase/migrations/       # rode na ordem 1 a 3
└── docs/                      # arte deste README
```

## Mistral

A Mare foi construída com o Mistral Vibe, o agente de código da Mistral AI. O
crédito aparece nos badges acima e no rodapé abaixo, e reconhece a ferramenta que
ajudou a escrever e revisar este projeto.

A Mistral AI não é um provedor de inferência em runtime nesta versão: os modelos
que respondem na aplicação vêm de Pollinations e Cerebras, conforme a seção Stack.
A referência à Mistral é, portanto, de autoria e ferramenta de desenvolvimento.

## Contribuindo

Pull requests são bem-vindas. Antes de abrir uma, rode `npm run lint` e
`npm run test:nimble`. Para mudanças que envolvam banco, inclua ou ajuste a migration
correspondente em `supabase/migrations/` e atualize `supabase/README.md`.

<img src="docs/divisor-grama.png" width="205" alt="Tufo de grama em aquarela" />

<div align="center">

Mare, construída com aquarela e [Mistral Vibe](https://mistral.ai).

</div>
