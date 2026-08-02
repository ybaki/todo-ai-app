import { describe, expect, it } from "vitest";
import { FULL_WEEK_MINUTES } from "@/lib/taskSize";
import {
  getDurationVerticalLabel,
  getTaskDurationVerticalLabel,
  getTaskRowCardStyle,
} from "@/lib/taskDurationVisual";

describe("taskDurationVisual", () => {
  it("dikey etiketleri preset'e gore uretir", () => {
    expect(getDurationVerticalLabel("30m")).toBe("30 dk");
    expect(getDurationVerticalLabel("1h")).toBe("1 s");
    expect(getDurationVerticalLabel("10h")).toBe("10 s");
  });

  it("dakikadan etiket turetir", () => {
    expect(getTaskDurationVerticalLabel("test", 30)).toBe("30 dk");
    expect(getTaskDurationVerticalLabel("test", 60)).toBe("1 s");
  });

  it("sure arttikca kart tonu koyulasir", () => {
    const light = getTaskRowCardStyle({
      quadrant: "urgent_important",
      rawText: "kisa",
      estimatedMinutes: 30,
      isDone: false,
    });
    const dark = getTaskRowCardStyle({
      quadrant: "urgent_important",
      rawText: "uzun",
      estimatedMinutes: FULL_WEEK_MINUTES,
      isDone: false,
    });

    expect(light).toContain("red-300");
    expect(dark).toContain("red-950");
    expect(light).not.toBe(dark);
  });
});
