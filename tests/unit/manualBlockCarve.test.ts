import { describe, expect, it } from "vitest";
import { subtractRangeFromBlock } from "@/lib/calendar/manualBlockCarve";

describe("subtractRangeFromBlock", () => {
  it("removes overlapping middle from manual block", () => {
    const blockStart = new Date("2026-08-03T13:00:00");
    const blockEnd = new Date("2026-08-03T15:00:00");
    const meetingStart = new Date("2026-08-03T14:00:00");
    const meetingEnd = new Date("2026-08-03T15:00:00");

    const remaining = subtractRangeFromBlock(blockStart, blockEnd, meetingStart, meetingEnd);

    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.start.toISOString()).toBe(blockStart.toISOString());
    expect(remaining[0]?.end.toISOString()).toBe(meetingStart.toISOString());
  });

  it("returns empty when meeting fully covers block", () => {
    const blockStart = new Date("2026-08-03T14:00:00");
    const blockEnd = new Date("2026-08-03T15:00:00");
    const meetingStart = new Date("2026-08-03T13:00:00");
    const meetingEnd = new Date("2026-08-03T16:00:00");

    const remaining = subtractRangeFromBlock(blockStart, blockEnd, meetingStart, meetingEnd);

    expect(remaining).toHaveLength(0);
  });
});
