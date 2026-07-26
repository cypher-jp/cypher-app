-- 008: 複数ジャンル対応
-- 部門制の大会(例: OLD SCHOOL NIGHT, WORLD DANCE COLOSSEUM)は複数ジャンルの部門を併催するため、
-- 開催ジャンルを配列(genres)で持てるようにする。従来のgenre(単一)は「代表ジャンル」として残し、
-- 既存行は genres = [genre] で埋める。FREESTYLE/ALL STYLE表記の大会のみ genres = ['all']。
alter table events add column if not exists genres text[] not null default '{}';
update events set genres = array[genre] where genres = '{}';
