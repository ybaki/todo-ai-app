import { addDays, setHours, setMinutes, startOfDay } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TaskRow } from "@/types/database";
import {
  computeEndOfDayRolloverItems,
  type ScheduledBlockWithTask,
} from "@/lib/tasks/overdueScheduled";
import { applyPlannedBlocks } from "./applySchedule";
import { getEffectiveQuadrant } from "./deadlineUrgency";
import { planRescheduleBlocks } from "./rescheduleTask";
import { loadSchedulingContext } from "./scheduleContext";

function getCatchUpMesaiStart(now: Date): Date {
  const dayStart = startOfDay(now);
  const mesaiStart = setMinutes(setHours(dayStart, 9), 0);
  return now > mesaiStart ? now : mesaiStart;
}

/** Gece 23:59 veya kacirilmis rollover: gecikmis gorevleri ertesi gun 09:00'dan planlar. */
export async function runEndOfDayRollover(params: {
  supabase: SupabaseClient;
  userId: string;
  now?: Date;
}): Promise<{ rescheduledTaskIds: string[] }> {
  const { supabase, userId } = params;
  const now = params.now ?? new Date();
  const searchStart = addDays(startOfDay(now), -14).toISOString();
  const searchEnd = now.toISOString();

  const { data: blocks, error } = await supabase
    .from("scheduled_blocks")
    .select("*, tasks(title, raw_text, quadrant)")
    .eq("user_id", userId)
    .gte("start_at", searchStart)
    .lte("end_at", searchEnd);

  if (error) {
    throw new Error(error.message);
  }

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId);

  const tasksById = new Map((tasks ?? []).map((task) => [task.id, task as TaskRow]));
  const candidates = computeEndOfDayRolloverItems(
    (blocks ?? []) as ScheduledBlockWithTask[],
    tasksById,
    now
  );

  const rescheduledTaskIds: string[] = [];
  const isEodWindow = now.getHours() === 23 && now.getMinutes() >= 59;
  const mode = isEodWindow ? ("next_day_work_start" as const) : ("within_work_hours" as const);
  const planningNow = isEodWindow ? now : getCatchUpMesaiStart(now);

  for (const item of candidates) {
    const task = tasksById.get(item.taskId);
    if (!task?.estimated_minutes) continue;

    const searchWindow = { start: now, end: addDays(now, 21) };
    const context = await loadSchedulingContext(supabase, userId, task.id, searchWindow);
    if (!context) continue;

    const plannedBlocks = planRescheduleBlocks({
      task,
      mode,
      commitments: context.commitments,
      scheduledTasks: context.scheduledEntries.map((entry) => ({
        start: entry.start,
        end: entry.end,
        quadrant: entry.quadrant,
      })),
      preferences: context.preferences,
      now: planningNow,
    });

    if (plannedBlocks.length === 0) continue;

    const effectiveQuadrant = getEffectiveQuadrant(
      task.quadrant,
      task.deadline ? new Date(task.deadline) : null,
      now
    );

    const inserted = await applyPlannedBlocks({
      supabase,
      userId,
      task,
      plannedBlocks,
      scheduledEntries: context.scheduledEntries,
      incomingQuadrant: effectiveQuadrant,
    });

    if (inserted.length > 0) {
      rescheduledTaskIds.push(task.id);
    }
  }

  return { rescheduledTaskIds };
}
