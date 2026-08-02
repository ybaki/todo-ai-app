import { describe, expect, it } from "vitest";
import { classifyTaskCategory } from "@/lib/scheduler/taskCategory";
import { isCandidateSlotAllowed } from "@/lib/scheduler/slotRules";
import { fromZonedTime } from "date-fns-tz";

const TIMEZONE = "Europe/Istanbul";

describe("taskCategory", () => {
  it("teknik metinleri ayirt eder", () => {
    expect(classifyTaskCategory([], "contract testleri yaz")).toBe("technical");
  });

  it("gunluk isleri ayirt eder", () => {
    expect(classifyTaskCategory([], "arabayi yikat")).toBe("daily");
  });
});

describe("slotRules", () => {
  const now = fromZonedTime("2026-08-03T10:00:00", TIMEZONE);
  const preferences = {
    timezone: TIMEZONE,
    workStart: "09:00",
    workEnd: "18:00",
    workDays: [1, 2, 3, 4, 5] as const,
    activeStart: "07:00",
    activeEnd: "23:00",
    activeDays: [1, 2, 3, 4, 5, 6, 7] as const,
    urgentScheduleMode: "active_hours" as const,
    planScheduleMode: "work_hours" as const,
    getRidScheduleMode: "work_hours" as const,
    lunchStart: null,
    lunchEnd: null,
    bufferMinutes: 0,
    minFocusBlockMinutes: 30,
    maxDailyFocusMinutes: 480,
  };

  it("teknik isleri 18:00 sonrasina almaz", () => {
    const start = fromZonedTime("2026-08-03T18:30:00", TIMEZONE);
    const end = fromZonedTime("2026-08-03T19:30:00", TIMEZONE);
    expect(
      isCandidateSlotAllowed({
        candidate: { start, end },
        task: {
          id: "1",
          rawText: "unit test yaz",
          tags: ["teknik"],
          estimatedMinutes: 60,
          minimumChunkMinutes: 60,
          splittable: false,
          quadrant: "not_urgent_important",
          deadline: null,
          energy: null,
        },
        timezone: TIMEZONE,
        now,
        scheduledTasks: [],
        preferences,
      })
    ).toBe(false);
  });

  it("aksiyon isleri aktif saat modunda gece slotuna izin verir", () => {
    const start = fromZonedTime("2026-08-03T22:00:00", TIMEZONE);
    const end = fromZonedTime("2026-08-03T23:00:00", TIMEZONE);
    expect(
      isCandidateSlotAllowed({
        candidate: { start, end },
        task: {
          id: "1",
          rawText: "acil is",
          tags: [],
          estimatedMinutes: 60,
          minimumChunkMinutes: 60,
          splittable: false,
          quadrant: "urgent_important",
          deadline: new Date("2026-08-03T23:30:00+03:00"),
          energy: null,
        },
        timezone: TIMEZONE,
        now,
        scheduledTasks: [],
        preferences,
      })
    ).toBe(true);
  });
});
