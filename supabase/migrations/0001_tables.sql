-- ============================================================
-- Agente Mare · 0001 — tabelas (rode no SQL Editor do Supabase)
-- Idempotente: rodar de novo não quebra nada.
-- Sem SQL dinâmico nem EXECUTE — tudo estático e parametrizado (anti-injection).
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- projects: projetos do usuário (kanban + contexto dos chats).
-- Nome único POR DONO: dois projetos do mesmo usuário nunca partilham nome
-- (índice em (user_id, name)); de fora, ninguém enumera nomes de terceiros.
-- ------------------------------------------------------------
create table if not exists public.projects (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_name_shape check (char_length(btrim(name)) between 1 and 80)
);
-- Nome único por dono, já sem espaços de borda (o app trima; o banco garante):
create unique index if not exists projects_owner_name
  on public.projects (user_id, btrim(name));

-- ------------------------------------------------------------
-- tasks: cards do kanban de um projeto
-- ------------------------------------------------------------
create table if not exists public.tasks (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  title      text not null,
  details    text,
  status     text not null default 'backlog',
  position   double precision not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_title_shape check (char_length(btrim(title)) between 1 and 200),
  constraint tasks_details_limited check (details is null or char_length(details) <= 4000),
  constraint tasks_status_valid check (status in ('backlog', 'todo', 'doing', 'done'))
);
create index if not exists tasks_by_project on public.tasks (project_id, position);
create index if not exists tasks_by_user on public.tasks (user_id);

-- ------------------------------------------------------------
-- chats: espelho durável das conversas do workspace
-- ------------------------------------------------------------
create table if not exists public.chats (
  id         uuid primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  title      text not null default 'Nova conversa',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chats_title_shape check (char_length(title) between 1 and 200)
);
create index if not exists chats_by_user on public.chats (user_id, updated_at desc);

-- ------------------------------------------------------------
-- messages: mensagens de um chat. PK composta (chat_id, id): o id da mensagem
-- é escolhido pelo app; agrupado por chat, quem adivinha? só o dono do chat.
-- ------------------------------------------------------------
create table if not exists public.messages (
  id         text not null,
  chat_id    uuid not null references public.chats (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null,
  content    text not null,
  created_at timestamptz not null default now(),
  constraint messages_pk primary key (chat_id, id),
  constraint messages_id_shape check (char_length(id) between 4 and 64),
  constraint messages_role_valid check (role in ('user', 'assistant')),
  constraint messages_content_limited check (char_length(content) <= 60000)
);
create index if not exists messages_by_chat on public.messages (chat_id, created_at);

-- ------------------------------------------------------------
-- ai_rate_limits: contador de gasto por usuário (só o servidor consulta)
-- ------------------------------------------------------------
create table if not exists public.ai_rate_limits (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  window_start timestamptz not null default now(),
  hit_count    integer not null default 0
);

-- ------------------------------------------------------------
-- Triggers: user_id vem da sessão (nunca do payload) e não muda depois.
-- created_at/updated_at ficam fora das Grants de coluna (0002), logo só o
-- banco define; aqui garantimos o mesmo por trigger também.
-- ------------------------------------------------------------
create or replace function public.forge_user_id()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id is distinct from auth.uid() then
    new.user_id := auth.uid();  -- nada de inserir em nome de terceiro
  end if;
  if new.user_id is null then
    raise exception 'Sessão Supabase ausente' using errcode = '28000';
  end if;
  return new;
end $$;

create or replace function public.protect_user_id()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'user_id é imutável' using errcode = 'insufficient_privilege';
  end if;
  return new;
end $$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- projects
drop trigger if exists projects_forge_user on public.projects;
create trigger projects_forge_user before insert on public.projects
  for each row execute function public.forge_user_id();
drop trigger if exists projects_protect_user on public.projects;
create trigger projects_protect_user before update on public.projects
  for each row execute function public.protect_user_id();
drop trigger if exists projects_touch_updated on public.projects;
create trigger projects_touch_updated before update on public.projects
  for each row execute function public.touch_updated_at();

-- tasks
drop trigger if exists tasks_forge_user on public.tasks;
create trigger tasks_forge_user before insert on public.tasks
  for each row execute function public.forge_user_id();
drop trigger if exists tasks_protect_user on public.tasks;
create trigger tasks_protect_user before update on public.tasks
  for each row execute function public.protect_user_id();
drop trigger if exists tasks_touch_updated on public.tasks;
create trigger tasks_touch_updated before update on public.tasks
  for each row execute function public.touch_updated_at();

-- chats
drop trigger if exists chats_forge_user on public.chats;
create trigger chats_forge_user before insert on public.chats
  for each row execute function public.forge_user_id();
drop trigger if exists chats_protect_user on public.chats;
create trigger chats_protect_user before update on public.chats
  for each row execute function public.protect_user_id();
drop trigger if exists chats_touch_updated on public.chats;
create trigger chats_touch_updated before update on public.chats
  for each row execute function public.touch_updated_at();

-- messages
drop trigger if exists messages_forge_user on public.messages;
create trigger messages_forge_user before insert on public.messages
  for each row execute function public.forge_user_id();
drop trigger if exists messages_protect_user on public.messages;
create trigger messages_protect_user before update on public.messages
  for each row execute function public.protect_user_id();
