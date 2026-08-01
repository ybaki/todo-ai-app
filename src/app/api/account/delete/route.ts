import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase.auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json({ error: "delete_failed", message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
