-- 007: エントリー受付終了フラグ
-- 管理画面の「締め切りました」ボタンで手動セットする。
-- true のイベントはトップページの「締切まで7日以内」枠から除外され、
-- イベント詳細ページの締切欄が「エントリー受付終了」表示になる。
alter table events add column if not exists entry_closed boolean not null default false;
