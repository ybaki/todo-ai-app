import { addDays, differenceInMinutes } from "date-fns";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { resolveRequestUser } from "@/lib/auth/resolveRequestUser";
import { applyPlannedBlocks } from "@/lib/scheduler/applySchedule";
import { getEffectiveQuadrant } from "@/lib/scheduler/deadlineUrgency";
import {
  normalizeRescheduleMode,
  planRescheduleBlocks,
  type RescheduleMode,
} from "@/lib/scheduler/rescheduleTask";
import { loadSchedulingContext } from "@/lib/scheduler/scheduleContext";

const rescheduleSchema = z.object({
  mode: z.enum([
    "first_available",
    "within_work_hours",
    "same_day_next_week",
    "custom",
    "this_week",
    "next_week",
  ]),
  startAt: z.string().datetime({ offset: true }).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await resolveRequestUser(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = rescheduleSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", details: parsed.error.flatten() }, { status: 400 });
  }

  const mode = normalizeRescheduleMode(parsed.data.mode) as RescheduleMode;
  const { startAt } = parsed.data;
  if (mode === "custom" && !startAt) {
    return NextResponse.json({ error: "start_at_required" }, { status: 400 });
  }

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
    return NextResponse.json({ error: "task_not_ready", message: "Gorev suresi belirlenmemis" }, { status: 409 });
  }

  const now = new Date();
  const searchWindow = { start: now, end: addDays(now, 21) };

  const { data: existingBlocks } = await auth.supabase
    .from("scheduled_blocks")
    .select("start_at")
    .eq("task_id", id)
    .eq("user_id", auth.userId)
    .order("start_at", { ascending: true })
    .limit(1);

  const referenceStart = existingBlocks?.[0]?.start_at
    ? new Date(existingBlocks[0].start_at)
    : undefined;

  const context = await loadSchedulingContext(auth.supabase, auth.userId, id, searchWindow);
  if (!context) {
    return NextResponse.json({ error: "profile_missing" }, { status: 500 });
  }

  const plannedBlocks = planRescheduleBlocks({
    task,
    mode,
    customStartAt: startAt ? new Date(startAt) : undefined,
    referenceStart,
    commitments: context.commitments,
    scheduledTasks: context.scheduledEntries.map((entry) => ({
      start: entry.start,
      end: entry.end,
      quadrant: entry.quadrant,
    })),
    preferences: context.preferences,
    now,
  });

  if (plannedBlocks.length === 0) {
    return NextResponse.json(
      { error: "no_slot_found", message: "Uygun bos zaman bulunamadi" },
      { status: 409 }
    );
  }

  const effectiveQuadrant = getEffectiveQuadrant(
    task.quadrant,
    task.deadline ? new Date(task.deadline) : null,
    now
  );

  const insertedBlocks = await applyPlannedBlocks({
    supabase: auth.supabase,
    userId: auth.userId,
    task,
    plannedBlocks,
    scheduledEntries: context.scheduledEntries,
    incomingQuadrant: effectiveQuadrant,
  });

  if (insertedBlocks.length === 0) {
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({
    blocks: insertedBlocks,
    totalMinutes: plannedBlocks.reduce(
      (sum, block) => sum + differenceInMinutes(block.end, block.start),
      0
    ),
  });
}
