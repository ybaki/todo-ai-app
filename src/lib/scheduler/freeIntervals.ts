import { fromZonedTime } from "date-fns-tz";
import { addDays, format, max as dateMax, min as dateMin } from "date-fns";
import type { ExistingCommitment, TimeRange, WorkingHoursPreferences } from "./types";

function mergeRanges(ranges: TimeRange[]): TimeRange[] {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: TimeRange[] = [sorted[0]];

  for (const current of sorted.slice(1)) {
    const last = merged[merged.length - 1];
    if (current.start.getTime() <= last.end.getTime()) {
      last.end = dateMax([last.end, current.end]);
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

function subtractRanges(base: TimeRange, blockers: TimeRange[]): TimeRange[] {
  let free: TimeRange[] = [base];

  for (const blocker of blockers) {
    const next: TimeRange[] = [];
    for (const interval of free) {
      const overlapStart = dateMax([interval.start, blocker.start]);
      const overlapEnd = dateMin([interval.end, blocker.end]);

      if (overlapStart >= overlapEnd) {
        // Cakisma yok, interval oldugu gibi kalir.
        next.push(interval);
        continue;
      }

      if (interval.start < overlapStart) {
        next.push({ start: interval.start, end: overlapStart });
      }
      if (overlapEnd < interval.end) {
        next.push({ start: overlapEnd, end: interval.end });
      }
    }
    free = next;
  }

  return free.filter((interval) => interval.end.getTime() - interval.start.getTime() > 0);
}

function applyBuffer(range: TimeRange, bufferMinutes: number): TimeRange {
  const bufferMs = bufferMinutes * 60_000;
  return {
    start: new Date(range.start.getTime() - bufferMs),
    end: new Date(range.end.getTime() + bufferMs),
  };
}

/**
 * Calisma saatleri, ogle arasi, toplanti tamponlari ve mevcut
 * meskuliyetleri (busy + zaten planlanmis) dikkate alarak, verilen arama
 * penceresi icindeki bos araliklari uretir. Bkz. dokuman bolum 10.2 adim 1-2.
 */
export function computeFreeIntervals(params: {
  commitments: ExistingCommitment[];
  preferences: WorkingHoursPreferences;
  searchWindow: TimeRange;
  now: Date;
}): TimeRange[] {
  const { commitments, preferences, searchWindow, now } = params;
  const { timezone, workStart, workEnd, lunchStart, lunchEnd, bufferMinutes } = preferences;

  const bufferedCommitments = commitments.map((commitment) =>
    applyBuffer(commitment, bufferMinutes)
  );

  const freeIntervals: TimeRange[] = [];
  let cursor = new Date(searchWindow.start);

  while (cursor < searchWindow.end) {
    const dateStr = format(cursor, "yyyy-MM-dd");
    const dayWorkStart = fromZonedTime(`${dateStr}T${workStart}:00`, timezone);
    const dayWorkEnd = fromZonedTime(`${dateStr}T${workEnd}:00`, timezone);

    const dayBlockers: TimeRange[] = bufferedCommitments.filter(
      (commitment) => commitment.start < dayWorkEnd && commitment.end > dayWorkStart
    );

    if (lunchStart && lunchEnd) {
      dayBlockers.push({
        start: fromZonedTime(`${dateStr}T${lunchStart}:00`, timezone),
        end: fromZonedTime(`${dateStr}T${lunchEnd}:00`, timezone),
      });
    }

    const merged = mergeRanges(dayBlockers);
    const dayFree = subtractRanges({ start: dayWorkStart, end: dayWorkEnd }, merged);

    for (const interval of dayFree) {
      const clippedStart = dateMax([interval.start, searchWindow.start, now]);
      const clippedEnd = dateMin([interval.end, searchWindow.end]);
      if (clippedStart < clippedEnd) {
        freeIntervals.push({ start: clippedStart, end: clippedEnd });
      }
    }

    cursor = addDays(cursor, 1);
  }

  return freeIntervals;
}
