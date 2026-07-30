import type { EisenhowerQuadrant } from "@/types/database";

export const QUADRANT_LABELS: Record<EisenhowerQuadrant, string> = {
  urgent_important: "Acil / Önemli",
  not_urgent_important: "Acil Değil / Önemli",
  urgent_not_important: "Acil / Önemsiz",
  not_urgent_not_important: "Acil Değil / Önemsiz",
};

export const QUADRANT_ORDER: EisenhowerQuadrant[] = [
  "urgent_important",
  "not_urgent_important",
  "urgent_not_important",
  "not_urgent_not_important",
];

export const QUADRANT_ACCENT: Record<EisenhowerQuadrant, string> = {
  urgent_important: "border-red-500/40 bg-red-500/10",
  not_urgent_important: "border-emerald-500/40 bg-emerald-500/10",
  urgent_not_important: "border-amber-500/40 bg-amber-500/10",
  not_urgent_not_important: "border-slate-500/40 bg-slate-500/10",
};
