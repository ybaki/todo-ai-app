import { addDays, addMonths, addWeeks, addYears, isAfter, startOfDay } from "date-fns";
import type { MeetingRecurrenceFrequency, MeetingRecurrenceRule } from "@/types/database";

const MAX_OCCURRENCES = 100;

function advanceByFrequency(date: Date, frequency: MeetingRecurrenceFrequency, interval: number): Date {
  switch (frequency) {
    case "day":
      return addDays(date, interval);
    case "week":
      return addWeeks(date, interval);
    case "month":
      return addMonths(date, interval);
    case "year":
      return addYears(date, interval);
  }
}

/** Tek toplantidan yineleme kuralina gore tum tekrar araliklarini uretir. */
export function expandMeetingOccurrences(
  startAt: Date,
  endAt: Date,
  recurrence: MeetingRecurrenceRule | null
): Array<{ startAt: Date; endAt: Date }> {
  const durationMs = endAt.getTime() - startAt.getTime();
  if (!recurrence) {
    return [{ startAt, endAt }];
  }

  const until = recurrence.until ? startOfDay(new Date(recurrence.until)) : null;
  const occurrences: Array<{ startAt: Date; endAt: Date }> = [];
  let cursorStart = new Date(startAt);
  let cursorEnd = new Date(endAt);

  for (let index = 0; index < MAX_OCCURRENCES; index += 1) {
    if (until && isAfter(startOfDay(cursorStart), until)) break;
    occurrences.push({ startAt: new Date(cursorStart), endAt: new Date(cursorEnd) });
    cursorStart = advanceByFrequency(cursorStart, recurrence.frequency, recurrence.interval);
    cursorEnd = new Date(cursorStart.getTime() + durationMs);
  }

  return occurrences;
}

/** Form icin varsayilan baslangic/bitis (30 dk yuvarlama). */
export function getDefaultMeetingRange(now = new Date()): { startAt: Date; endAt: Date } {
  const startAt = new Date(now);
  const minutes = startAt.getMinutes();
  const roundedMinutes = minutes < 30 ? 30 : 0;
  if (minutes >= 30) startAt.setHours(startAt.getHours() + 1);
  startAt.setMinutes(roundedMinutes, 0, 0);
  const endAt = new Date(startAt.getTime() + 30 * 60 * 1000);
  return { startAt, endAt };
}

export function toDateInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toTimeInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function combineDateAndTime(dateValue: string, timeValue: string): Date | null {
  if (!dateValue || !timeValue) return null;
  const combined = new Date(`${dateValue}T${timeValue}`);
  return Number.isNaN(combined.getTime()) ? null : combined;
}

export function formatMeetingDateSummary(startAt: Date, endAt: Date): string {
  const dateLabel = startAt.toLocaleDateString("tr-TR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const startLabel = startAt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  const endLabel = endAt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  return `${dateLabel} · ${startLabel} – ${endLabel}`;
}

export const WEEKDAY_LABELS = ["P", "P", "S", "Ç", "P", "C", "C"] as const;

export const RECURRENCE_FREQUENCY_LABELS: Record<MeetingRecurrenceFrequency, string> = {
  day: "gün",
  week: "hafta",
  month: "ay",
  year: "yıl",
};
