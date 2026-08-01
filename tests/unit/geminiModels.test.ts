import { describe, expect, it } from "vitest";
import { isModelUnavailableError, resolveGeminiModels } from "@/lib/llm/models";

describe("resolveGeminiModels", () => {
  it("tercih edilen modeli once dener", () => {
    expect(resolveGeminiModels("gemini-3.6-flash")[0]).toBe("gemini-3.6-flash");
  });

  it("tekrar eden model adlarini ayiklar", () => {
    const models = resolveGeminiModels("gemini-3-flash-preview");
    expect(new Set(models).size).toBe(models.length);
  });
});

describe("isModelUnavailableError", () => {
  it("404 model mesajlarini yakalar", () => {
    expect(
      isModelUnavailableError(
        "models/gemini-2.0-flash is no longer available. Please update your code"
      )
    ).toBe(true);
  });

  it("429 kota mesajlarini model hatasi saymaz", () => {
    expect(isModelUnavailableError("You exceeded your current quota")).toBe(false);
  });
});
