import type { EisenhowerQuadrant } from "@/types/database";
import { formatInTimeZone } from "date-fns-tz";

/** ISO: 1=Pazartesi ... 7=Pazar */
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type QuadrantScheduleMode = "work_hours" | "active_hours";

export const WEEKDAY_OPTIONS: Array<{ iso: IsoWeekday; label: string; short: string }> = [
  { iso: 1, label: "Pazartesi", short: "Pzt" },
  { iso: 2, label: "Salı", short: "Sal" },
  { iso: 3, label: "Çarşamba", short: "Çar" },
  { iso: 4, label: "Perşembe", short: "Per" },
  { iso: 5, label: "Cuma", short: "Cum" },
  { iso: 6, label: "Cumartesi", short: "Cmt" },
  { iso: 7, label: "Pazar", short: "Paz" },
];

export const DEFAULT_ACTIVE_DAYS: IsoWeekday[] = [1, 2, 3, 4, 5, 6, 7];
export const DEFAULT_WORK_DAYS: IsoWeekday[] = [1, 2, 3, 4, 5];

function parseTimeToMinutes(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function minutesToTime(totalMinutes: number): string {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** 30 dk adimlarla saat listesi (bitis saati dahil, gece yarisini sarar). */
export function buildHalfHourTimeOptions(from: string, to: string): string[] {
  const options: string[] = [];
  let cursor = parseTimeToMinutes(from);
  const end = parseTimeToMinutes(to);
  const step = 30;

  for (let guard = 0; guard < 48; guard += 1) {
    options.push(minutesToTime(cursor));
    if (cursor === end) break;
    cursor += step;
  }

  return options;
}

export const HOUR_START_TIME_OPTIONS = buildHalfHourTimeOptions("07:00", "06:00");
export const HOUR_END_TIME_OPTIONS = buildHalfHourTimeOptions("16:30", "15:30");

export function normalizeIsoWeekdays(days: number[] | null | undefined): IsoWeekday[] {
  const valid = (days ?? []).filter((day): day is IsoWeekday => day >= 1 && day <= 7);
  return valid.length > 0 ? [...new Set(valid)].sort((a, b) => a - b) : [...DEFAULT_WORK_DAYS];
}

export function legacyWorkDayModeToDays(mode: string | null | undefined): IsoWeekday[] {
  if (mode === "weekdays_saturday") return [1, 2, 3, 4, 5, 6];
  if (mode === "all_days") return [...DEFAULT_ACTIVE_DAYS];
  return [...DEFAULT_WORK_DAYS];
}

export function normalizeScheduleMode(value: string | null | undefined): QuadrantScheduleMode {
  if (value === "active_hours" || value === "every_day" || value === "weekdays_only") {
    return "active_hours";
  }
  return "work_hours";
}

export function isDayInSet(
  day: Date,
  days: IsoWeekday[] | undefined,
  timezone: string
): boolean {
  const normalized = days?.length ? days : DEFAULT_ACTIVE_DAYS;
  const isoDay = Number(formatInTimeZone(day, timezone, "i")) as IsoWeekday;
  return normalized.includes(isoDay);
}

export function getMinutesInTimezone(date: Date, timezone: string): number {
  return (
    Number(formatInTimeZone(date, timezone, "H")) * 60 +
    Number(formatInTimeZone(date, timezone, "m"))
  );
}

export function isTimeRangeWithinBounds(params: {
  start: Date;
  end: Date;
  rangeStart: string;
  rangeEnd: string;
  timezone: string;
}): boolean {
  const { start, end, rangeStart, rangeEnd, timezone } = params;
  const startMinutes = getMinutesInTimezone(start, timezone);
  const endMinutes = getMinutesInTimezone(end, timezone);
  const fromMinutes = parseTimeToMinutes(rangeStart);
  const toMinutes = rangeEnd === "24:00" ? 24 * 60 : parseTimeToMinutes(rangeEnd);

  if (toMinutes > fromMinutes) {
    return startMinutes >= fromMinutes && endMinutes <= toMinutes;
  }

  // Gece yarisini saran aralik (or. 22:00 - 02:00)
  return (
    (startMinutes >= fromMinutes || startMinutes <= toMinutes) &&
    (endMinutes <= toMinutes || endMinutes >= fromMinutes)
  );
}

export function getQuadrantScheduleMode(
  quadrant: EisenhowerQuadrant | null,
  prefs: {
    urgentScheduleMode: QuadrantScheduleMode;
    planScheduleMode: QuadrantScheduleMode;
    getRidScheduleMode: QuadrantScheduleMode;
  }
): QuadrantScheduleMode {
  switch (quadrant) {
    case "urgent_important":
      return prefs.urgentScheduleMode;
    case "not_urgent_important":
      return prefs.planScheduleMode;
    case "get_rid":
      return prefs.getRidScheduleMode;
    default:
      return "work_hours";
  }
}

export interface HourWindowPreferences {
  timezone: string;
  workStart: string;
  workEnd: string;
  workDays: IsoWeekday[];
  activeStart: string;
  activeEnd: string;
  activeDays: IsoWeekday[];
}

export function isSlotAllowedForQuadrantMode(params: {
  start: Date;
  end: Date;
  mode: QuadrantScheduleMode;
  preferences: HourWindowPreferences;
}): boolean {
  const { start, end, mode, preferences } = params;
  const { timezone } = preferences;

  if (mode === "active_hours") {
    if (!isDayInSet(start, preferences.activeDays, timezone)) return false;
    return isTimeRangeWithinBounds({
      start,
      end,
      rangeStart: preferences.activeStart,
      rangeEnd: preferences.activeEnd,
      timezone,
    });
  }

  if (!isDayInSet(start, preferences.workDays, timezone)) return false;

  const inWorkHours = isTimeRangeWithinBounds({
    start,
    end,
    rangeStart: preferences.workStart,
    rangeEnd: preferences.workEnd,
    timezone,
  });

  if (!inWorkHours) return false;

  // Calisma saati aktif saat icinde olmali (Aktif > Calisma kurali).
  if (!isDayInSet(start, preferences.activeDays, timezone)) return false;

  return isTimeRangeWithinBounds({
    start,
    end,
    rangeStart: preferences.activeStart,
    rangeEnd: preferences.activeEnd,
    timezone,
  });
}

/** Kaydetmeden once: calisma gunleri/saatleri aktif pencerenin icinde mi? */
export function validateHourWindows(params: {
  workDays: IsoWeekday[];
  workStart: string;
  workEnd: string;
  activeDays: IsoWeekday[];
  activeStart: string;
  activeEnd: string;
}): string | null {
  const workDaySet = new Set(params.workDays);
  for (const day of params.workDays) {
    if (!params.activeDays.includes(day)) {
      return "Çalışma günleri, aktif günlerin içinde olmalı.";
    }
  }

  void workDaySet;

  const workStartMin = parseTimeToMinutes(params.workStart);
  const workEndMin = params.workEnd === "24:00" ? 24 * 60 : parseTimeToMinutes(params.workEnd);
  const activeStartMin = parseTimeToMinutes(params.activeStart);
  const activeEndMin = params.activeEnd === "24:00" ? 24 * 60 : parseTimeToMinutes(params.activeEnd);

  const activeWraps = activeEndMin <= activeStartMin;
  const workWraps = workEndMin <= workStartMin;

  if (!activeWraps && !workWraps) {
    if (workStartMin < activeStartMin || workEndMin > activeEndMin) {
      return "Çalışma saatleri, aktif saat aralığının içinde olmalı.";
    }
  }

  if (params.workDays.length === 0) return "En az bir çalışma günü seçin.";
  if (params.activeDays.length === 0) return "En az bir aktif gün seçin.";

  return null;
}
