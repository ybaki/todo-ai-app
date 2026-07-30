import { describe, expect, it } from "vitest";
import { parseTaskAnalysis } from "@/lib/llm/schema";

describe("parseTaskAnalysis", () => {
  it("gecerli JSON semasini kabul eder", () => {
    const validJson = JSON.stringify({
      title: "Acceptance testlerini tamamla",
      quadrant: "urgent_important",
      estimatedMinutes: 90,
      deadline: "2026-07-31T17:00:00+03:00",
      splittable: true,
      minimumChunkMinutes: 45,
      energy: "high_focus",
      tags: ["work", "testing"],
      confidence: 0.88,
      reason: "Yakin tarihli demo icin gerekli",
    });

    const result = parseTaskAnalysis(validJson);
    expect(result.ok).toBe(true);
  });

  it("gecersiz JSON metnini reddeder", () => {
    const result = parseTaskAnalysis("bu bir json degil");
    expect(result.ok).toBe(false);
  });

  it("gecersiz quadrant enum degerini reddeder", () => {
    const invalidJson = JSON.stringify({
      title: "Test",
      quadrant: "gecersiz_deger",
      estimatedMinutes: 30,
      deadline: null,
      splittable: false,
      minimumChunkMinutes: null,
      energy: "medium",
      tags: [],
      confidence: 0.5,
      reason: "test",
    });

    const result = parseTaskAnalysis(invalidJson);
    expect(result.ok).toBe(false);
  });

  it("negatif estimatedMinutes degerini reddeder", () => {
    const invalidJson = JSON.stringify({
      title: "Test",
      quadrant: "urgent_important",
      estimatedMinutes: -10,
      deadline: null,
      splittable: false,
      minimumChunkMinutes: null,
      energy: "medium",
      tags: [],
      confidence: 0.5,
      reason: "test",
    });

    const result = parseTaskAnalysis(invalidJson);
    expect(result.ok).toBe(false);
  });
});
