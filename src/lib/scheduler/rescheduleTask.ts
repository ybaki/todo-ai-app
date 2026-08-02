import { addDays, addMinutes, differenceInMinutes, endOfDay, setHours, setMinutes, startOfDay } from "date-fns";
import type { TaskRow } from "@/types/database";
import { DEFAULT_ESTIMATED_MINUTES } from "@/lib/taskSize";
import { getEffectiveQuadrant } from "./deadlineUrgency";
import { generateScheduleCandidates, planTaskTimeBlocks } from "./engine";
import { buildSchedulerPreferences } from "./preferences";
import type { ExistingCommitment, SchedulableTask, TimeRange, WorkingHoursPreferences } from "./types";

export type RescheduleMode =
  | "first_available"
  | "within_work_hours"
  | "same_day_next_week"
  | "next_day_work_start"
  | "custom";

export interface RescheduleInput {
  task: TaskRow;
  mode: RescheduleMode;
  customStartAt?: Date;
  referenceStart?: Date;
  commitments: ExistingCommitment[];
  scheduledTasks: Array<{ start: Date; end: Date; quadrant: TaskRow["quadrant"] }>;
  preferences: WorkingHoursPreferences;
  now: Date;
}

function toSchedulableTask(task: TaskRow, now: Date): SchedulableTask {
  return {
    id: task.id,
    rawText: task.raw_text,
    tags: task.tags ?? [],
    estimatedMinutes: task.estimated_minutes ?? DEFAULT_ESTIMATED_MINUTES,
    minimumChunkMinutes: task.minimum_chunk_minutes ?? 60,
    splittable: task.splittable || (task.estimated_minutes ?? DEFAULT_ESTIMATED_MINUTES) >= 180,
    quadrant: getEffectiveQuadrant(
      task.quadrant,
      task.deadline ? new Date(task.deadline) : null,
      now
    ),
    deadline: task.deadline ? new Date(task.deadline) : null,
    energy: task.energy,
  };
}

function getMesaiStart(now: Date): Date {
  const dayStart = startOfDay(now);
  const mesaiStart = setMinutes(setHours(dayStart, 9), 0);
  return now > mesaiStart ? now : mesaiStart;
}

export function getRescheduleSearchWindow(
  mode: RescheduleMode,
  now: Date,
  customStartAt?: Date,
  referenceStart?: Date
): { start: Date; end: Date } {
  switch (mode) {
    case "first_available":
      return { start: now, end: addDays(now, 14) };
    case "within_work_hours":
      return { start: getMesaiStart(now), end: addDays(now, 14) };
    case "same_day_next_week": {
      const ref = referenceStart ?? now;
      const targetDay = addDays(startOfDay(ref), 7);
      return { start: targetDay, end: endOfDay(targetDay) };
    }
    case "next_day_work_start": {
      const tomorrow = addDays(startOfDay(now), 1);
      const mesaiStart = setMinutes(setHours(tomorrow, 9), 0);
      return { start: mesaiStart, end: addDays(mesaiStart, 14) };
    }
    case "custom": {
      if (!customStartAt) throw new Error("custom_start_required");
      return { start: customStartAt, end: addMinutes(customStartAt, DEFAULT_ESTIMATED_MINUTES) };
    }
  }
}

/** Yeniden planlama moduna gore takvim bloklari uretir. */
export function planRescheduleBlocks(input: RescheduleInput): TimeRange[] {
  const { task, mode, customStartAt, referenceStart, commitments, scheduledTasks, preferences, now } =
    input;
  const schedulableTask = toSchedulableTask(task, now);
  const window = getRescheduleSearchWindow(mode, now, customStartAt, referenceStart);

  if (mode === "custom" && customStartAt) {
    const duration = schedulableTask.estimatedMinutes;
    return [{ start: customStartAt, end: addMinutes(customStartAt, duration) }];
  }

  const filteredCommitments = commitments.filter(
    (commitment) => commitment.taskId !== task.id || commitment.kind !== "scheduled"
  );

  const effectiveNow = window.start.getTime() > now.getTime() ? window.start : now;

  const blocks = planTaskTimeBlocks({
    task: schedulableTask,
    commitments: filteredCommitments,
    preferences,
    searchWindow: { start: window.start, end: window.end },
    now: effectiveNow,
    scheduledTasks,
  });

  if (blocks.length > 0) return blocks;

  const candidates = generateScheduleCandidates({
    task: schedulableTask,
    commitments: filteredCommitments,
    preferences,
    searchWindow: { start: window.start, end: window.end },
    now: effectiveNow,
    scheduledTasks,
  });

  if (candidates.length === 0) return [];

  const best = candidates[0];
  return [{ start: best.start, end: best.end }];
}

/** Eski mod adlari -> yeni mod adlari. */
export function normalizeRescheduleMode(mode: string): RescheduleMode {
  switch (mode) {
    case "this_week":
      return "within_work_hours";
    case "next_week":
      return "same_day_next_week";
    case "first_available":
    case "within_work_hours":
    case "same_day_next_week":
    case "next_day_work_start":
    case "custom":
      return mode;
    default:
      return "first_available";
  }
}
