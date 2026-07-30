import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// FR-09: Calisma saatleri, ogle arasi, tampon ve minimum blok ayarlanabilmelidir.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (error) {
    return NextResponse.json({ error: "query_failed", message: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}

const updateProfileSchema = z.object({
  timezone: z.string().min(1).optional(),
  workStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  workEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  lunchStart: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  lunchEnd: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  bufferMinutes: z.number().int().min(0).max(120).optional(),
  minFocusBlockMinutes: z.number().int().min(5).max(240).optional(),
  maxDailyFocusMinutes: z.number().int().min(30).max(600).optional(),
});

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", details: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const payload: Record<string, unknown> = {};
  if (parsed.data.timezone) payload.timezone = parsed.data.timezone;
  if (parsed.data.workStart) payload.work_start = parsed.data.workStart;
  if (parsed.data.workEnd) payload.work_end = parsed.data.workEnd;
  if (parsed.data.lunchStart !== undefined) payload.lunch_start = parsed.data.lunchStart;
  if (parsed.data.lunchEnd !== undefined) payload.lunch_end = parsed.data.lunchEnd;
  if (parsed.data.bufferMinutes !== undefined) payload.buffer_minutes = parsed.data.bufferMinutes;
  if (parsed.data.minFocusBlockMinutes !== undefined)
    payload.min_focus_block_minutes = parsed.data.minFocusBlockMinutes;
  if (parsed.data.maxDailyFocusMinutes !== undefined)
    payload.max_daily_focus_minutes = parsed.data.maxDailyFocusMinutes;

  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", user.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "update_failed", message: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}
