import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { resolveRequestUser } from "@/lib/auth/resolveRequestUser";
import { checkRateLimit } from "@/lib/rateLimit";
import {
  durationPresetToMinutes,
  durationSchedulingDefaults,
  type TaskDurationPreset,
} from "@/lib/taskSize";

const taskDurationSchema = z.enum(["30m", "1h", "2h", "5h", "10h", "full_week"]);

const createTaskSchema = z.object({
  rawText: z.string().min(1).max(2000),
  idempotencyKey: z.string().min(1).max(100).optional(),
  source: z.enum(["web", "chrome_extension"]).default("web"),
  quadrant: z
    .enum(["urgent_important", "not_urgent_important", "get_rid"])
    .optional(),
  deadline: z.string().datetime({ offset: true }).nullable().optional(),
  taskDuration: taskDurationSchema.optional(),
  taskSize: taskDurationSchema.optional(),
});

// FR-01 + FR-02: Gorev, AI cagrisindan ONCE Inbox durumunda kaydedilir; AI
// servisi basarisiz olsa bile gorev kaybolmaz.
export async function POST(request: NextRequest) {
  const auth = await resolveRequestUser(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { allowed } = await checkRateLimit(`create-task:${auth.userId}`);
  if (!allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const json = await request.json().catch(() => null);
  const parsed = createTaskSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", details: parsed.error.flatten() }, { status: 400 });
  }

  const { rawText, idempotencyKey, source, quadrant, deadline } = parsed.data;
  const durationPreset = (parsed.data.taskDuration ?? parsed.data.taskSize) as
    | TaskDurationPreset
    | undefined;

  const sizeDefaults = durationPreset ? durationSchedulingDefaults(durationPreset) : null;
  const estimatedMinutes = durationPreset ? durationPresetToMinutes(durationPreset) : null;

  if (idempotencyKey) {
    const { data: existing } = await auth.supabase
      .from("tasks")
      .select("*")
      .eq("user_id", auth.userId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ task: existing, deduplicated: true }, { status: 200 });
    }
  }

  const { data, error } = await auth.supabase
    .from("tasks")
    .insert({
      user_id: auth.userId,
      raw_text: rawText,
      status: "inbox",
      source,
      idempotency_key: idempotencyKey ?? null,
      quadrant: quadrant ?? null,
      deadline: deadline ?? null,
      estimated_minutes: estimatedMinutes,
      splittable: sizeDefaults?.splittable ?? false,
      minimum_chunk_minutes: sizeDefaults?.minimumChunkMinutes ?? null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "insert_failed", message: error.message }, { status: 500 });
  }

  return NextResponse.json({ task: data }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const auth = await resolveRequestUser(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const status = request.nextUrl.searchParams.get("status");

  let query = auth.supabase
    .from("tasks")
    .select("*")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: "query_failed", message: error.message }, { status: 500 });
  }

  return NextResponse.json({ tasks: data });
}
