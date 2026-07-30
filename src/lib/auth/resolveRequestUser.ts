import type { NextRequest } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { resolveUserIdFromExtensionToken } from "./extensionToken";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export interface RequestAuthContext {
  userId: string;
  /**
   * Web oturumu icin RLS'e tabi client; eklenti token'i icin service-role
   * client (RLS bypass edilir, bu yuzden HER SORGUDA .eq("user_id", userId)
   * ZORUNLUDUR). isServiceRole alanina bakarak bunu unutmamak gerekir.
   */
  supabase: SupabaseClient<Database>;
  isServiceRole: boolean;
}

/**
 * Hem web (Supabase session cookie) hem Chrome eklentisi (Bearer eklenti
 * token'i) istemcilerinden gelen istekleri tek noktadan kimliklendirir.
 * Bkz. plan bolum 1, madde 2.
 */
export async function resolveRequestUser(request: NextRequest): Promise<RequestAuthContext | null> {
  const authorizationHeader = request.headers.get("authorization");
  if (authorizationHeader) {
    const userId = await resolveUserIdFromExtensionToken(authorizationHeader);
    if (!userId) return null;
    return { userId, supabase: createSupabaseServiceRoleClient(), isServiceRole: true };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return { userId: user.id, supabase, isServiceRole: false };
}
