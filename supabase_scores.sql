-- Supabase scores table DDL
create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where c.relname = 'scores' and n.nspname = 'public') then
    create table public.scores (
      id uuid primary key default gen_random_uuid(),
      song_id text not null,
      mode text not null,
      score integer not null,
      max_combo integer not null,
      rank text not null,
      player_name text,
      created_at timestamptz default now()
    );
  end if;

  -- Add columns if they don't exist (for existing tables)
  if not exists (select 1 from information_schema.columns where table_name = 'scores' and column_name = 'player_name') then
    alter table public.scores add column player_name text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'scores' and column_name = 'mode') then
    alter table public.scores add column mode text not null default 'cursor';
  end if;

  -- Remove unused columns if they exist
  if exists (select 1 from information_schema.columns where table_name = 'scores' and column_name = 'perfect') then
    alter table public.scores drop column perfect;
  end if;
  if exists (select 1 from information_schema.columns where table_name = 'scores' and column_name = 'great') then
    alter table public.scores drop column great;
  end if;
  if exists (select 1 from information_schema.columns where table_name = 'scores' and column_name = 'good') then
    alter table public.scores drop column good;
  end if;
  if exists (select 1 from information_schema.columns where table_name = 'scores' and column_name = 'miss') then
    alter table public.scores drop column miss;
  end if;
end$$;

create index if not exists scores_song_mode_score_idx
  on public.scores (song_id, mode, score desc);
