import { describe, expect, it } from "vitest";
import { addDays } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { computeFreeIntervals } from "@/lib/scheduler/freeIntervals";
import { buildSchedulerPreferences } from "@/lib/scheduler/preferences";
import { isSlotAllowedForQuadrantMode } from "@/lib/scheduling/userPreferences";

const TIMEZONE = "Europe/Istanbul";
const DAY = "2026-08-03";

const baseProfile = {
  timezone: TIMEZONE,
  work_start: "10:00:00",
  work_end: "17:00:00",
  work_days: [1, 2, 3, 4, 5],
  active_start: "07:00:00",
  active_end: "22:00:00",
  active_days: [1, 2, 3, 4, 5, 6, 7],
  urgent_schedule_mode: "active_hours" as const,
  plan_schedule_mode: "work_hours" as const,
  get_rid_schedule_mode: "work_hours" as const,
  lunch_start: "12:30:00",
  lunch_end: "13:30:00",
  buffer_minutes: 0,
  min_focus_block_minutes: 30,
  max_daily_focus_minutes: 480,
};

describe("buildSchedulerPreferences", () => {
  it("aktif saat penceresinde bos aralik uretir", () => {
    const preferences = buildSchedulerPreferences(baseProfile);

    const intervals = computeFreeIntervals({
      commitments: [],
      preferences,
      searchWindow: {
        start: fromZonedTime(`${DAY}T00:00:00`, TIMEZONE),
        end: addDays(fromZonedTime(`${DAY}T00:00:00`, TIMEZONE), 1),
      },
      now: fromZonedTime(`${DAY}T00:00:00`, TIMEZONE),
    });

    expect(intervals[0].start).toEqual(fromZonedTime(`${DAY}T07:00:00`, TIMEZONE));
    expect(intervals[intervals.length - 1].end).toEqual(
      fromZonedTime(`${DAY}T22:00:00`, TIMEZONE)
    );
  });

  it("aktif saat modu calisma disi saatlere izin verir", () => {
    const preferences = buildSchedulerPreferences(baseProfile);
    const start = fromZonedTime(`${DAY}T20:00:00`, TIMEZONE);
    const end = fromZonedTime(`${DAY}T21:00:00`, TIMEZONE);

    expect(
      isSlotAllowedForQuadrantMode({
        start,
        end,
        mode: "active_hours",
        preferences: {
          timezone: TIMEZONE,
          workStart: preferences.workStart,
          workEnd: preferences.workEnd,
          workDays: preferences.workDays,
          activeStart: preferences.activeStart,
          activeEnd: preferences.activeEnd,
          activeDays: preferences.activeDays,
        },
      })
    ).toBe(true);

    expect(
      isSlotAllowedForQuadrantMode({
        start,
        end,
        mode: "work_hours",
        preferences: {
          timezone: TIMEZONE,
          workStart: preferences.workStart,
          workEnd: preferences.workEnd,
          workDays: preferences.workDays,
          activeStart: preferences.activeStart,
          activeEnd: preferences.activeEnd,
          activeDays: preferences.activeDays,
        },
      })
    ).toBe(false);
  });
});
