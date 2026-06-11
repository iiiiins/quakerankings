-- Quake Player Rankings — admin write policies (feature 3).
-- Run once in the Supabase SQL editor (Dashboard -> SQL Editor -> paste -> Run).
-- Idempotent: safe to re-run.
--
-- Model: SELECT stays public; INSERT/UPDATE/DELETE require the authenticated
-- role AND the single admin uid (defense-in-depth on top of disabled signups).
-- Grants are restated defensively — RLS is the real gate.
--
-- The DO block drops EVERY existing policy on the table first: the 2026-06-11
-- probe found a legacy policy already allowing any authenticated user to
-- INSERT — permissive policies OR together, so it would defeat the uid scope
-- if left in place. The four policies below are the complete intended set.

alter table public."Tournaments" enable row level security;

grant select on public."Tournaments" to anon;
grant select, insert, update, delete on public."Tournaments" to authenticated;

do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'Tournaments'
  loop
    execute format('drop policy %I on public."Tournaments"', pol.policyname);
  end loop;
end $$;

create policy "public read" on public."Tournaments"
  for select to anon, authenticated using (true);

create policy "admin insert" on public."Tournaments"
  for insert to authenticated with check (auth.uid() = 'bcbf6194-e890-489c-b0a0-1f329507651e');

create policy "admin update" on public."Tournaments"
  for update to authenticated
  using (auth.uid() = 'bcbf6194-e890-489c-b0a0-1f329507651e') with check (auth.uid() = 'bcbf6194-e890-489c-b0a0-1f329507651e');

create policy "admin delete" on public."Tournaments"
  for delete to authenticated using (auth.uid() = 'bcbf6194-e890-489c-b0a0-1f329507651e');
