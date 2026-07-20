-- Phase: スクレイパーのClaude APIコスト削減用カラム追加
-- Supabase Dashboard の SQL Editor で実行すること（オーナー作業）
-- 前提: supabase/schema.sql, supabase/migrations/003_admin.sql, 004_scraper_i18n.sql, 005_regions.sql が適用済みで events テーブルが存在すること
--
-- 背景: 従来のスクレイパーは毎回、全ソースの全イベントページをClaude API(抽出+翻訳)へ
-- 送信していたため、既存イベント(内容が変わっていない)の分まで不要なAPIコストが発生していた。
-- 元ページのテキストのSHA-256ハッシュを content_hash に保存しておき、次回実行時に
-- ハッシュが一致する(=ページ内容が変わっていない)行はClaude呼び出しをスキップする。
--
-- このカラムが無い状態でも scripts/scrape.ts / scripts/lib/db.ts は動作する
-- (フォールバックして従来どおり全件抽出する)。このmigrationを適用すると
-- 変更なしイベントの再抽出・再翻訳がスキップされ、日次のAPIコストが下がる。

alter table events add column if not exists content_hash text;
