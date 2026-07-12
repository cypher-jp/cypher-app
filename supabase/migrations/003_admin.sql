-- Phase 2: 管理画面用のRLSポリシー追加 + Storageバケット `flyers` のセットアップ
-- Supabase Dashboard の SQL Editor で実行すること（オーナー作業）
-- 前提: supabase/schema.sql が適用済みで events テーブルが存在すること

-- 1. authenticated ユーザー(管理画面にログインしたオーナー)は
--    status に関係なく全イベントを閲覧できるようにする。
--    (既存の "Public can read published events" ポリシーは維持し、anonユーザーは引き続き published のみ)
drop policy if exists "Authenticated can select all" on events;
create policy "Authenticated can select all"
  on events for select
  to authenticated
  using (true);

-- 2. フライヤー画像用の Storage バケット `flyers` を作成(public read / authenticated write)
insert into storage.buckets (id, name, public)
values ('flyers', 'flyers', true)
on conflict (id) do nothing;

-- 誰でも閲覧可能(公開サイトの<img>/<Image>から直接参照するため)
drop policy if exists "Public can read flyers" on storage.objects;
create policy "Public can read flyers"
  on storage.objects for select
  to public
  using (bucket_id = 'flyers');

-- ログイン済みユーザーのみアップロード可能
drop policy if exists "Authenticated can upload flyers" on storage.objects;
create policy "Authenticated can upload flyers"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'flyers');

-- ログイン済みユーザーのみ更新可能(フライヤー差し替え用)
drop policy if exists "Authenticated can update flyers" on storage.objects;
create policy "Authenticated can update flyers"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'flyers');

-- ログイン済みユーザーのみ削除可能
drop policy if exists "Authenticated can delete flyers" on storage.objects;
create policy "Authenticated can delete flyers"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'flyers');
