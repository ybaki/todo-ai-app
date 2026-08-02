import type { EisenhowerQuadrant, EnergyLevel } from "@/types/database";

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface WorkingHoursPreferences {
  timezone: string;
  workStart: string; // "HH:mm"
  workEnd: string;
  workDays: import("@/lib/scheduling/userPreferences").IsoWeekday[];
  activeStart: string;
  activeEnd: string;
  activeDays: import("@/lib/scheduling/userPreferences").IsoWeekday[];
  urgentScheduleMode: import("@/lib/scheduling/userPreferences").QuadrantScheduleMode;
  planScheduleMode: import("@/lib/scheduling/userPreferences").QuadrantScheduleMode;
  getRidScheduleMode: import("@/lib/scheduling/userPreferences").QuadrantScheduleMode;
  lunchStart: string | null;
  lunchEnd: string | null;
  bufferMinutes: number;
  minFocusBlockMinutes: number;
  maxDailyFocusMinutes: number;
}

export interface SchedulableTask {
  id: string;
  rawText: string;
  tags: string[];
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
  taskId?: string;
  quadrant?: EisenhowerQuadrant | null;
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
  scheduledTasks?: Array<{ start: Date; end: Date; quadrant: EisenhowerQuadrant | null }>;
}
