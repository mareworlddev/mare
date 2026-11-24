-- ============================================================
-- Agente Mare · 0005 — pgvector: cache semântico e roteamento de skills
-- Rode no SQL Editor do Supabase (depois de 0001 a 0004).
-- Idempotente: rodar de novo não quebra nada.
-- ============================================================

create extension if not exists vector;

-- Uma tabela só para os três usos: 'qa' (cache), 'skill' (roteamento) e
-- 'note' (contexto de projeto, quando indexado). Cada linha pertence ao usuário.
create table if not exists public.mare_vector_memory (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  kind       text not null,
  ref_id     text not null,
  content    text not null,
  answer     text,
  model      text,
  skill      text,
  embedding  vector(256) not null,
  created_at timestamptz not null default now(),
  constraint mare_vector_kind check (kind in ('qa', 'skill', 'note')),
  constraint mare_vector_content check (char_length(content) <= 6000),
  constraint mare_vector_answer check (answer is null or char_length(answer) <= 60000)
);
create index if not exists mare_vector_by_user_kind on public.mare_vector_memory (user_id, kind);
-- HNSW existe no pgvector >= 0.5; em instalações antigas cai para IVFFlat.
do $$
begin
  if (select extversion from pg_extension where extname = 'vector') >= '0.5.0' then
    create index if not exists mare_vector_embedding
      on public.mare_vector_memory using hnsw (embedding vector_cosine_ops);
  else
    create index if not exists mare_vector_embedding
      on public.mare_vector_memory using ivfflat (embedding vector_cosine_ops) with (lists = 100);
  end if;
end $$;

drop trigger if exists mare_vector_forge_user on public.mare_vector_memory;
create trigger mare_vector_forge_user before insert on public.mare_vector_memory
  for each row execute function public.forge_user_id();
drop trigger if exists mare_vector_protect_user on public.mare_vector_memory;
create trigger mare_vector_protect_user before update on public.mare_vector_memory
  for each row execute function public.protect_user_id();

revoke all on public.mare_vector_memory from anon, authenticated;
grant select, insert, delete on public.mare_vector_memory to authenticated;

alter table public.mare_vector_memory enable row level security;
alter table public.mare_vector_memory force row level security;

drop policy if exists mare_vector_owner on public.mare_vector_memory;
create policy mare_vector_owner on public.mare_vector_memory
  for all to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (project_id is null or exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    ))
  );

-- Busca por similaridade. security INVOKER: a RLS acima já limita ao próprio
-- usuário, então nenhuma linha de outra conta entra no resultado.
create or replace function public.match_mare_vectors(
  query_embedding vector(256),
  match_count integer default 8,
  min_similarity double precision default 0.0,
  kinds text[] default null,
  project_filter uuid default null
)
returns table (
  id uuid,
  kind text,
  ref_id text,
  project_id uuid,
  content text,
  answer text,
  model text,
  skill text,
  similarity double precision
)
language sql stable
set search_path = public, pg_catalog
as $$
  select v.id, v.kind, v.ref_id, v.project_id, v.content, v.answer, v.model, v.skill,
         1 - (v.embedding <=> query_embedding) as similarity
  from public.mare_vector_memory v
  where v.user_id = auth.uid()
    and (kinds is null or v.kind = any(kinds))
    and (project_filter is null or v.project_id = project_filter)
    and 1 - (v.embedding <=> query_embedding) >= min_similarity
  order by v.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 20);
$$;

revoke all on function public.match_mare_vectors(vector, integer, double precision, text[], uuid) from anon, public;
grant execute on function public.match_mare_vectors(vector, integer, double precision, text[], uuid) to authenticated;
