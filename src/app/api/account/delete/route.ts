import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { deleteRefreshToken } from "@/lib/graph/tokenStore";

// Dokuman bolum 12: kullanici hesabini ve tum verilerini silebilmeli.
// tasks/task_analyses/... tablolari auth.users -> ON DELETE CASCADE ile
// baglidir (bkz. supabase/migrations/0001_init.sql); yalnizca Vault'taki
// Microsoft refresh token'i AYRICA temizlememiz gerekiyor.
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseServiceRoleClient();

  const { data: connection } = await supabase
    .from("calendar_connections")
    .select("token_ref")
    .eq("user_id", user.id)
    .maybeSingle();

  if (connection?.token_ref) {
    await deleteRefreshToken(connection.token_ref).catch(() => null);
  }

  const { error } = await supabase.auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json({ error: "delete_failed", message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
