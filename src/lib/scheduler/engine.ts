import { addMinutes, differenceInMinutes } from "date-fns";
import { computeFreeIntervals } from "./freeIntervals";
import { scoreCandidate } from "./scoring";
import type { GenerateCandidatesInput, ScheduleCandidate, TimeRange } from "./types";

const SLOT_GRID_MINUTES = 15;
const TOP_N = 3;

function snapToGrid(date: Date): Date {
  const ms = date.getTime();
  const gridMs = SLOT_GRID_MINUTES * 60_000;
  return new Date(Math.ceil(ms / gridMs) * gridMs);
}

interface RawCandidate extends TimeRange {
  intervalDurationMinutes: number;
  isSplitChunk: boolean;
}

function buildRawCandidates(
  freeIntervals: TimeRange[],
  input: GenerateCandidatesInput
): RawCandidate[] {
  const { task } = input;
  const candidates: RawCandidate[] = [];

  for (const interval of freeIntervals) {
    const alignedStart = snapToGrid(interval.start);
    if (alignedStart >= interval.end) continue;

    const availableMinutes = differenceInMinutes(interval.end, alignedStart);

    if (availableMinutes >= task.estimatedMinutes) {
      const end = addMinutes(alignedStart, task.estimatedMinutes);
      candidates.push({
        start: alignedStart,
        end,
        intervalDurationMinutes: availableMinutes,
        isSplitChunk: false,
      });
      continue;
    }

    if (task.splittable && task.minimumChunkMinutes && availableMinutes >= task.minimumChunkMinutes) {
      const end = addMinutes(alignedStart, availableMinutes);
      candidates.push({
        start: alignedStart,
        end,
        intervalDurationMinutes: availableMinutes,
        isSplitChunk: true,
      });
    }
  }

  return candidates;
}

/**
 * Gorev icin en yuksek puanli en fazla 3 aday slotu dondurur.
 * Bkz. dokuman bolum 10.2 (slot uretim algoritmasi) adim 3-5.
 */
export function generateScheduleCandidates(input: GenerateCandidatesInput): ScheduleCandidate[] {
  const freeIntervals = computeFreeIntervals({
    commitments: input.commitments,
    preferences: input.preferences,
    searchWindow: input.searchWindow,
    now: input.now,
  });

  const rawCandidates = buildRawCandidates(freeIntervals, input).filter((candidate) => {
    // Deadline sonrasina asla oneri uretme.
    if (input.task.deadline && candidate.end > input.task.deadline) return false;
    return true;
  });

  const scored: ScheduleCandidate[] = rawCandidates.map((candidate) => {
    const { score, reason } = scoreCandidate({
      candidate,
      intervalDurationMinutes: candidate.intervalDurationMinutes,
      task: input.task,
      now: input.now,
      preferences: input.preferences,
      commitments: input.commitments,
      dailyLoadMinutesByDate: input.dailyLoadMinutesByDate,
      isSplitChunk: candidate.isSplitChunk,
    });

    return { start: candidate.start, end: candidate.end, score, reason };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, TOP_N);
}
