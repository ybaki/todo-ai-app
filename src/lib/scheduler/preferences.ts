import type { ProfileRow } from "@/types/database";
import type { WorkingHoursPreferences } from "./types";
import {
  DEFAULT_ACTIVE_DAYS,
  DEFAULT_WORK_DAYS,
  legacyWorkDayModeToDays,
  normalizeIsoWeekdays,
  normalizeScheduleMode,
} from "@/lib/scheduling/userPreferences";

export function buildSchedulerPreferences(profile: Pick<
  ProfileRow,
  | "timezone"
  | "work_start"
  | "work_end"
  | "work_days"
  | "work_day_mode"
  | "active_start"
  | "active_end"
  | "active_days"
  | "urgent_schedule_mode"
  | "plan_schedule_mode"
  | "get_rid_schedule_mode"
  | "lunch_start"
  | "lunch_end"
  | "buffer_minutes"
  | "min_focus_block_minutes"
  | "max_daily_focus_minutes"
>): WorkingHoursPreferences {
  const workDays =
    profile.work_days?.length > 0
      ? normalizeIsoWeekdays(profile.work_days)
      : legacyWorkDayModeToDays(profile.work_day_mode);

  return {
    timezone: profile.timezone,
    workStart: profile.work_start.slice(0, 5),
    workEnd: profile.work_end.slice(0, 5),
    workDays,
    activeStart: (profile.active_start ?? "07:00:00").slice(0, 5),
    activeEnd: (profile.active_end ?? "23:00:00").slice(0, 5),
    activeDays:
      profile.active_days?.length > 0
        ? normalizeIsoWeekdays(profile.active_days)
        : [...DEFAULT_ACTIVE_DAYS],
    urgentScheduleMode: normalizeScheduleMode(profile.urgent_schedule_mode),
    planScheduleMode: normalizeScheduleMode(profile.plan_schedule_mode),
    getRidScheduleMode: normalizeScheduleMode(profile.get_rid_schedule_mode),
    lunchStart: profile.lunch_start?.slice(0, 5) ?? null,
    lunchEnd: profile.lunch_end?.slice(0, 5) ?? null,
    bufferMinutes: profile.buffer_minutes,
    minFocusBlockMinutes: profile.min_focus_block_minutes,
    maxDailyFocusMinutes: profile.max_daily_focus_minutes,
  };
}
