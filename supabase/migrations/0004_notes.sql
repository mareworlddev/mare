-- ============================================================
-- Agente Mare · 0004 — notas/lembretes por projeto
-- Rode no SQL Editor do Supabase (depois de 0001, 0002 e 0003).
-- Idempotente: rodar de novo não quebra nada.
-- ============================================================

create table if not exists public.project_notes (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now(),
  constraint project_notes_content check (char_length(btrim(content)) between 1 and 2000)
);
create index if not exists project_notes_by_project on public.project_notes (project_id, created_at desc);
create index if not exists project_notes_by_user on public.project_notes (user_id);

-- Mesmo padrão das tabelas antigas: dono vem da sessão e é imutável.
drop trigger if exists project_notes_forge_user on public.project_notes;
create trigger project_notes_forge_user before insert on public.project_notes
  for each row execute function public.forge_user_id();
drop trigger if exists project_notes_protect_user on public.project_notes;
create trigger project_notes_protect_user before update on public.project_notes
  for each row execute function public.protect_user_id();

revoke all on public.project_notes from anon, authenticated;
grant select on public.project_notes to authenticated;
grant insert (id, project_id, content) on public.project_notes to authenticated;
grant delete on public.project_notes to authenticated;

alter table public.project_notes enable row level security;
alter table public.project_notes force row level security;

drop policy if exists project_notes_owner on public.project_notes;
create policy project_notes_owner on public.project_notes
  for all to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  );
