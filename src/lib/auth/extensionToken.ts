import { createHmac, randomBytes } from "node:crypto";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

const TOKEN_PREFIX = "ext_";

// HMAC kullanmak, EXTENSION_TOKEN_SIGNING_SECRET sizarsa bile veritabani
// dump'inin tek basina token'lari dogrulanabilir kilmamasini saglar.
function hashToken(rawToken: string): string {
  return createHmac("sha256", env.extension.tokenSigningSecret).update(rawToken).digest("hex");
}

/**
 * Web uygulamasinda (oturum acmis kullanici) cagrilir; yeni bir eklenti
 * anahtari uretir. Ham deger yalnizca bu fonksiyonun donusunde bulunur,
 * veritabaninda YALNIZCA hash'i saklanir.
 */
export async function issueExtensionToken(userId: string, label: string) {
  const rawToken = `${TOKEN_PREFIX}${randomBytes(24).toString("base64url")}`;
  const tokenHash = hashToken(rawToken);

  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase
    .from("extension_tokens")
    .insert({ user_id: userId, token_hash: tokenHash, label });

  if (error) {
    throw new Error(`Eklenti anahtari olusturulamadi: ${error.message}`);
  }

  return rawToken;
}

/**
 * Chrome eklentisinden gelen `Authorization: Bearer ext_...` basligini
 * dogrular ve gecerliyse ilgili user_id'yi dondurur.
 */
export async function resolveUserIdFromExtensionToken(
  authorizationHeader: string | null
): Promise<string | null> {
  if (!authorizationHeader?.startsWith("Bearer ")) return null;
  const rawToken = authorizationHeader.slice("Bearer ".length).trim();
  if (!rawToken.startsWith(TOKEN_PREFIX)) return null;

  const tokenHash = hashToken(rawToken);
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("extension_tokens")
    .select("user_id, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !data || data.revoked_at) return null;

  await supabase
    .from("extension_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("token_hash", tokenHash);

  return data.user_id;
}
