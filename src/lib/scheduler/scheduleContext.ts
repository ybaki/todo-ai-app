import { addDays, differenceInMinutes } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EisenhowerQuadrant } from "@/types/database";
import { quadrantPriorityRank } from "./deadlineUrgency";
import { buildSchedulerPreferences } from "./preferences";
import type { ExistingCommitment, TimeRange } from "./types";

export interface ScheduledEntry {
  blockId: string;
  taskId: string;
  start: Date;
  end: Date;
  quadrant: EisenhowerQuadrant | null;
}

export async function loadSchedulingContext(
  supabase: SupabaseClient,
  userId: string,
  excludeTaskId: string,
  searchWindow: TimeRange
) {
  const [{ data: profile }, { data: busyRows }, { data: scheduledRows }, { data: manualRows }, { data: meetingRows }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase
        .from("calendar_busy_cache")
        .select("start_at, end_at")
        .eq("user_id", userId)
        .gte("end_at", searchWindow.start.toISOString())
        .lte("start_at", searchWindow.end.toISOString()),
      supabase
        .from("scheduled_blocks")
        .select("id, task_id, start_at, end_at, tasks(quadrant)")
        .eq("user_id", userId)
        .neq("task_id", excludeTaskId)
        .gte("end_at", searchWindow.start.toISOString())
        .lte("start_at", searchWindow.end.toISOString()),
      supabase
        .from("manual_calendar_blocks")
        .select("start_at, end_at")
        .eq("user_id", userId)
        .gte("end_at", searchWindow.start.toISOString())
        .lte("start_at", searchWindow.end.toISOString()),
      supabase
        .from("calendar_meetings")
        .select("start_at, end_at")
        .eq("user_id", userId)
        .gte("end_at", searchWindow.start.toISOString())
        .lte("start_at", searchWindow.end.toISOString()),
    ]);

  if (!profile) return null;

  const scheduledEntries: ScheduledEntry[] = (scheduledRows ?? []).map((row) => {
    const taskJoin = row.tasks as { quadrant: EisenhowerQuadrant | null } | null;
    return {
      blockId: row.id,
      taskId: row.task_id,
      start: new Date(row.start_at),
      end: new Date(row.end_at),
      quadrant: taskJoin?.quadrant ?? null,
    };
  });

  const commitments: ExistingCommitment[] = [
    ...(busyRows ?? []).map((row) => ({
      start: new Date(row.start_at),
      end: new Date(row.end_at),
      kind: "busy" as const,
    })),
    ...scheduledEntries.map((entry) => ({
      start: entry.start,
      end: entry.end,
      kind: "scheduled" as const,
      taskId: entry.taskId,
      quadrant: entry.quadrant,
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
  for (const entry of scheduledEntries) {
    const dateKey = entry.start.toISOString().slice(0, 10);
    const minutes = differenceInMinutes(entry.end, entry.start);
    dailyLoadMinutesByDate[dateKey] = (dailyLoadMinutesByDate[dateKey] ?? 0) + minutes;
  }

  return {
    profile,
    preferences: buildSchedulerPreferences(profile),
    commitments,
    scheduledEntries,
    dailyLoadMinutesByDate,
  };
}

export function filterDisplaceableCommitments(
  commitments: ExistingCommitment[],
  scheduledEntries: ScheduledEntry[],
  incomingRank: number
): ExistingCommitment[] {
  const displaceableIds = new Set(
    scheduledEntries
      .filter((entry) => incomingRank > quadrantPriorityRank(entry.quadrant))
      .map((entry) => entry.taskId)
  );

  return commitments.filter(
    (commitment) =>
      commitment.kind !== "scheduled" ||
      !commitment.taskId ||
      !displaceableIds.has(commitment.taskId)
  );
}
