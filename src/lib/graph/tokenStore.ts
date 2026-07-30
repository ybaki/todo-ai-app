import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

/**
 * Ham Microsoft refresh token'ini Supabase Vault'a yazar/gunceller ve
 * vault secret id'sini (token_ref) dondurur. Ham deger asla normal bir
 * tabloya veya loga yazilmaz. Bkz. supabase/migrations/0003_vault_token_storage.sql.
 */
export async function storeRefreshToken(params: {
  userId: string;
  refreshToken: string;
  existingTokenRef: string | null;
}): Promise<string> {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase.rpc("store_calendar_token", {
    p_existing_ref: params.existingTokenRef,
    p_secret: params.refreshToken,
    p_name: `ms-refresh-token:${params.userId}`,
  });

  if (error || !data) {
    throw new Error(`Token saklanamadi: ${error?.message ?? "bilinmeyen hata"}`);
  }

  return data as string;
}

export async function readRefreshToken(tokenRef: string): Promise<string | null> {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase.rpc("read_calendar_token", {
    p_token_ref: tokenRef,
  });

  if (error) {
    throw new Error(`Token okunamadi: ${error.message}`);
  }

  return (data as string | null) ?? null;
}

export async function deleteRefreshToken(tokenRef: string): Promise<void> {
  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase.rpc("delete_calendar_token", {
    p_token_ref: tokenRef,
  });

  if (error) {
    throw new Error(`Token silinemedi: ${error.message}`);
  }
}
