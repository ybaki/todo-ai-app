import type { EisenhowerQuadrant } from "@/types/database";

function normalizeText(rawText: string): string {
  return rawText
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/**
 * Gemini erisilemediginde veya yanit gecersiz oldugunda basit anahtar kelime
 * siniflandirmasi. Eslesme yoksa null doner (kullanicidan secim beklenir).
 */
export function classifyQuadrantHeuristic(rawText: string): EisenhowerQuadrant | null {
  const text = normalizeText(rawText);

  const urgent =
    /\b(acil|hemen|simdi|bugun|deadline|son gun|asap|hemenlik|ivedi|erteleme)\b/.test(text);
  const plan =
    /\b(planla|plan|hazirla|tasarla|contract|testleri|test plan|roadmap|strateji)\b/.test(text);
  const important =
    /\b(onemli|kritik|proje|toplanti|musteri|sunum|rapor|teslim|sinav|duzelt|is\b|gorev|patron|sozlesme)\b/.test(
      text
    );
  const delegate =
    /\b(devret|delegasyon|baskasi|yardim|cevapla|email|mail ara|sor|telefon et|randevu al)\b/.test(
      text
    );
  const lowPriority =
    /\b(yikat|temizle|netflix|oyun|sosyal|alisveris|rutin|bekle|izle|kahve|cop|ekmek|market|alis)\b/.test(
      text
    );

  if (urgent && important) return "urgent_important";
  if (urgent && delegate) return "urgent_not_important";
  if (urgent) return "urgent_important";
  if (delegate) return "urgent_not_important";
  if (plan && !urgent) return "not_urgent_important";
  if (important && !lowPriority) return "not_urgent_important";
  if (lowPriority && !important) return "not_urgent_not_important";

  return null;
}
