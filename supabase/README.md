# Supabase do Agente Mare — setup do zero

Nada existe ainda no Supabase, então este guia parte do zero. Siga na ordem;
o código já está pronto para funcionar quando terminar.

## 1. Criar o projeto e o schema

1. Crie um projeto em [supabase.com](https://supabase.com) (região São Paulo fica boa para o Brasil).
2. Abra **SQL Editor** e rode, **nesta ordem**:
   1. `supabase/migrations/0001_tables.sql` — tabelas, índices e triggers (dono forçado/imutável).
   2. `supabase/migrations/0002_security.sql` — RLS, grants por coluna, revogação de `anon` e o RPC `check_rate_limit`.
   3. `supabase/migrations/0003_storage.sql` — bucket privado `mare-state` (histórico sincronizado) com política de caminho exato por usuário.
3. Confirme no **Table Editor**: `projects`, `tasks`, `chats`, `messages`, `ai_rate_limits` — e em **Storage**: o bucket `mare-state`.

As migrações são idempotentes: rodar de novo não quebra.

## 2. Login com Google

1. [Console do Google Cloud](https://console.cloud.google.com) → APIs & Services → **Credentials** → *Create OAuth client ID* (Web application):
   - **Authorized JavaScript origins**: `http://localhost:3000` e a URL de produção (ex.: `https://seu-mare.vercel.app`).
2. No Supabase → **Authentication → Providers → Google**: ative e cole *Client ID* e *Client Secret*.
3. **Authentication → URL Configuration**:
   - **Site URL**: `http://localhost:3000` (ou produção).
   - **Redirect URLs**: `http://localhost:3000/auth/callback` e `https://SEU-APP.vercel.app/auth/callback`.

O fluxo é PKCE: `signInWithOAuth` → Google → `/auth/callback` troca o código pela
sessão e grava cookies assinados. Se o usuário cancelar na janela do Google,
 `/auth/callback` devolve para `/login?error=oauth_canceled`.

## 3. Variáveis de ambiente

Copie `.env.example` → `.env.local` e preencha:

```
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_... (ou a anon key antiga)
```

Na **Vercel**, cadastre as mesmas chaves do `.env.example` (Supabase e IA)
em *Project → Settings → Environment Variables*. Não há chaves de storage
nem de nuvem extra: os arquivos (histórico sincronizado) ficam no bucket
privado `mare-state` do próprio Supabase, criado por `0003_storage.sql`.

> A publishable key é pública por design. O que protege os dados é a **RLS**;
> quem tentar bater na API direto (PostgREST ou Storage) esbarra nas políticas.

## 4. O que a blindagem faz (checklist de segurança)

| Camada | O quê |
|---|---|
| RLS + `force` | `projects`, `tasks`, `chats`, `messages` sob `auth.uid() = user_id` em `USING` (leitura) **e** `WITH CHECK` (escrita). `ai_rate_limits` é só `enable` (sem `force`): o dono da tabela precisa passar para o `check_rate_limit` SECURITY DEFINER funcionar; clientes seguem negados (zero grants) |
| IDOR | `WITH CHECK` valida o dono do pai: tarefa→projeto, mensagem→chat, chat→projeto |
| Imutabilidade | `user_id` sai da sessão via trigger (insert) e trava no update; `created_at/updated_at` fora dos grants |
| `anon` | `REVOKE ALL` nas tabelas; grants por coluna para `authenticated` |
| `auth.users` | Nunca exposta (sem views/RPC); nome/e-mail só vêm da sessão (`auth.getUser()`) |
| Rate limit | `check_rate_limit()`: SECURITY DEFINER, `EXECUTE` só para `authenticated` (a chamada do servidor viaja com o próprio token do usuário) e **limites fixos dentro da função** (30 chamadas de IA / 5 min) — nenhum cliente infla o próprio teto; `auth.uid()` prende a linha |
| SQL injection | Sem SQL dinâmico: migrações estáticas e sem SQL dinâmico; rate limit com valores fixos (sem parâmetros do chamador) |
| Teto de payload | 500k caracteres/histórico, 24k/mensagem, 2 MB/corpo, 8 MB/anexo |
| XSS | `react-markdown` **sem** `rehype-raw`: HTML cru é escapado; URLs de fontes revalidadas na renderização |
| Storage | Bucket `mare-state` **privado**, política com caminho exato `state/<auth.uid()>.json` avaliada com o token do usuário — nem listagem de pasta escapa |

### Como conferir

No SQL Editor, como `postgres`, simule o anon:

```sql
set role anon;
select * from public.projects;  -- GRANT negado para anon — esperado
reset role;
```

No app logado: um usuário logado não vê projeto de outro; alterar `user_id`
via API direta falha (coluna sem grant + trigger + políticas).

## 5. Vercel (e produção em geral)

- Deploy padrão do Next.js (rota do chat já usa `maxDuration` adequado).
- **Fail-closed**: em produção (Vercel ou qualquer `next start` com
  `NODE_ENV=production`) sem Supabase configurado, as rotas de IA/estado
  respondem 503 — nunca um proxy aberto. No desenvolvimento local
  (`npm run dev`), o login é **opcional**: a Mare funciona no modo legado
  (localStorage), e as rotas não exigem sessão.
- Usuário deslogado acessando `/mare` é mandado para `/login` (proxy do Next 16,
  arquivo `src/proxy.ts`, substitui o `middleware.ts`) — apenas em produção.
- **CSP** no `next.config.ts`: `default-src 'self'`, scripts só da própria
  origem (inline liberado porque o Next hidrata sem nonce), `connect-src` para
  o `*.supabase.co`, `object-src 'none'`, `frame-ancestors 'none'`, além de
  nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy e HSTS.
