-- CYPHER: events テーブル
-- Supabase SQL Editor にコピペして実行する

create table if not exists events (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  type         text not null,                 -- battle / showcase / workshop / audition / festival
  genre        text not null default 'all',
  region       text not null default 'other',
  date         date not null,
  deadline     date,
  venue        text not null default '',
  description  text not null default '',
  flyer_url    text,
  ig_handle    text,
  ig_post_url  text,
  entry_url    text,
  status       text not null default 'pending', -- pending / published / draft
  source       text,
  created_at   timestamptz not null default now()
);

-- 検索用インデックス
create index if not exists events_date_idx       on events (date);
create index if not exists events_type_idx       on events (type);
create index if not exists events_genre_idx      on events (genre);
create index if not exists events_region_idx     on events (region);
create index if not exists events_status_idx     on events (status);

-- Row Level Security: 公開イベントだけ全員が読める
alter table events enable row level security;

drop policy if exists "Public can read published events" on events;
create policy "Public can read published events"
  on events for select
  using (status = 'published');

-- 編集系は authenticated のみ（後で管理画面を作るとき用）
drop policy if exists "Authenticated can insert" on events;
create policy "Authenticated can insert"
  on events for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated can update" on events;
create policy "Authenticated can update"
  on events for update
  to authenticated
  using (true);
