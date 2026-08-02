import { describe, expect, it } from "vitest";
import {
  durationPresetToMinutes,
  minutesToDurationPreset,
  minutesToTaskSize,
  normalizeEstimatedMinutes,
  TASK_DURATION_CONFIG,
  taskSizeSchedulingDefaults,
} from "@/lib/taskSize";

describe("taskSize", () => {
  it("sure presetlerini dakikaya cevirir", () => {
    expect(durationPresetToMinutes("30m")).toBe(30);
    expect(durationPresetToMinutes("1h")).toBe(60);
    expect(durationPresetToMinutes("5h")).toBe(300);
    expect(durationPresetToMinutes("full_week")).toBe(4200);
  });

  it("serbest dakika tahminini en yakin preset'e yuvarlar", () => {
    expect(minutesToDurationPreset(50)).toBe("1h");
    expect(minutesToDurationPreset(200)).toBe("2h");
    expect(minutesToDurationPreset(450)).toBe("5h");
    expect(minutesToDurationPreset(800)).toBe("10h");
    expect(normalizeEstimatedMinutes(50)).toBe(60);
    expect(minutesToTaskSize(50)).toBe("1h");
  });

  it("5 saat ve uzeri presetler bolunebilir", () => {
    expect(taskSizeSchedulingDefaults("5h").splittable).toBe(true);
    expect(taskSizeSchedulingDefaults("10h").splittable).toBe(true);
    expect(taskSizeSchedulingDefaults("full_week").splittable).toBe(true);
    expect(taskSizeSchedulingDefaults("2h").splittable).toBe(false);
    expect(TASK_DURATION_CONFIG["30m"].label).toBe("30 dk");
  });
});
