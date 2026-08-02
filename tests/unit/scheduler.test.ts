import { describe, expect, it } from "vitest";
import { fromZonedTime } from "date-fns-tz";
import { computeFreeIntervals } from "@/lib/scheduler/freeIntervals";
import { generateScheduleCandidates } from "@/lib/scheduler/engine";
import type {
  ExistingCommitment,
  SchedulableTask,
  WorkingHoursPreferences,
} from "@/lib/scheduler/types";

const TIMEZONE = "Europe/Istanbul";

const basePreferences: WorkingHoursPreferences = {
  timezone: TIMEZONE,
  workStart: "09:00",
  workEnd: "18:00",
  workDays: [1, 2, 3, 4, 5],
  activeStart: "09:00",
  activeEnd: "18:00",
  activeDays: [1, 2, 3, 4, 5],
  urgentScheduleMode: "work_hours",
  planScheduleMode: "work_hours",
  getRidScheduleMode: "work_hours",
  lunchStart: "12:30",
  lunchEnd: "13:30",
  bufferMinutes: 15,
  minFocusBlockMinutes: 30,
  maxDailyFocusMinutes: 240,
};

function istanbul(dateStr: string, timeStr: string) {
  return fromZonedTime(`${dateStr}T${timeStr}:00`, TIMEZONE);
}

const NOW = istanbul("2026-08-01", "00:00");
const DAY = "2026-08-03"; // Pazartesi

describe("computeFreeIntervals", () => {
  it("calisma saatleri disini ve ogle arasini bos araliklardan cikarir", () => {
    const intervals = computeFreeIntervals({
      commitments: [],
      preferences: basePreferences,
      searchWindow: { start: istanbul(DAY, "00:00"), end: istanbul(DAY, "23:59") },
      now: NOW,
    });

    expect(intervals).toHaveLength(2);
    expect(intervals[0].start).toEqual(istanbul(DAY, "09:00"));
    expect(intervals[0].end).toEqual(istanbul(DAY, "12:30"));
    expect(intervals[1].start).toEqual(istanbul(DAY, "13:30"));
    expect(intervals[1].end).toEqual(istanbul(DAY, "18:00"));
  });

  it("mevcut toplantilari buffer ile birlikte cikarir", () => {
    const commitments: ExistingCommitment[] = [
      { start: istanbul(DAY, "10:00"), end: istanbul(DAY, "10:30"), kind: "busy" },
    ];

    const intervals = computeFreeIntervals({
      commitments,
      preferences: basePreferences,
      searchWindow: { start: istanbul(DAY, "09:00"), end: istanbul(DAY, "12:30") },
      now: NOW,
    });

    // 15 dk buffer: 09:45'e kadar bos, 10:45'ten 12:30'a kadar bos.
    expect(intervals[0].end).toEqual(istanbul(DAY, "09:45"));
    expect(intervals[1].start).toEqual(istanbul(DAY, "10:45"));
  });
});

describe("generateScheduleCandidates", () => {
  const task: SchedulableTask = {
    id: "task-1",
    rawText: "test gorevi",
    tags: [],
    estimatedMinutes: 90,
    minimumChunkMinutes: 45,
    splittable: true,
    quadrant: "urgent_important",
    deadline: null,
    energy: "high_focus",
  };

  it("deadline sonrasina asla oneri uretmez", () => {
    const deadline = istanbul(DAY, "10:00");
    const candidates = generateScheduleCandidates({
      task: { ...task, deadline },
      commitments: [],
      preferences: basePreferences,
      searchWindow: { start: istanbul(DAY, "00:00"), end: istanbul(DAY, "23:59") },
      now: NOW,
    });

    for (const candidate of candidates) {
      expect(candidate.end.getTime()).toBeLessThanOrEqual(deadline.getTime());
    }
  });

  it("yeterli bos zaman varsa tam sureli (split olmayan) aday uretir", () => {
    const candidates = generateScheduleCandidates({
      task,
      commitments: [],
      preferences: basePreferences,
      searchWindow: { start: istanbul(DAY, "00:00"), end: istanbul(DAY, "23:59") },
      now: NOW,
    });

    expect(candidates.length).toBeGreaterThan(0);
    const best = candidates[0];
    expect((best.end.getTime() - best.start.getTime()) / 60_000).toBe(90);
  });

  it("yalnizca minimumChunkMinutes kadar bos alan varsa split aday uretir", () => {
    // 09:00-12:30 blogunu 09:45 disinda tamamen mesgul yaparak yalnizca
    // 45 dakikalik bir bosluk birakiyoruz (< 90 dk tam gorev suresi).
    const commitments: ExistingCommitment[] = [
      { start: istanbul(DAY, "10:30"), end: istanbul(DAY, "18:00"), kind: "busy" },
    ];

    const candidates = generateScheduleCandidates({
      task,
      commitments,
      preferences: basePreferences,
      searchWindow: { start: istanbul(DAY, "09:00"), end: istanbul(DAY, "19:00") },
      now: NOW,
    });

    expect(candidates.length).toBeGreaterThan(0);
    const durationMinutes = (candidates[0].end.getTime() - candidates[0].start.getTime()) / 60_000;
    expect(durationMinutes).toBeLessThan(90);
    expect(durationMinutes).toBeGreaterThanOrEqual(task.minimumChunkMinutes!);
  });

  it("urgent_important gorev, dusuk oncelikli gorevden daha yuksek puan alir", () => {
    const preferences = basePreferences;
    const window = { start: istanbul(DAY, "09:00"), end: istanbul(DAY, "12:00") };

    const urgentCandidates = generateScheduleCandidates({
      task: { ...task, quadrant: "urgent_important", splittable: false },
      commitments: [],
      preferences,
      searchWindow: window,
      now: NOW,
    });

    const lowPriorityCandidates = generateScheduleCandidates({
      task: { ...task, quadrant: "get_rid", splittable: false },
      commitments: [],
      preferences,
      searchWindow: window,
      now: NOW,
    });

    expect(urgentCandidates[0].score).toBeGreaterThan(lowPriorityCandidates[0].score);
  });
});
