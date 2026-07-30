import type { EisenhowerQuadrant, EnergyLevel } from "@/types/database";

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface WorkingHoursPreferences {
  timezone: string;
  workStart: string; // "HH:mm"
  workEnd: string; // "HH:mm"
  lunchStart: string | null;
  lunchEnd: string | null;
  bufferMinutes: number;
  minFocusBlockMinutes: number;
  maxDailyFocusMinutes: number;
}

export interface SchedulableTask {
  id: string;
  estimatedMinutes: number;
  minimumChunkMinutes: number | null;
  splittable: boolean;
  quadrant: EisenhowerQuadrant | null;
  deadline: Date | null;
  energy: EnergyLevel | null;
}

export interface ExistingCommitment extends TimeRange {
  /** Var olan uygulama-ici planlar da "meskul" kabul edilir; cakisma yaratilmaz. */
  kind: "busy" | "scheduled";
}

export interface ScheduleCandidate extends TimeRange {
  score: number;
  reason: string;
}

export interface GenerateCandidatesInput {
  task: SchedulableTask;
  commitments: ExistingCommitment[];
  preferences: WorkingHoursPreferences;
  searchWindow: TimeRange;
  now: Date;
  /** Bir onceki gunun toplam planlanan dakikasi (dailyLoadBalance puanlamasi icin). */
  dailyLoadMinutesByDate?: Record<string, number>;
}
