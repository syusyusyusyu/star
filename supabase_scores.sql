-- Supabase scores table DDL
create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where c.relname = 'scores' and n.nspname = 'public') then
    create table public.scores (
      id uuid primary key default gen_random_uuid(),
      song_id text not null,
      mode text not null check (mode in ('cursor','body')),
      score integer not null,
      max_combo integer not null,
      rank text not null,
      created_at timestamptz default now()
    );
  end if;
end$$;

create index if not exists scores_song_mode_score_idx
  on public.scores (song_id, mode, score desc);
