import { describe, expect, it } from "vitest";
import { addDays, startOfDay } from "date-fns";
import { getRescheduleSearchWindow } from "@/lib/scheduler/rescheduleTask";

describe("rescheduleTask windows", () => {
  const now = new Date("2026-08-01T19:00:00+03:00");

  it("ilk uygun zaman simdi baslar", () => {
    const window = getRescheduleSearchWindow("first_available", now);
    expect(window.start.getTime()).toBe(now.getTime());
  });

  it("mesai saatleri icinde bugun 09:00 veya simdi baslar", () => {
    const window = getRescheduleSearchWindow("within_work_hours", now);
    expect(window.start.getHours()).toBe(19);
  });

  it("gelecek hafta ayni gun referans gununden 7 gun sonra baslar", () => {
    const reference = new Date("2026-08-03T14:00:00+03:00");
    const window = getRescheduleSearchWindow("same_day_next_week", now, undefined, reference);
    expect(window.start).toEqual(startOfDay(addDays(reference, 7)));
  });
});
