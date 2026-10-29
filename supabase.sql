-- Little Lot: one cloud save per account.
-- Paste this into the Supabase dashboard: SQL Editor > New query > Run.

create table if not exists public.saves (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  lifetime   double precision not null default 0,   -- total money ever earned, used to keep the most-progressed copy
  data       jsonb not null,                          -- the full game save
  updated_at timestamptz not null default now()
);

-- Row level security: a signed-in player can only see and change their own row.
alter table public.saves enable row level security;

create policy "read own save"   on public.saves for select to authenticated using (auth.uid() = user_id);
create policy "create own save" on public.saves for insert to authenticated with check (auth.uid() = user_id);
create policy "update own save" on public.saves for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
