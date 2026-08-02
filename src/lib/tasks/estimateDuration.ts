import {
  DEFAULT_ESTIMATED_MINUTES,
  normalizeEstimatedMinutes,
} from "@/lib/taskSize";

function normalizeText(rawText: string): string {
  return rawText
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/**
 * LLM erisilemediginde metinden tahmini sure cikarir.
 * Mantikli bir deger bulunamazsa null (cagiran DEFAULT 1 saat kullanir).
 */
export function estimateDurationHeuristic(rawText: string): number | null {
  const text = normalizeText(rawText);

  const explicit = text.match(
    /\b(\d+)\s*(dk|dakika|min(?:ute)?|saat|hour|h)\b/
  );
  if (explicit) {
    const amount = Number.parseInt(explicit[1], 10);
    if (Number.isFinite(amount) && amount > 0) {
      const unit = explicit[2];
      if (/saat|hour|^h$/.test(unit)) {
        return normalizeEstimatedMinutes(amount * 60);
      }
      return normalizeEstimatedMinutes(amount);
    }
  }

  if (/\b(market|mail|e-?posta|telefon|ara|mesaj|fatura|odeme)\b/.test(text)) {
    return 30;
  }

  if (/\b(toplanti|sunum|rapor|proje|test plan|roadmap)\b/.test(text)) {
    return 120;
  }

  return null;
}

/** Analiz/atama icin: AI > metin heuristik > varsayilan 1 saat. */
export function resolveTaskDurationMinutes(
  rawText: string,
  storedMinutes: number | null | undefined,
  analysisMinutes?: number | null
): number {
  if (storedMinutes && storedMinutes > 0) return storedMinutes;
  if (analysisMinutes && analysisMinutes > 0) {
    return normalizeEstimatedMinutes(analysisMinutes);
  }
  return estimateDurationHeuristic(rawText) ?? DEFAULT_ESTIMATED_MINUTES;
}
