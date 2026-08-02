import { addDays } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_ESTIMATED_MINUTES } from "@/lib/taskSize";
import type { TaskRow } from "@/types/database";
import { applyPlannedBlocks } from "./applySchedule";
import { getEffectiveQuadrant, quadrantPriorityRank } from "./deadlineUrgency";
import { planTaskTimeBlocks } from "./engine";
import { filterDisplaceableCommitments, loadSchedulingContext } from "./scheduleContext";

function toSchedulableTask(task: TaskRow, now: Date) {
  const effectiveQuadrant = getEffectiveQuadrant(
    task.quadrant,
    task.deadline ? new Date(task.deadline) : null,
    now
  );

  return {
    id: task.id,
    rawText: task.raw_text,
    tags: task.tags ?? [],
    estimatedMinutes: task.estimated_minutes ?? DEFAULT_ESTIMATED_MINUTES,
    minimumChunkMinutes: task.minimum_chunk_minutes ?? 60,
    splittable: task.splittable || (task.estimated_minutes ?? DEFAULT_ESTIMATED_MINUTES) >= 180,
    quadrant: effectiveQuadrant,
    deadline: task.deadline ? new Date(task.deadline) : null,
    energy: task.energy,
  };
}

/** Analiz sonrasi gorevi takvime otomatik yerlestirir; dusuk oncelikli cakisanlari kaydirir. */
export async function autoScheduleTask(params: {
  supabase: SupabaseClient;
  userId: string;
  task: TaskRow;
}): Promise<{ blocks: Array<{ start_at: string; end_at: string }> } | null> {
  const { supabase, userId, task } = params;

  if (!task.estimated_minutes) return null;

  const now = new Date();
  const searchWindow = { start: now, end: addDays(now, 14) };
  const context = await loadSchedulingContext(supabase, userId, task.id, searchWindow);
  if (!context) return null;

  const schedulableTask = toSchedulableTask(task, now);
  const incomingRank = quadrantPriorityRank(schedulableTask.quadrant);

  const planningCommitments = filterDisplaceableCommitments(
    context.commitments,
    context.scheduledEntries,
    incomingRank
  );

  const plannedBlocks = planTaskTimeBlocks({
    task: schedulableTask,
    commitments: planningCommitments,
    preferences: context.preferences,
    searchWindow,
    now,
    dailyLoadMinutesByDate: context.dailyLoadMinutesByDate,
    scheduledTasks: context.scheduledEntries.map((entry) => ({
      start: entry.start,
      end: entry.end,
      quadrant: entry.quadrant,
    })),
  });

  if (plannedBlocks.length === 0) return null;

  const insertedBlocks = await applyPlannedBlocks({
    supabase,
    userId,
    task,
    plannedBlocks,
    scheduledEntries: context.scheduledEntries,
    incomingQuadrant: schedulableTask.quadrant,
  });

  if (insertedBlocks.length === 0) return null;

  return { blocks: insertedBlocks };
}
