-- Chrome eklentisi <-> web app kimlik dogrulama koprusu.
-- Bkz. plan bolum 1, madde 2 (Chrome eklentisi oturum paylasimi).
--
-- Eklenti, Supabase oturum cerezine/JWT'sine dogrudan erisemez (Manifest V3
-- service worker farkli bir origin'de calisir). Bunun yerine kullanici, web
-- uygulamasinda (oturum acmisken) bir "eklenti anahtari" uretir; bu anahtarin
-- SHA-256 hash'i burada saklanir, ham deger yalnizca uretim anindaki API
-- yanitinda BIR KEZ gosterilir.

create table public.extension_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token_hash text not null unique,
  label text,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index extension_tokens_user_id_idx on public.extension_tokens (user_id);

alter table public.extension_tokens enable row level security;

create policy "extension_tokens_select_own" on public.extension_tokens
  for select using (auth.uid() = user_id);
create policy "extension_tokens_delete_own" on public.extension_tokens
  for delete using (auth.uid() = user_id);
-- insert: yalnizca backend (service role) yazar (ham token'i hash'leyerek).
