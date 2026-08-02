import { describe, expect, it } from "vitest";
import {
  formatTaskDeadline,
  fromDatetimeLocalValue,
  isDeadlinePast,
  toDatetimeLocalValue,
} from "@/lib/deadline";

describe("deadline utils", () => {
  it("datetime-local ve ISO arasinda donusum yapar", () => {
    const iso = "2026-07-31T14:30:00.000Z";
    const local = toDatetimeLocalValue(iso);
    expect(local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(fromDatetimeLocalValue(local)).toBeTruthy();
  });

  it("bos datetime-local null doner", () => {
    expect(fromDatetimeLocalValue("")).toBeNull();
  });

  it("deadline metnini Turkce formatlar", () => {
    const formatted = formatTaskDeadline("2026-07-31T14:00:00.000Z");
    expect(formatted).toMatch(/\d{1,2}\s+\w+\s+\d{2}:\d{2}/);
  });

  it("gecmis deadline tespit eder", () => {
    expect(isDeadlinePast("2020-01-01T00:00:00.000Z", new Date("2026-01-01"))).toBe(true);
    expect(isDeadlinePast("2030-01-01T00:00:00.000Z", new Date("2026-01-01"))).toBe(false);
  });
});
