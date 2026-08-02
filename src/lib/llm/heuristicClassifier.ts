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
  const soon =
    /\b(\d+\s*(dk|dakika|minute|min|saat|hour|h)\b|icinde|sonra|kala|kalmis)\b/.test(text);
  const plan =
    /\b(planla|plan|hazirla|tasarla|contract|testleri|test plan|roadmap|strateji)\b/.test(text);
  const important =
    /\b(onemli|kritik|proje|toplanti|musteri|sunum|rapor|teslim|sinav|duzelt|is\b|gorev|patron|sozlesme)\b/.test(
      text
    );
  const quickTask =
    /\b(mail|email|cevapla|randevu|telefon|yikat|temizle|netflix|oyun|sosyal|alisveris|rutin|bekle|izle|kahve|cop|ekmek|market|alis|anket|arşiv|duzenle)\b/.test(
      text
    );

  if (urgent && important) return "urgent_important";
  if (soon) return "urgent_important";
  if (urgent) return "urgent_important";
  if (plan && !urgent) return "not_urgent_important";
  if (important && !quickTask) return "not_urgent_important";
  if (quickTask) return "get_rid";

  return null;
}
