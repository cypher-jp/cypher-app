-- T1: 地域を「地方ブロック」区分に再設計する既存データ移行
-- Supabase Dashboard の SQL Editor で実行すること（オーナー作業）
-- 前提: supabase/schema.sql, supabase/migrations/003_admin.sql, 004_scraper_i18n.sql が適用済みで events テーブルが存在すること
--
-- 背景: 従来の region は都市単位(tokyo/osaka/nagoya/fukuoka/sapporo/okinawa)で粗く、
-- 神奈川開催が「東京」と誤分類される等の問題があった。
-- 新しい region は都道府県をまとめた地方ブロック単位(hokkaido/tohoku/kanto/hokuriku/tokai/kansai/
-- chugoku/shikoku/kyushu/online/korea/taiwan/asia/us/eu/other)に変更する。
-- 新しい enum の詳細は docs/STATUS_AND_NEXT.md の T1、src/types/event.ts の Region 型を参照。
--
-- korea/taiwan/us/eu/other は既存値のままキー変更が無いため対象外。

update events set region = 'kanto'    where region = 'tokyo';
update events set region = 'kansai'   where region = 'osaka';
update events set region = 'tokai'    where region = 'nagoya';
update events set region = 'kyushu'   where region = 'fukuoka';
update events set region = 'hokkaido' where region = 'sapporo';
update events set region = 'kyushu'   where region = 'okinawa';
