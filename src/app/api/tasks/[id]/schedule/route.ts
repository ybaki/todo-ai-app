import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { addDays, differenceInMinutes } from "date-fns";
import { resolveRequestUser } from "@/lib/auth/resolveRequestUser";
import { generateScheduleCandidates } from "@/lib/scheduler/engine";
import { buildSchedulerPreferences } from "@/lib/scheduler/preferences";
import type { ExistingCommitment } from "@/lib/scheduler/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// FR-06: Calisma saatleri ve tamponlara gore en az uc aday slot uretilebilmelidir.
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await resolveRequestUser(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { data: task } = await auth.supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (!task) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!task.estimated_minutes) {
    return NextResponse.json(
      { error: "task_not_analyzed", message: "Once AI analizi tamamlanmali (estimated_minutes eksik)" },
      { status: 409 }
    );
  }

  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("*")
    .eq("id", auth.userId)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "profile_missing" }, { status: 500 });
  }

  const now = new Date();
  const searchWindow = { start: now, end: addDays(now, 7) };

  const [{ data: busyRows }, { data: scheduledRows }, { data: manualRows }, { data: meetingRows }] =
    await Promise.all([
    auth.supabase
      .from("calendar_busy_cache")
      .select("start_at, end_at")
      .eq("user_id", auth.userId)
      .gte("end_at", searchWindow.start.toISOString())
      .lte("start_at", searchWindow.end.toISOString()),
    auth.supabase
      .from("scheduled_blocks")
      .select("start_at, end_at, tasks(quadrant)")
      .eq("user_id", auth.userId)
      .neq("task_id", id)
      .gte("end_at", searchWindow.start.toISOString())
      .lte("start_at", searchWindow.end.toISOString()),
    auth.supabase
      .from("manual_calendar_blocks")
      .select("start_at, end_at")
      .eq("user_id", auth.userId)
      .gte("end_at", searchWindow.start.toISOString())
      .lte("start_at", searchWindow.end.toISOString()),
    auth.supabase
      .from("calendar_meetings")
      .select("start_at, end_at")
      .eq("user_id", auth.userId)
      .gte("end_at", searchWindow.start.toISOString())
      .lte("start_at", searchWindow.end.toISOString()),
  ]);

  const commitments: ExistingCommitment[] = [
    ...(busyRows ?? []).map((row) => ({
      start: new Date(row.start_at),
      end: new Date(row.end_at),
      kind: "busy" as const,
    })),
    ...(scheduledRows ?? []).map((row) => ({
      start: new Date(row.start_at),
      end: new Date(row.end_at),
      kind: "scheduled" as const,
    })),
    ...(manualRows ?? []).map((row) => ({
      start: new Date(row.start_at),
      end: new Date(row.end_at),
      kind: "busy" as const,
    })),
    ...(meetingRows ?? []).map((row) => ({
      start: new Date(row.start_at),
      end: new Date(row.end_at),
      kind: "busy" as const,
    })),
  ];

  const dailyLoadMinutesByDate: Record<string, number> = {};
  for (const row of scheduledRows ?? []) {
    const dateKey = row.start_at.slice(0, 10);
    const minutes = differenceInMinutes(new Date(row.end_at), new Date(row.start_at));
    dailyLoadMinutesByDate[dateKey] = (dailyLoadMinutesByDate[dateKey] ?? 0) + minutes;
  }

  const candidates = generateScheduleCandidates({
    task: {
      id: task.id,
      rawText: task.raw_text,
      tags: task.tags ?? [],
      estimatedMinutes: task.estimated_minutes,
      minimumChunkMinutes: task.minimum_chunk_minutes,
      splittable: task.splittable,
      quadrant: task.quadrant,
      deadline: task.deadline ? new Date(task.deadline) : null,
      energy: task.energy,
    },
    commitments,
    preferences: buildSchedulerPreferences(profile),
    searchWindow,
    now,
    dailyLoadMinutesByDate,
    scheduledTasks: (scheduledRows ?? []).map((row) => {
      const rawJoin = row.tasks as unknown;
      const taskJoin = Array.isArray(rawJoin)
        ? (rawJoin[0] as { quadrant: import("@/types/database").EisenhowerQuadrant | null } | undefined)
        : (rawJoin as { quadrant: import("@/types/database").EisenhowerQuadrant | null } | null);
      return {
        start: new Date(row.start_at),
        end: new Date(row.end_at),
        quadrant: taskJoin?.quadrant ?? null,
      };
    }),
  });

  // Onceki aday setini temizleyip (henuz kabul edilmemisse) yenisini yaz.
  await auth.supabase
    .from("schedule_suggestions")
    .delete()
    .eq("task_id", id)
    .eq("status", "candidate");

  const rows = candidates.map((candidate, index) => ({
    task_id: id,
    user_id: auth.userId,
    start_at: candidate.start.toISOString(),
    end_at: candidate.end.toISOString(),
    score: candidate.score,
    reason: candidate.reason,
    rank: index + 1,
    status: "candidate" as const,
  }));

  const { data: inserted, error } = await auth.supabase
    .from("schedule_suggestions")
    .insert(rows)
    .select("*");

  if (error) {
    return NextResponse.json({ error: "insert_failed", message: error.message }, { status: 500 });
  }

  await auth.supabase.from("tasks").update({ status: "suggested" }).eq("id", id);

  return NextResponse.json({ suggestions: inserted });
}

const acceptSuggestionSchema = z.object({ suggestionId: z.string().uuid() });

// Kullanici onayi olmadan takvime kalici taşima yapilmaz (FR-04).
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await resolveRequestUser(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = acceptSuggestionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { data: suggestion } = await auth.supabase
    .from("schedule_suggestions")
    .select("*")
    .eq("id", parsed.data.suggestionId)
    .eq("task_id", id)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (!suggestion) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: block, error: blockError } = await auth.supabase
    .from("scheduled_blocks")
    .insert({
      task_id: id,
      user_id: auth.userId,
      start_at: suggestion.start_at,
      end_at: suggestion.end_at,
      source: "app",
    })
    .select("*")
    .single();

  if (blockError) {
    return NextResponse.json({ error: "insert_failed", message: blockError.message }, { status: 500 });
  }

  await auth.supabase
    .from("schedule_suggestions")
    .update({ status: "accepted" })
    .eq("id", suggestion.id);
  await auth.supabase
    .from("schedule_suggestions")
    .update({ status: "rejected" })
    .eq("task_id", id)
    .neq("id", suggestion.id)
    .eq("status", "candidate");

  await auth.supabase.from("tasks").update({ status: "scheduled" }).eq("id", id);
  await auth.supabase.from("task_feedback").insert({
    task_id: id,
    user_id: auth.userId,
    feedback_type: "slot_accepted",
    new_value: { start_at: suggestion.start_at, end_at: suggestion.end_at },
  });

  return NextResponse.json({ block });
}
