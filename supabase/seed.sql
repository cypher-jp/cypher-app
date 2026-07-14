-- CYPHER: テストデータ投入
-- schema.sql を実行した後、必要ならこのファイルもRUN
-- region は地方ブロック区分（T1: docs/STATUS_AND_NEXT.md 参照）。tokyo→kanto, osaka→kansai。

insert into events (title, type, genre, region, date, deadline, venue, description, flyer_url, ig_handle, ig_post_url, entry_url, status) values
  ('BATTLE OF TOKYO 2026', 'battle', 'all', 'kanto', '2026-06-14', '2026-06-01',
   'TOKYO DOME CITY HALL',
   '国内最大級の1on1オールスタイルバトル。世界各国からトップダンサーが集結。優勝賞金100万円。',
   'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=1200&q=80',
   'battle_of_tokyo', 'https://instagram.com/battle_of_tokyo', 'https://example.com/bot2026',
   'published'),

  ('HOUSE NIGHT OSAKA', 'battle', 'house', 'kansai', '2026-05-23', '2026-05-15',
   '梅田CLUB QUATTRO',
   '関西最大規模のHouseバトルイベント。3on3クルーバトル形式。',
   'https://images.unsplash.com/photo-1571266028243-d220c6a1d2dc?w=1200&q=80',
   'house_night_osaka', 'https://instagram.com/p/example1', null,
   'published'),

  ('POPPING WORLD CUP — JAPAN QUALIFIER', 'battle', 'popping', 'kanto', '2026-07-05', null,
   '新木場STUDIO COAST',
   'Popping World Cupの日本予選。優勝者は本戦（パリ）への切符を獲得。',
   'https://images.unsplash.com/photo-1547347298-4074fc3086f0?w=1200&q=80',
   'pwc_japan', null, 'https://example.com/pwc-jp',
   'published'),

  ('BREAKIN'' SEOUL CIRCLE', 'battle', 'breaking', 'korea', '2026-06-28', null,
   '서울 홍대 클럽',
   '韓国最大のBreakingイベント。日本からの参加も多数。',
   'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=1200&q=80',
   'breakin_seoul', null, null,
   'published'),

  ('LOCKING LEGENDS — TOKYO', 'showcase', 'locking', 'kanto', '2026-08-10', null,
   '中野サンプラザ',
   '国内外のLocking第一線ダンサーによる完全招待制ショーケース。',
   'https://images.unsplash.com/photo-1535525153412-5a42439a210d?w=1200&q=80',
   'locking_legends_tokyo', null, null,
   'published');
