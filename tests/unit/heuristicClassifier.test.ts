import { describe, expect, it } from "vitest";
import { classifyQuadrantHeuristic } from "@/lib/llm/heuristicClassifier";

describe("classifyQuadrantHeuristic", () => {
  it("acil gorevleri Aksiyon Al olarak siniflandirir", () => {
    expect(classifyQuadrantHeuristic("acil bir is")).toBe("urgent_important");
    expect(classifyQuadrantHeuristic("hemen yap")).toBe("urgent_important");
  });

  it("rutin gorevleri Kurtul olarak siniflandirir", () => {
    expect(classifyQuadrantHeuristic("arabayi yikat")).toBe("get_rid");
  });

  it("planla iceren gorevleri Planla olarak siniflandirir", () => {
    expect(classifyQuadrantHeuristic("contract testleri planla")).toBe("not_urgent_important");
  });

  it("market alisverisini Kurtul olarak siniflandirir", () => {
    expect(classifyQuadrantHeuristic("eve giderken ekmek al")).toBe("get_rid");
  });
});
