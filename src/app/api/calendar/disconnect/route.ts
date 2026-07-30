import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { deleteRefreshToken } from "@/lib/graph/tokenStore";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Dokuman bolum 12: "Kullanici hesabiyla birlikte silebilir / baglantiyi kesebilir."
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: connection } = await supabase
    .from("calendar_connections")
    .select("id, token_ref")
    .eq("user_id", user.id)
    .eq("provider", "microsoft")
    .maybeSingle();

  if (!connection) {
    return NextResponse.json({ success: true });
  }

  if (connection.token_ref) {
    await deleteRefreshToken(connection.token_ref);
  }

  await supabase
    .from("calendar_connections")
    .update({ status: "disconnected", token_ref: null })
    .eq("id", connection.id);

  await supabase.from("calendar_busy_cache").delete().eq("user_id", user.id);

  return NextResponse.json({ success: true });
}
