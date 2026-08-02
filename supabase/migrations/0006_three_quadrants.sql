-- 3 oncelik: get_rid enum degeri (sonraki migration'da veri tasinir).
alter type public.eisenhower_quadrant add value if not exists 'get_rid';
