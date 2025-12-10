-- Supabase スコアテーブル定義
-- pgcrypto拡張機能を作成（UUID生成用）
create extension if not exists "pgcrypto";

-- 既存のscoresテーブルがあれば削除
drop table if exists public.scores cascade;

create table public.scores (
  id uuid primary key default gen_random_uuid(),
  session_id text not null default gen_random_uuid()::text,      -- 匿名セッションID (Cookie)
  song_id text not null,
  mode text not null default 'cursor' check (mode in ('cursor', 'body', 'mobile', 'hand')),
  score integer not null,
  max_combo integer not null,
  rank text not null,
  accuracy numeric(5,2),
  is_suspicious boolean default false,
  player_name text,
  created_at timestamptz default now()
);

-- インデックスを作成（曲ID、モード、スコアの降順）
create index if not exists scores_song_mode_score_idx
  on public.scores (song_id, mode, score desc);

