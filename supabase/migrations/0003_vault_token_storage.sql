-- Microsoft refresh token'larini Supabase Vault (pgsodium ile sifreli) icinde
-- saklamak icin guvenli sarmalayici fonksiyonlar. Bkz. plan bolum 1, madde 1
-- (Token sifreleme mekanizmasi) ve dokuman bolum 12 (Token saklama).
--
-- NOT: Supabase Vault, yalnizca Supabase tarafindan yonetilen (hosted) veya
-- Vault eklentisi kurulu bir Postgres'te calisir. Lokal `supabase start`
-- ortaminda Vault varsayilan olarak aciktir.

create extension if not exists supabase_vault;

create or replace function public.store_calendar_token(
  p_existing_ref uuid,
  p_secret text,
  p_name text
)
returns uuid
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_id uuid;
begin
  if p_existing_ref is not null then
    perform vault.update_secret(p_existing_ref, p_secret, p_name);
    return p_existing_ref;
  end if;

  v_id := vault.create_secret(p_secret, p_name);
  return v_id;
end;
$$;

create or replace function public.read_calendar_token(p_token_ref uuid)
returns text
language sql
security definer
set search_path = public, vault
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where id = p_token_ref;
$$;

create or replace function public.delete_calendar_token(p_token_ref uuid)
returns void
language sql
security definer
set search_path = public, vault
as $$
  delete from vault.secrets where id = p_token_ref;
$$;

-- Bu fonksiyonlar YALNIZCA service_role tarafindan cagrilabilir; normal
-- kullanici (anon/authenticated) rolleri asla ham token'a erisemez.
revoke execute on function public.store_calendar_token(uuid, text, text) from public, authenticated, anon;
revoke execute on function public.read_calendar_token(uuid) from public, authenticated, anon;
revoke execute on function public.delete_calendar_token(uuid) from public, authenticated, anon;

grant execute on function public.store_calendar_token(uuid, text, text) to service_role;
grant execute on function public.read_calendar_token(uuid) to service_role;
grant execute on function public.delete_calendar_token(uuid) to service_role;
