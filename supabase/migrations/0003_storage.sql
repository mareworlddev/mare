-- ============================================================
-- Agente Mare · 0003 — storage do estado sincronizado (Supabase)
-- Rode TODO este arquivo, na ordem, no SQL Editor do Supabase.
-- ============================================================

-- ------------------------------------------------------------
-- Bucket PRIVADO (sem URL pública): cada usuário só toca no próprio
-- arquivo de estado, caminho exato `state/<auth.uid()>.json`.
-- A rota /api/mare/state usa o token do usuário — a política abaixo
-- é o que impede ler/escrever o estado de outra pessoa.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('mare-state', 'mare-state', false)
on conflict (id) do nothing;

-- anon: nada (sem grant, sem política, mesmo que exista futuramente).
revoke all on storage.objects from anon;

grant select on storage.objects to authenticated;
grant insert, update, delete on storage.objects to authenticated;

-- Uma política só, para tudo, com caminho EXATO por usuário:
-- nem listagem de pasta, nem arquivo vizinho escapam dela.
drop policy if exists "mare_state_owner_all" on storage.objects;
create policy "mare_state_owner_all" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'mare-state'
    and name = 'state/' || auth.uid()::text || '.json'
  )
  with check (
    bucket_id = 'mare-state'
    and name = 'state/' || auth.uid()::text || '.json'
  );

-- Nota: deletar a conta não apaga o objeto (o caminho só embute o uid), mas
-- ele fica inacessível para sempre — sem leitor, sem política, sem URL.
