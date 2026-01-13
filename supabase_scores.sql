-- Supabase スコアテーブル定義
-- pgcrypto拡張機能を作成（UUID生成用）
create extension if not exists "pgcrypto";

-- 既存のscoresテーブルがあれば削除
drop table if exists public.scores cascade;

create table public.scores (
  id uuid primary key default gen_random_uuid(),
  session_id text not null default gen_random_uuid()::text,      -- 匿名セッションID (Cookie)
  song_id text not null,
  mode text not null default 'cursor' check (mode in ('cursor', 'body', 'mobile', 'hand', 'face')),
  score integer not null,
  max_combo integer not null,
  rank text not null,
  accuracy numeric(5,2),
  is_suspicious boolean default false,
  player_name text,
  idempotency_key text,              -- 重複投稿防止キー（Workersが付与）
  created_at timestamptz default now()
);

-- インデックスを作成（曲ID、モード、スコアの降順）
create index if not exists scores_song_mode_score_idx
  on public.scores (song_id, mode, score desc);

-- 重複投稿防止（NULLは許容、値がある場合のみ一意）
create unique index if not exists scores_idempotency_key_uidx
  on public.scores (idempotency_key);

-- Row Level Security (RLS)
alter table public.scores enable row level security;

-- Public read: only non-suspicious scores are visible.
create policy "public_read_scores"
  on public.scores
  for select
  using (is_suspicious = false);

-- No insert/update/delete policies for anon => direct writes via anon key are blocked.

create policy "public_insert_scores"
  on public.scores
  for insert
  with check (
    score >= 0 and score <= 1000000
    and max_combo >= 0
    and mode in ('cursor', 'body', 'mobile', 'hand', 'face')
  );

