import { addDays } from "date-fns";
import { NextResponse, type NextRequest } from "next/server";
import { resolveRequestUser } from "@/lib/auth/resolveRequestUser";

// Haftalik takvim gorunumu icin onaylanmis plan bloklarini dondurur (FR-07).
export async function GET(request: NextRequest) {
  const auth = await resolveRequestUser(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const { searchParams } = request.nextUrl;
  const startIso = searchParams.get("start") ?? now.toISOString();
  const endIso = searchParams.get("end") ?? addDays(now, 7).toISOString();

  const { data, error } = await auth.supabase
    .from("scheduled_blocks")
    .select("*, tasks(title, raw_text, quadrant)")
    .eq("user_id", auth.userId)
    .gte("start_at", startIso)
    .lte("end_at", endIso);

  if (error) {
    return NextResponse.json({ error: "query_failed", message: error.message }, { status: 500 });
  }

  return NextResponse.json({ blocks: data });
}
