import { describe, expect, it } from "vitest";
import {
  estimateDurationHeuristic,
  resolveTaskDurationMinutes,
} from "@/lib/tasks/estimateDuration";
import { DEFAULT_ESTIMATED_MINUTES } from "@/lib/taskSize";

describe("estimateDuration", () => {
  it("metinden dakika cikarir", () => {
    expect(estimateDurationHeuristic("30 dk market")).toBe(30);
    expect(estimateDurationHeuristic("2 saat rapor yaz")).toBe(120);
  });

  it("bulamazsa null doner", () => {
    expect(estimateDurationHeuristic("belirsiz is")).toBeNull();
  });

  it("varsayilan 1 saat kullanir", () => {
    expect(resolveTaskDurationMinutes("belirsiz is", null)).toBe(DEFAULT_ESTIMATED_MINUTES);
    expect(resolveTaskDurationMinutes("belirsiz is", null, null)).toBe(60);
  });

  it("kayitli sureyi korur", () => {
    expect(resolveTaskDurationMinutes("test", 45)).toBe(45);
  });
});
