-- Phase 3: スクレイピング自動収集 + 5言語自動翻訳 用のカラム追加
-- Supabase Dashboard の SQL Editor で実行すること（オーナー作業）
-- 前提: supabase/schema.sql, supabase/migrations/003_admin.sql が適用済みで events テーブルが存在すること

-- 1. スクレイピング元の個別イベントページURL。重複投入防止の一意キーとして使う。
alter table events add column if not exists source_url text;

-- 2. 最終更新日時。スクレイパー/翻訳バッチが行を更新するたびに更新する。
alter table events add column if not exists updated_at timestamptz not null default now();

-- 3. 自動翻訳結果(en/ko/zh/fr)。原文(日本語)は既存の description カラムのまま。
--    形式: {"en": "...", "ko": "...", "zh": "...", "fr": "..."}（キーは翻訳が存在する言語のみ）
alter table events add column if not exists description_i18n jsonb;

-- 4. source_url の重複投入防止(source_url が入っている行のみ対象。手動登録行は対象外)
create unique index if not exists events_source_url_key on events (source_url) where source_url is not null;
