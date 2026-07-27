-- 009: 記事・ニュース機能 (docs/ARTICLES_PLAN.md 参照)
-- SEO記事でイベント/収益導線へクロスセルするための articles テーブル。
-- 運用: AIが下書き → adminで編集 → status='published' で公開(eventsと同じ承認型)。

create table if not exists articles (
  id                uuid primary key default gen_random_uuid(),
  slug              text unique not null,          -- URL用 (例: first-battle-guide)
  type              text not null default 'howto', -- howto / preview / gear / report
  title             text not null,
  body_md           text not null default '',      -- Markdown本文(日本語)
  hero_image_url    text,                          -- flyersバケット or 外部URL
  related_event_ids uuid[] not null default '{}',  -- 関連イベント(相互リンク枠)
  status            text not null default 'draft', -- draft / published
  published_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists articles_status_idx on articles (status);
create index if not exists articles_published_at_idx on articles (published_at desc);

-- Row Level Security: 公開記事だけ全員が読める(eventsと同じ方針)
alter table articles enable row level security;

drop policy if exists "Public can read published articles" on articles;
create policy "Public can read published articles"
  on articles for select
  using (status = 'published');

drop policy if exists "Authenticated can select all articles" on articles;
create policy "Authenticated can select all articles"
  on articles for select
  to authenticated
  using (true);

drop policy if exists "Authenticated can insert articles" on articles;
create policy "Authenticated can insert articles"
  on articles for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated can update articles" on articles;
create policy "Authenticated can update articles"
  on articles for update
  to authenticated
  using (true);
