import { addMinutes, differenceInMinutes } from "date-fns";
import { computeFreeIntervals } from "./freeIntervals";
import { isImminentDeadline } from "./deadlineUrgency";
import { scoreCandidate } from "./scoring";
import { isCandidateSlotAllowed } from "./slotRules";
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
      const chunkMinutes = Math.min(availableMinutes, task.estimatedMinutes);
      const end = addMinutes(alignedStart, chunkMinutes);
      candidates.push({
        start: alignedStart,
        end,
        intervalDurationMinutes: availableMinutes,
        isSplitChunk: chunkMinutes < task.estimatedMinutes,
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

  const scheduledTasks = input.scheduledTasks ?? [];

  const rawCandidates = buildRawCandidates(freeIntervals, input).filter((candidate) => {
    if (input.task.deadline && candidate.end > input.task.deadline) return false;

    return isCandidateSlotAllowed({
      candidate,
      task: input.task,
      timezone: input.preferences.timezone,
      now: input.now,
      scheduledTasks,
      preferences: input.preferences,
    });
  });

  const preferEarliest = isImminentDeadline(input.task.deadline, input.now);

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

  return scored
    .sort((a, b) => {
      if (preferEarliest && a.score !== b.score) {
        return b.score - a.score;
      }
      if (a.score !== b.score) return b.score - a.score;
      return a.start.getTime() - b.start.getTime();
    })
    .slice(0, TOP_N);
}

/**
 * Tek bir gorev icin tum parcalari (split dahil) planlar.
 */
export function planTaskTimeBlocks(input: GenerateCandidatesInput): TimeRange[] {
  let remainingMinutes = input.task.estimatedMinutes;
  const blocks: TimeRange[] = [];
  const commitments = [...input.commitments];

  for (let attempt = 0; attempt < 14 && remainingMinutes > 0; attempt += 1) {
    const chunkTask = {
      ...input.task,
      estimatedMinutes: remainingMinutes,
    };

    const candidates = generateScheduleCandidates({
      ...input,
      task: chunkTask,
      commitments,
    });

    if (candidates.length === 0) break;

    const best = candidates[0];
    const chunkMinutes = differenceInMinutes(best.end, best.start);
    blocks.push({ start: best.start, end: best.end });
    commitments.push({
      start: best.start,
      end: best.end,
      kind: "scheduled",
      taskId: input.task.id,
      quadrant: input.task.quadrant,
    });
    remainingMinutes -= chunkMinutes;
  }

  return blocks;
}
