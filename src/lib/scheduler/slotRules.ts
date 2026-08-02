import { formatInTimeZone } from "date-fns-tz";
import { fromZonedTime } from "date-fns-tz";
import { addDays } from "date-fns";
import type { EisenhowerQuadrant } from "@/types/database";
import { getQuadrantScheduleMode, isSlotAllowedForQuadrantMode } from "@/lib/scheduling/userPreferences";
import { getEffectiveQuadrant } from "./deadlineUrgency";
import { classifyTaskCategory } from "./taskCategory";
import type { ExistingCommitment, SchedulableTask, WorkingHoursPreferences } from "./types";

const PLANNING_QUADRANTS = new Set<EisenhowerQuadrant>([
  "urgent_important",
  "not_urgent_important",
]);

function getHourInTimezone(date: Date, timezone: string): number {
  return Number(formatInTimeZone(date, timezone, "H"));
}

function getDayEndAtHour(dateStr: string, hour: number, timezone: string): Date {
  if (hour >= 24) {
    return addDays(fromZonedTime(`${dateStr}T00:00:00`, timezone), 1);
  }
  const hh = String(hour).padStart(2, "0");
  return fromZonedTime(`${dateStr}T${hh}:00:00`, timezone);
}

export interface ScheduledTaskBlock {
  start: Date;
  end: Date;
  quadrant: EisenhowerQuadrant | null;
}

/** Saat/kategori/quadrant kurallarina gore aday slot uygun mu? */
export function isCandidateSlotAllowed(params: {
  candidate: { start: Date; end: Date };
  task: SchedulableTask;
  timezone: string;
  now: Date;
  scheduledTasks: ScheduledTaskBlock[];
  preferences: WorkingHoursPreferences;
}): boolean {
  const { candidate, task, timezone, now, scheduledTasks, preferences } = params;
  const effectiveQuadrant = getEffectiveQuadrant(task.quadrant, task.deadline, now);
  const scheduleMode = getQuadrantScheduleMode(effectiveQuadrant, {
    urgentScheduleMode: preferences.urgentScheduleMode,
    planScheduleMode: preferences.planScheduleMode,
    getRidScheduleMode: preferences.getRidScheduleMode,
  });

  if (
    !isSlotAllowedForQuadrantMode({
      start: candidate.start,
      end: candidate.end,
      mode: scheduleMode,
      preferences: {
        timezone,
        workStart: preferences.workStart,
        workEnd: preferences.workEnd,
        workDays: preferences.workDays,
        activeStart: preferences.activeStart,
        activeEnd: preferences.activeEnd,
        activeDays: preferences.activeDays,
      },
    })
  ) {
    return false;
  }

  const category = classifyTaskCategory(task.tags, task.rawText);
  const dateStr = formatInTimeZone(candidate.start, timezone, "yyyy-MM-dd");
  const startHour = getHourInTimezone(candidate.start, timezone);

  if (scheduleMode === "active_hours") {
    // Aktif saat modunda kategori kisitlari gevsetilmez; teknik/gunluk kurallar devam eder.
  }

  // Teknik isler 18:00 sonrasina girilmez.
  if (category === "technical") {
    const cutoff = getDayEndAtHour(dateStr, 18, timezone);
    if (candidate.end.getTime() > cutoff.getTime()) {
      return false;
    }
  }

  // Gunluk isler: 18:00 sonrasi yalnizca ayni gun 18:00 oncesi aksiyon/planla yoksa.
  if (category === "daily" && startHour >= 18) {
    const dayCutoff = getDayEndAtHour(dateStr, 18, timezone);
    const hasPlanningBeforeEvening = scheduledTasks.some((block) => {
      if (block.end.getTime() <= block.start.getTime()) return false;
      if (block.end.getTime() > dayCutoff.getTime()) return false;
      if (block.start.getTime() >= dayCutoff.getTime()) return false;
      return block.quadrant ? PLANNING_QUADRANTS.has(block.quadrant) : false;
    });

    if (hasPlanningBeforeEvening) {
      return false;
    }
  }

  return true;
}

export function overlapsRange(
  a: { start: Date; end: Date },
  b: { start: Date; end: Date }
): boolean {
  return a.start < b.end && b.start < a.end;
}

export function findOverlappingScheduledBlocks(
  candidate: { start: Date; end: Date },
  scheduled: Array<ScheduledTaskBlock & { taskId: string }>,
  excludeTaskId?: string
): Array<ScheduledTaskBlock & { taskId: string }> {
  return scheduled.filter(
    (block) =>
      block.taskId !== excludeTaskId && overlapsRange(candidate, block)
  );
}
