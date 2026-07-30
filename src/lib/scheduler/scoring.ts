import { differenceInMinutes, getHours } from "date-fns";
import type { ExistingCommitment, SchedulableTask, TimeRange, WorkingHoursPreferences } from "./types";

/**
 * Agirlikli puanlama formulu (dokuman bolum 10.3):
 *
 * score = deadlineUrgency*0.30 + eisenhowerPriority*0.25 + uninterruptedFit*0.20
 *       + preferredFocusTime*0.15 + dailyLoadBalance*0.10
 *       - splitPenalty - meetingAdjacencyPenalty
 *
 * Agirliklar ilk surumde sabittir; kullanicinin kabul/ret davranisina gore
 * zamanla kisisellestirilebilir (bkz. task_feedback tablosu, Faz 3 sonrasi).
 */
const WEIGHTS = {
  deadlineUrgency: 0.3,
  eisenhowerPriority: 0.25,
  uninterruptedFit: 0.2,
  preferredFocusTime: 0.15,
  dailyLoadBalance: 0.1,
} as const;

const QUADRANT_PRIORITY: Record<string, number> = {
  urgent_important: 1,
  not_urgent_important: 0.75,
  urgent_not_important: 0.5,
  not_urgent_not_important: 0.25,
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function scoreDeadlineUrgency(candidateStart: Date, now: Date, deadline: Date | null) {
  if (!deadline) return 0.5;
  const totalWindow = deadline.getTime() - now.getTime();
  if (totalWindow <= 0) return 1;
  const remaining = deadline.getTime() - candidateStart.getTime();
  return clamp01(1 - remaining / totalWindow);
}

function scoreEisenhowerPriority(quadrant: string | null) {
  if (!quadrant) return 0.5;
  return QUADRANT_PRIORITY[quadrant] ?? 0.5;
}

function scoreUninterruptedFit(
  candidateDurationMinutes: number,
  intervalDurationMinutes: number,
  minFocusBlockMinutes: number
) {
  const leftover = intervalDurationMinutes - candidateDurationMinutes;
  if (leftover <= 0) return 1;
  if (leftover >= minFocusBlockMinutes) return 0.85;
  // Kucuk, kullanilamaz bir bosluk birakiyor; hafifce cezalandir.
  return 0.4;
}

function scorePreferredFocusTime(candidateStart: Date, energy: string | null) {
  const hour = getHours(candidateStart);
  if (energy === "high_focus") {
    // Sabah saatlerini tercih et (09:00-12:00 arasi en yuksek).
    return clamp01(1 - Math.abs(hour - 10) / 8);
  }
  if (energy === "low") {
    // Ogleden sonrayi tercih et.
    return clamp01(1 - Math.abs(hour - 15) / 8);
  }
  return 0.5;
}

function scoreDailyLoadBalance(
  candidateStart: Date,
  dailyLoadMinutesByDate: Record<string, number> | undefined,
  maxDailyFocusMinutes: number
) {
  if (!dailyLoadMinutesByDate) return 0.7;
  const dateKey = candidateStart.toISOString().slice(0, 10);
  const existingLoad = dailyLoadMinutesByDate[dateKey] ?? 0;
  return clamp01(1 - existingLoad / maxDailyFocusMinutes);
}

function computeMeetingAdjacencyPenalty(
  candidate: TimeRange,
  commitments: ExistingCommitment[],
  bufferMinutes: number
) {
  if (bufferMinutes <= 0) return 0;
  const closestGapMinutes = commitments.reduce((closest, commitment) => {
    const gapBefore = Math.abs(differenceInMinutes(candidate.start, commitment.end));
    const gapAfter = Math.abs(differenceInMinutes(commitment.start, candidate.end));
    return Math.min(closest, gapBefore, gapAfter);
  }, Number.POSITIVE_INFINITY);

  if (!Number.isFinite(closestGapMinutes)) return 0;
  if (closestGapMinutes <= bufferMinutes) return 0.05;
  return 0;
}

export function scoreCandidate(params: {
  candidate: TimeRange;
  intervalDurationMinutes: number;
  task: SchedulableTask;
  now: Date;
  preferences: WorkingHoursPreferences;
  commitments: ExistingCommitment[];
  dailyLoadMinutesByDate?: Record<string, number>;
  isSplitChunk: boolean;
}): { score: number; reason: string } {
  const { candidate, intervalDurationMinutes, task, now, preferences, commitments, isSplitChunk } =
    params;
  const candidateDurationMinutes = differenceInMinutes(candidate.end, candidate.start);

  const deadlineUrgency = scoreDeadlineUrgency(candidate.start, now, task.deadline);
  const eisenhowerPriority = scoreEisenhowerPriority(task.quadrant);
  const uninterruptedFit = scoreUninterruptedFit(
    candidateDurationMinutes,
    intervalDurationMinutes,
    preferences.minFocusBlockMinutes
  );
  const preferredFocusTime = scorePreferredFocusTime(candidate.start, task.energy);
  const dailyLoadBalance = scoreDailyLoadBalance(
    candidate.start,
    params.dailyLoadMinutesByDate,
    preferences.maxDailyFocusMinutes
  );
  const splitPenalty = isSplitChunk ? 0.1 : 0;
  const meetingAdjacencyPenalty = computeMeetingAdjacencyPenalty(
    candidate,
    commitments,
    preferences.bufferMinutes
  );

  const score =
    deadlineUrgency * WEIGHTS.deadlineUrgency +
    eisenhowerPriority * WEIGHTS.eisenhowerPriority +
    uninterruptedFit * WEIGHTS.uninterruptedFit +
    preferredFocusTime * WEIGHTS.preferredFocusTime +
    dailyLoadBalance * WEIGHTS.dailyLoadBalance -
    splitPenalty -
    meetingAdjacencyPenalty;

  const reasonParts = [
    task.deadline ? `deadline yakinligi ${(deadlineUrgency * 100).toFixed(0)}%` : null,
    `oncelik uyumu ${(eisenhowerPriority * 100).toFixed(0)}%`,
    `kesintisizlik ${(uninterruptedFit * 100).toFixed(0)}%`,
  ].filter(Boolean);

  return { score, reason: reasonParts.join(", ") };
}
