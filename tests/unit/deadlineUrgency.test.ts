import { describe, expect, it } from "vitest";
import {
  getEffectiveQuadrant,
  isImminentDeadline,
  isUrgentDeadline,
} from "@/lib/scheduler/deadlineUrgency";

describe("deadlineUrgency", () => {
  const now = new Date("2026-08-01T18:00:00+03:00");

  it("yakin deadline Kurtul isini Aksiyon Al'a cevirir", () => {
    const deadline = new Date("2026-08-01T18:10:00+03:00");
    expect(getEffectiveQuadrant("get_rid", deadline, now)).toBe("urgent_important");
  });

  it("24 saat icindeki deadline acil sayilir", () => {
    const deadline = new Date("2026-08-02T12:00:00+03:00");
    expect(isUrgentDeadline(deadline, now)).toBe(true);
  });

  it("2 saatten az kalan deadline yakın kabul edilir", () => {
    const deadline = new Date("2026-08-01T19:30:00+03:00");
    expect(isImminentDeadline(deadline, now)).toBe(true);
  });
});
