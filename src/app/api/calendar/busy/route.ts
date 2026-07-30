import { createHash } from "node:crypto";
import { addDays } from "date-fns";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { GraphRetryableError, fetchBusySchedule } from "@/lib/graph/getSchedule";
import { refreshAccessToken } from "@/lib/graph/oauth";
import { readRefreshToken } from "@/lib/graph/tokenStore";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const CACHE_TTL_MINUTES = 10;

// FR-05 + FR-07: belirlenen tarih araligindaki busy/free bilgisi alinir ve
// kisa sureli cache'lenir. Yalnizca baslangic/bitis/durum saklanir (dokuman 8.3, 12).
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();
  const { searchParams } = new URL(request.url);
  const now = new Date();
  const startIso = searchParams.get("start") ?? now.toISOString();
  const endIso = searchParams.get("end") ?? addDays(now, 7).toISOString();

  const { data: connection } = await supabase
    .from("calendar_connections")
    .select("*")
    .eq("user_id", user.id)
    .eq("provider", "microsoft")
    .eq("status", "connected")
    .maybeSingle();

  if (!connection || !connection.token_ref) {
    return NextResponse.json({ connected: false, busy: [] });
  }

  const cacheFreshSince = new Date(Date.now() - CACHE_TTL_MINUTES * 60_000).toISOString();
  const { data: cachedRows } = await supabase
    .from("calendar_busy_cache")
    .select("*")
    .eq("user_id", user.id)
    .gte("start_at", startIso)
    .lte("end_at", endIso)
    .gte("fetched_at", cacheFreshSince);

  if (cachedRows && cachedRows.length > 0) {
    return NextResponse.json({ connected: true, busy: cachedRows, source: "cache" });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .single();

  try {
    const refreshToken = await readRefreshToken(connection.token_ref);
    if (!refreshToken) {
      return NextResponse.json({ connected: false, busy: [], error: "token_missing" }, { status: 409 });
    }

    const tokenResponse = await refreshAccessToken(refreshToken);
    const busyIntervals = await fetchBusySchedule({
      accessToken: tokenResponse.access_token,
      userEmail: user.email!,
      startIso,
      endIso,
      timezone: profile?.timezone ?? "Europe/Istanbul",
    });

    const fetchedAt = new Date().toISOString();
    const sourceHash = createHash("sha256")
      .update(`${startIso}:${endIso}:${busyIntervals.length}`)
      .digest("hex");

    await supabase.from("calendar_busy_cache").delete().eq("user_id", user.id).gte("start_at", startIso).lte(
      "end_at",
      endIso
    );

    const rowsToInsert = busyIntervals.map((interval) => ({
      user_id: user.id,
      start_at: interval.startAt,
      end_at: interval.endAt,
      status: interval.status,
      fetched_at: fetchedAt,
      source_hash: sourceHash,
    }));

    if (rowsToInsert.length > 0) {
      await supabase.from("calendar_busy_cache").insert(rowsToInsert);
    }

    await supabase
      .from("calendar_connections")
      .update({ last_synced_at: fetchedAt })
      .eq("id", connection.id);

    return NextResponse.json({ connected: true, busy: rowsToInsert, source: "live" });
  } catch (error) {
    if (error instanceof GraphRetryableError) {
      return NextResponse.json(
        { error: "graph_retryable", retryAfterSeconds: error.retryAfterSeconds },
        { status: 503, headers: { "Retry-After": String(error.retryAfterSeconds) } }
      );
    }
    console.error("calendar_busy_failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "graph_call_failed" }, { status: 502 });
  }
}
