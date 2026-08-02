-- お問い合わせフォーム(/contact)
-- 誰でも送信でき、閲覧・既読管理はログイン済み管理者のみ。
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'other',
  name text not null default '',
  email text not null default '',
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table contacts enable row level security;

drop policy if exists "contacts_insert_public" on contacts;
create policy "contacts_insert_public" on contacts
  for insert to anon, authenticated
  with check (true);

drop policy if exists "contacts_select_admin" on contacts;
create policy "contacts_select_admin" on contacts
  for select to authenticated
  using (true);

drop policy if exists "contacts_update_admin" on contacts;
create policy "contacts_update_admin" on contacts
  for update to authenticated
  using (true)
  with check (true);
