import type { EisenhowerQuadrant, StoredQuadrant } from "@/types/database";
import { normalizeQuadrant } from "@/lib/quadrant";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/** Deadline yakinligi nedeniyle etkin oncelik (Aksiyon Al override). */
export function getEffectiveQuadrant(
  quadrant: StoredQuadrant | null,
  deadline: Date | null,
  now: Date
): EisenhowerQuadrant | null {
  const normalized = normalizeQuadrant(quadrant);
  if (!deadline) return normalized;

  const msUntil = deadline.getTime() - now.getTime();

  if (msUntil <= TWENTY_FOUR_HOURS_MS) {
    return "urgent_important";
  }

  return normalized;
}

export function isUrgentDeadline(deadline: Date | null, now: Date): boolean {
  if (!deadline) return false;
  const msUntil = deadline.getTime() - now.getTime();
  return msUntil <= TWENTY_FOUR_HOURS_MS;
}

export function isImminentDeadline(deadline: Date | null, now: Date): boolean {
  if (!deadline) return false;
  const msUntil = deadline.getTime() - now.getTime();
  return msUntil > 0 && msUntil <= TWO_HOURS_MS;
}

export function quadrantPriorityRank(quadrant: StoredQuadrant | null): number {
  const normalized = normalizeQuadrant(quadrant);
  switch (normalized) {
    case "urgent_important":
      return 3;
    case "not_urgent_important":
      return 2;
    case "get_rid":
      return 1;
    default:
      return 0;
  }
}
