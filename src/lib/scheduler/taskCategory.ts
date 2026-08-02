export type TaskCategory = "technical" | "daily" | "general";

const TECHNICAL_PATTERN =
  /\b(yazilim|yazılım|software|kod|code|test|testler|testleri|unit test|integration|contract test|contract|api|bug|fix|deploy|pr|merge|refactor|backend|frontend|database|sql|migration|jira|github|review|debug|teknik|gelistirme|geliştirme|implementasyon|feature|sprint)\b/i;

const DAILY_PATTERN =
  /\b(alisveris|alışveriş|ekmek|market|oyun|satın al|satın alma|arabayı yıka|arabayi yika|yıkat|yikat|bilet|anneni ara|telefon et|temizlik|kargo|fatura ode|fatura öde|randevu al|berber|kuaför|spor salonu|ilaç|ilac)\b/i;

/** AI tag'leri ve metinden teknik / gunluk siniflandirma. */
export function classifyTaskCategory(tags: string[], rawText: string): TaskCategory {
  const haystack = `${tags.join(" ")} ${rawText}`.toLowerCase();

  if (TECHNICAL_PATTERN.test(haystack) || tags.some((tag) => /teknik|technical|software|test/i.test(tag))) {
    return "technical";
  }

  if (DAILY_PATTERN.test(haystack) || tags.some((tag) => /gunluk|günlük|daily|personal/i.test(tag))) {
    return "daily";
  }

  return "general";
}
