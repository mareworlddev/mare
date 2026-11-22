-- ============================================================
-- Agente Mare · 0002 — blindagem (RLS, grants, rate limit RPC)
-- Rode TODO este arquivo, na ordem, no SQL Editor do Supabase.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Papéis: nada para anônimos; ao authenticated, só as colunas inofensivas.
--    user_id e created_at/updated_at ficam FORA dos grants de escrita: o
--    cliente não escolhe dono (trigger do 0001 define) nem histórico.
-- ------------------------------------------------------------
revoke all on public.projects, public.tasks, public.chats, public.messages, public.ai_rate_limits
  from anon, authenticated;

grant select on public.projects, public.tasks, public.chats, public.messages to authenticated;

grant insert (id, name)                    on public.projects to authenticated;
grant update (name)                        on public.projects to authenticated;
grant delete                               on public.projects to authenticated;

grant insert (id, project_id, title, details, status, position) on public.tasks to authenticated;
grant update (title, details, status, position)                 on public.tasks to authenticated;
grant delete                                                    on public.tasks to authenticated;

grant insert (id, project_id, title)       on public.chats to authenticated;
-- `id` entra no update por causa do upsert do espelho (DO UPDATE SET id=…):
-- trocá-lo só afeta a própria linha (RLS prende a linha, trigger prende o
-- user_id e a PK conflita com as messages referenciadas — sem risco cruzado).
grant update (id, title, project_id)       on public.chats to authenticated;
grant delete                               on public.chats to authenticated;

grant insert (id, chat_id, role, content)  on public.messages to authenticated;
grant delete                               on public.messages to authenticated;

-- ai_rate_limits: nenhum grant para clientes. O RPC abaixo é security definer
-- e acessa a tabela em nome do dono da função — o usuário autenticado não
-- consegue ler, zerar ou inflar o contador por conta própria.

-- ------------------------------------------------------------
-- 2. RLS ativo (e forçado, cobrindo até o dono da tabela)
-- ------------------------------------------------------------
alter table public.projects  enable row level security;
alter table public.projects  force  row level security;
alter table public.tasks     enable row level security;
alter table public.tasks     force  row level security;
alter table public.chats     enable row level security;
alter table public.chats     force  row level security;
alter table public.messages  enable row level security;
alter table public.messages  force  row level security;
alter table public.ai_rate_limits enable row level security;
-- ai_rate_limits: enable SEM force — o FORCE submeteria o dono (postgres) às
-- políticas e, sem política nenhuma, o SECURITY DEFINER check_rate_limit
-- falharia ("violates row-level security policy"). Clientes seguem negados:
-- zero grants + RLS sem políticas para anon/authenticated.

-- ------------------------------------------------------------
-- 3. Políticas: auth.uid() = user_id em USING (o que você vê) e em WITH
--    CHECK (o que você escreve). Onde há relacionamento, a política valida o
--    dono do objeto-pai — anti-IDOR (atribuir tarefa/chat a projeto alheio).
-- ------------------------------------------------------------
drop policy if exists projects_owner on public.projects;
create policy projects_owner on public.projects
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists tasks_owner on public.tasks;
create policy tasks_owner on public.tasks
  for all to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  );

drop policy if exists chats_owner on public.chats;
create policy chats_owner on public.chats
  for all to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      project_id is null
      or exists (
        select 1 from public.projects p
        where p.id = project_id and p.user_id = auth.uid()
      )
    )
  );

drop policy if exists messages_owner on public.messages;
create policy messages_owner on public.messages
  for all to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.chats c
      where c.id = chat_id and c.user_id = auth.uid()
    )
  );

-- ai_rate_limits: nenhuma política para clientes; o definer não passa por RLS.

-- ------------------------------------------------------------
-- 4. Rate limit por usuário: monotônico no banco, sem SQL dinâmico.
--    A chamada sai do servidor com o PRÓPRIO token do usuário (publishable
--    key + cookies via @supabase/ssr) — o PostgREST executa como role
--    `authenticated`, então EXECUTE tem que existir para authenticated.
--    Os limites MORAM AQUI DENTRO (sem parâmetros): um cliente que chame a
--    RPC direto nunca pode inflar o teto ou encurtar a própria janela.
--    Chamada direta só queima o próprio contador — inofensiva.
-- ------------------------------------------------------------
create or replace function public.check_rate_limit()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_allowed boolean;
  v_max     integer  := 30;                     -- chamadas de IA
  v_window  interval := interval '5 minutes';  -- por janela
begin
  insert into public.ai_rate_limits as r (user_id, window_start, hit_count)
  values (auth.uid(), now(), 1)
  on conflict (user_id) do update
    set window_start = case
          when r.window_start < now() - v_window then now()
          else r.window_start
        end,
        hit_count   = case
          when r.window_start < now() - v_window then 1
          else r.hit_count + 1
        end
  returning hit_count <= v_max
  into v_allowed;

  return v_allowed;
end $$;

revoke all on function public.check_rate_limit()
  from anon, public;
grant execute on function public.check_rate_limit()
  to authenticated;
