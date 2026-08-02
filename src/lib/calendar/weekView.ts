import {
  addDays,
  addMinutes,
  addMonths,
  addYears,
  differenceInMinutes,
  format,
  isSameDay,
  startOfDay,
} from "date-fns";
import { tr } from "date-fns/locale";

export const CALENDAR_START_HOUR = 0;
export const CALENDAR_END_HOUR = 24;
export const CALENDAR_SLOT_MINUTES = 30;
export const CALENDAR_SLOTS_COUNT =
  ((CALENDAR_END_HOUR - CALENDAR_START_HOUR) * 60) / CALENDAR_SLOT_MINUTES;
export const CALENDAR_SLOT_HEIGHT_PX = 28;
export const CALENDAR_DAY_COUNT = 7;
/** Takvim govdesinde ayni anda gorunen saat penceresi. */
export const CALENDAR_VISIBLE_HOURS = 12;

export function getCalendarScrollViewportHeightPx(
  hours: number = CALENDAR_VISIBLE_HOURS
): number {
  const slotsPerHour = 60 / CALENDAR_SLOT_MINUTES;
  return hours * slotsPerHour * CALENDAR_SLOT_HEIGHT_PX;
}

export type CalendarNavStep = "week" | "month" | "year";

export function getCalendarSlotIndexes(): number[] {
  return Array.from({ length: CALENDAR_SLOTS_COUNT }, (_, index) => index);
}

/** Geriye donuk: saat basliklari icin. */
export function getCalendarHours(): number[] {
  return Array.from({ length: CALENDAR_END_HOUR - CALENDAR_START_HOUR }, (_, index) => index);
}

export function slotIndexToMinutes(slotIndex: number): number {
  return slotIndex * CALENDAR_SLOT_MINUTES;
}

export function slotIndexToTime(slotIndex: number): { hour: number; minute: number } {
  const totalMinutes = slotIndexToMinutes(slotIndex);
  return { hour: Math.floor(totalMinutes / 60), minute: totalMinutes % 60 };
}

export function formatSlotLabel(slotIndex: number): string | null {
  const { minute } = slotIndexToTime(slotIndex);
  if (minute !== 0) return null;
  return formatHourLabel(slotIndexToTime(slotIndex).hour);
}

export function getWeekDaysFromAnchor(anchorDate: Date): Date[] {
  const start = getWeekStartSunday(anchorDate);
  return Array.from({ length: CALENDAR_DAY_COUNT }, (_, index) => addDays(start, index));
}

/** Haftanin ilk gunu (Pazar) sol kolona hizalanir. */
export function getWeekStartSunday(date: Date): Date {
  const day = startOfDay(date);
  return addDays(day, -day.getDay());
}

export function getWeekDaysFromToday(baseDate = new Date()): Date[] {
  return getWeekDaysFromAnchor(baseDate);
}

export function shiftCalendarAnchor(
  anchorDate: Date,
  step: CalendarNavStep,
  direction: -1 | 1
): Date {
  if (step === "week") return startOfDay(addDays(anchorDate, direction * 7));
  if (step === "month") return startOfDay(addMonths(anchorDate, direction));
  return startOfDay(addYears(anchorDate, direction));
}

export function getDayHeaderLabel(day: Date): string {
  return format(day, "EEE", { locale: tr });
}

export function isTodayDay(day: Date, now = new Date()): boolean {
  return isSameDay(day, now);
}

export function formatCalendarRangeLabel(days: Date[]): string {
  if (days.length === 0) return "";
  const first = days[0];
  const last = days[days.length - 1];
  if (first.getFullYear() === last.getFullYear()) {
    if (first.getMonth() === last.getMonth()) {
      return `${format(first, "d", { locale: tr })} – ${format(last, "d MMM yyyy", { locale: tr })}`;
    }
    return `${format(first, "d MMM", { locale: tr })} – ${format(last, "d MMM yyyy", { locale: tr })}`;
  }
  return `${format(first, "d MMM yyyy", { locale: tr })} – ${format(last, "d MMM yyyy", { locale: tr })}`;
}

export function formatHourLabel(hour: number): string {
  return `${hour.toString().padStart(2, "0")}:00`;
}

export function getCalendarTotalHeightPx(): number {
  return CALENDAR_SLOTS_COUNT * CALENDAR_SLOT_HEIGHT_PX;
}

/** Border kullanmadan sabit yukseklikli grid cizgileri. */
export function getCalendarGridBackgroundStyle(): {
  height: number;
  backgroundImage: string;
  backgroundSize: string;
} {
  const halfHourLine = "rgba(51, 65, 85, 0.2)";
  const hourLine = "rgba(51, 65, 85, 0.45)";
  return {
    height: getCalendarTotalHeightPx(),
    backgroundImage: [
      `repeating-linear-gradient(to bottom, ${halfHourLine} 0px, ${halfHourLine} 1px, transparent 1px, transparent ${CALENDAR_SLOT_HEIGHT_PX}px)`,
      `repeating-linear-gradient(to bottom, ${hourLine} 0px, ${hourLine} 1px, transparent 1px, transparent ${CALENDAR_SLOT_HEIGHT_PX * 2}px)`,
    ].join(", "),
    backgroundSize: "100% 100%",
  };
}

export function formatRowRangeLabel(startRow: number, endRow: number): string {
  const minRow = Math.min(startRow, endRow);
  const maxRow = Math.max(startRow, endRow);
  const start = slotIndexToTime(minRow);
  const endMinutes = slotIndexToMinutes(maxRow + 1);
  const endHour = Math.floor(endMinutes / 60);
  const endMinute = endMinutes % 60;
  const startStr = `${String(start.hour).padStart(2, "0")}:${String(start.minute).padStart(2, "0")}`;
  const endStr =
    endMinutes >= 24 * 60
      ? "24:00"
      : `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;
  return `${startStr} – ${endStr}`;
}

export interface CalendarBlockPlacement {
  topPx: number;
  heightPx: number;
}

export function minutesToTopPx(minutesFromMidnight: number): number {
  return (minutesFromMidnight / CALENDAR_SLOT_MINUTES) * CALENDAR_SLOT_HEIGHT_PX;
}

export function getBlockPlacement(startAt: string, endAt: string): CalendarBlockPlacement {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const dayAnchor = startOfDay(start);
  const minutesFromStart = differenceInMinutes(start, dayAnchor);
  const durationMinutes = Math.max(differenceInMinutes(end, start), CALENDAR_SLOT_MINUTES);

  return {
    topPx: minutesToTopPx(minutesFromStart),
    heightPx: Math.max(minutesToTopPx(durationMinutes), CALENDAR_SLOT_HEIGHT_PX / 2),
  };
}

export function getNowIndicatorTopPx(now = new Date()): number {
  const minutes = now.getHours() * 60 + now.getMinutes();
  return minutesToTopPx(minutes);
}

export function blockBelongsToDay(blockStartIso: string, day: Date): boolean {
  return isSameDay(new Date(blockStartIso), day);
}

export function rowIndexFromOffsetY(offsetY: number): number {
  const rowIndex = Math.floor(offsetY / CALENDAR_SLOT_HEIGHT_PX);
  return Math.min(Math.max(rowIndex, 0), CALENDAR_SLOTS_COUNT - 1);
}

export function rowIndexFromPointer(columnTop: number, clientY: number): number {
  return rowIndexFromOffsetY(clientY - columnTop);
}

export function buildRangeFromRows(day: Date, startRow: number, endRow: number): {
  startAt: string;
  endAt: string;
} {
  const minRow = Math.min(startRow, endRow);
  const maxRow = Math.max(startRow, endRow);
  const dayStart = startOfDay(day);
  const start = addMinutes(dayStart, slotIndexToMinutes(minRow));
  const endMinutes = slotIndexToMinutes(maxRow + 1);
  const end =
    endMinutes >= 24 * 60 ? addDays(dayStart, 1) : addMinutes(dayStart, endMinutes);

  return { startAt: start.toISOString(), endAt: end.toISOString() };
}

export function formatSelectionTimeRange(day: Date, startRow: number, endRow: number): string {
  void day;
  return formatRowRangeLabel(startRow, endRow);
}

export function getPreviewPlacement(startRow: number, endRow: number): CalendarBlockPlacement {
  const minRow = Math.min(startRow, endRow);
  const maxRow = Math.max(startRow, endRow);
  return {
    topPx: minRow * CALENDAR_SLOT_HEIGHT_PX,
    heightPx: (maxRow - minRow + 1) * CALENDAR_SLOT_HEIGHT_PX,
  };
}

export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function selectionOverlapsManualBlocks(
  day: Date,
  startRow: number,
  endRow: number,
  blocks: { start_at: string; end_at: string }[]
): boolean {
  const range = buildRangeFromRows(day, startRow, endRow);
  const selectionStart = new Date(range.startAt);
  const selectionEnd = new Date(range.endAt);

  return blocks.some((block) => {
    if (!blockBelongsToDay(block.start_at, day)) return false;
    return rangesOverlap(
      selectionStart,
      selectionEnd,
      new Date(block.start_at),
      new Date(block.end_at)
    );
  });
}

export function selectionOverlapsPending(
  day: Date,
  startRow: number,
  endRow: number,
  dayIndex: number,
  pending: { dayIndex: number; startRow: number; endRow: number }[]
): boolean {
  return pending.some((item) => {
    if (item.dayIndex !== dayIndex) return false;
    const a = buildRangeFromRows(day, startRow, endRow);
    const b = buildRangeFromRows(day, item.startRow, item.endRow);
    return rangesOverlap(new Date(a.startAt), new Date(a.endAt), new Date(b.startAt), new Date(b.endAt));
  });
}
