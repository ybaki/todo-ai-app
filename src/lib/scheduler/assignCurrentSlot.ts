import { addMinutes, endOfDay, startOfDay } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TaskRow } from "@/types/database";
import { resolveTaskDurationMinutes } from "@/lib/tasks/estimateDuration";
import { normalizeQuadrant } from "@/lib/quadrant";
import { applyPlannedBlocks } from "./applySchedule";
import { getEffectiveQuadrant } from "./deadlineUrgency";
import { computeFreeIntervals } from "./freeIntervals";
import { loadSchedulingContext, type ScheduledEntry } from "./scheduleContext";
import { isCandidateSlotAllowed, overlapsRange } from "./slotRules";
import type { ExistingCommitment, SchedulableTask, TimeRange, WorkingHoursPreferences } from "./types";

const QUADRANT_TIER: Record<string, number> = {
  urgent_important: 3,
  not_urgent_important: 4,
  get_rid: 5,
};

export interface AssignCurrentSlotResult {
  task: TaskRow;
  block: { start_at: string; end_at: string };
}

function getTaskDurationMinutes(task: TaskRow): number {
  return resolveTaskDurationMinutes(task.raw_text, task.estimated_minutes);
}

function toSchedulableTask(task: TaskRow, now: Date): SchedulableTask {
  const duration = getTaskDurationMinutes(task);
  return {
    id: task.id,
    rawText: task.raw_text,
    tags: task.tags ?? [],
    estimatedMinutes: duration,
    minimumChunkMinutes: task.minimum_chunk_minutes ?? duration,
    splittable: false,
    quadrant: getEffectiveQuadrant(
      normalizeQuadrant(task.quadrant),
      task.deadline ? new Date(task.deadline) : null,
      now
    ),
    deadline: task.deadline ? new Date(task.deadline) : null,
    energy: task.energy,
  };
}

function isEligibleTask(task: TaskRow): boolean {
  if (task.status === "done" || task.status === "archived") return false;
  if (!normalizeQuadrant(task.quadrant)) return false;
  return getTaskDurationMinutes(task) > 0;
}

/** Gorev ata onceligi: deadline (yakin) > Aksiyon Al > Planla > Kurtul */
export function getAssignSortKey(task: TaskRow, now: Date): number {
  const deadline = task.deadline ? new Date(task.deadline) : null;
  if (deadline && deadline.getTime() > now.getTime()) {
    return 1_000_000_000 + deadline.getTime() / 1000;
  }

  const quadrant = normalizeQuadrant(task.quadrant);
  if (!quadrant) return 9_000_000_000;
  return (QUADRANT_TIER[quadrant] ?? 8) * 1_000_000_000;
}

export function sortTasksForAssign(tasks: TaskRow[], now: Date): TaskRow[] {
  return [...tasks].sort((a, b) => getAssignSortKey(a, now) - getAssignSortKey(b, now));
}

export function getNextObstacleStart(
  now: Date,
  commitments: ExistingCommitment[],
  windowEnd: Date
): Date {
  let next = windowEnd;
  for (const commitment of commitments) {
    if (commitment.start.getTime() <= now.getTime()) continue;
    if (commitment.start.getTime() < next.getTime()) {
      next = commitment.start;
    }
  }
  return next;
}

/** Aktif saat + blok/toplanti sonrasi ilk uygun baslangic penceresi. */
export function resolveAssignSlot(params: {
  now: Date;
  preferences: WorkingHoursPreferences;
  commitments: ExistingCommitment[];
}): { startAt: Date; obstacleStart: Date } | null {
  const dayEnd = addMinutes(endOfDay(params.now), 1);
  const freeIntervals = computeFreeIntervals({
    commitments: params.commitments,
    preferences: params.preferences,
    searchWindow: { start: params.now, end: dayEnd },
    now: params.now,
  });

  for (const interval of freeIntervals) {
    const startAt =
      interval.start.getTime() <= params.now.getTime() ? params.now : interval.start;
    if (startAt.getTime() >= interval.end.getTime()) continue;

    const obstacleStart = getNextObstacleStart(startAt, params.commitments, interval.end);
    if (startAt.getTime() < obstacleStart.getTime()) {
      return { startAt, obstacleStart };
    }
  }

  return null;
}

export function canAssignTaskAt(params: {
  task: TaskRow;
  startAt: Date;
  obstacleStart: Date;
  commitments: ExistingCommitment[];
  now: Date;
  preferences: WorkingHoursPreferences;
  scheduledTasks: Array<{ start: Date; end: Date; quadrant: import("@/types/database").EisenhowerQuadrant | null }>;
}): boolean {
  const { task, startAt, obstacleStart, commitments, now, preferences, scheduledTasks } = params;
  const schedulable = toSchedulableTask(task, now);
  const endAt = addMinutes(startAt, schedulable.estimatedMinutes);

  if (endAt.getTime() > obstacleStart.getTime()) return false;

  const deadline = task.deadline ? new Date(task.deadline) : null;
  if (deadline && endAt.getTime() > deadline.getTime()) return false;

  const slot: TimeRange = { start: startAt, end: endAt };
  for (const commitment of commitments) {
    if (overlapsRange(slot, commitment)) return false;
  }

  return isCandidateSlotAllowed({
    candidate: slot,
    task: schedulable,
    timezone: preferences.timezone,
    now,
    scheduledTasks,
    preferences,
  });
}

export function pickTaskForCurrentSlot(
  tasks: TaskRow[],
  params: {
    startAt: Date;
    obstacleStart: Date;
    commitments: ExistingCommitment[];
    activeTaskIds: Set<string>;
    now: Date;
    preferences: WorkingHoursPreferences;
    scheduledEntries: ScheduledEntry[];
  }
): TaskRow | null {
  const scheduledTasks = params.scheduledEntries.map((entry) => ({
    start: entry.start,
    end: entry.end,
    quadrant: entry.quadrant,
  }));

  const candidates = sortTasksForAssign(
    tasks.filter(
      (task) => isEligibleTask(task) && !params.activeTaskIds.has(task.id)
    ),
    params.now
  );

  for (const task of candidates) {
    if (
      canAssignTaskAt({
        task,
        startAt: params.startAt,
        obstacleStart: params.obstacleStart,
        commitments: params.commitments,
        now: params.now,
        preferences: params.preferences,
        scheduledTasks,
      })
    ) {
      return task;
    }
  }

  return null;
}

/** Simdi anindan itibaren uygun gorevi takvime atar (Gorev ata). */
export async function assignCurrentSlot(params: {
  supabase: SupabaseClient;
  userId: string;
  now?: Date;
}): Promise<AssignCurrentSlotResult | null> {
  const now = params.now ?? new Date();
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);
  const searchWindow = { start: dayStart, end: addMinutes(dayEnd, 1) };

  const context = await loadSchedulingContext(
    params.supabase,
    params.userId,
    "00000000-0000-0000-0000-000000000000",
    searchWindow
  );
  if (!context) return null;

  const slot = resolveAssignSlot({
    now,
    preferences: context.preferences,
    commitments: context.commitments,
  });
  if (!slot) return null;

  const { data: tasks } = await params.supabase
    .from("tasks")
    .select("*")
    .eq("user_id", params.userId)
    .neq("status", "done")
    .neq("status", "archived");

  if (!tasks?.length) return null;

  const activeTaskIds = new Set(
    context.scheduledEntries
      .filter((entry) => entry.end.getTime() > now.getTime())
      .map((entry) => entry.taskId)
  );

  const picked = pickTaskForCurrentSlot(tasks, {
    startAt: slot.startAt,
    obstacleStart: slot.obstacleStart,
    commitments: context.commitments,
    activeTaskIds,
    now,
    preferences: context.preferences,
    scheduledEntries: context.scheduledEntries,
  });

  if (!picked) return null;

  const duration = getTaskDurationMinutes(picked);
  const endAt = addMinutes(slot.startAt, duration);
  const effectiveQuadrant = getEffectiveQuadrant(
    picked.quadrant,
    picked.deadline ? new Date(picked.deadline) : null,
    now
  );

  if (!picked.estimated_minutes) {
    await params.supabase
      .from("tasks")
      .update({ estimated_minutes: duration })
      .eq("id", picked.id)
      .eq("user_id", params.userId);
  }

  const inserted = await applyPlannedBlocks({
    supabase: params.supabase,
    userId: params.userId,
    task: picked,
    plannedBlocks: [{ start: slot.startAt, end: endAt }],
    scheduledEntries: context.scheduledEntries,
    incomingQuadrant: effectiveQuadrant,
  });

  if (inserted.length === 0) return null;

  const { data: updatedTask } = await params.supabase
    .from("tasks")
    .select("*")
    .eq("id", picked.id)
    .single();

  return {
    task: updatedTask ?? picked,
    block: inserted[0],
  };
}
