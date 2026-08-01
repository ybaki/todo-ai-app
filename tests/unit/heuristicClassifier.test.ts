import { describe, expect, it } from "vitest";
import { classifyQuadrantHeuristic } from "@/lib/llm/heuristicClassifier";

describe("classifyQuadrantHeuristic", () => {
  it("acil gorevleri Aksiyon olarak siniflandirir", () => {
    expect(classifyQuadrantHeuristic("acil bir is")).toBe("urgent_important");
    expect(classifyQuadrantHeuristic("hemen yap")).toBe("urgent_important");
  });

  it("rutin gorevleri Zaman Tuzagi olarak siniflandirir", () => {
    expect(classifyQuadrantHeuristic("arabayi yikat")).toBe("not_urgent_not_important");
  });

  it("planla iceren gorevleri Planla olarak siniflandirir", () => {
    expect(classifyQuadrantHeuristic("contract testleri planla")).toBe("not_urgent_important");
  });

  it("market alisverisini Zaman Tuzagi olarak siniflandirir", () => {
    expect(classifyQuadrantHeuristic("eve giderken ekmek al")).toBe("not_urgent_not_important");
  });
});
