const DEFAULT_ALLOWED_SUFFIXES = ["@gmail.com", "@googlemail.com"];

function getExtraAllowedDomains(): string[] {
  const raw = process.env.ALLOWED_EMAIL_DOMAINS ?? "";
  return raw
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Google OAuth ile giris yapan kullanicinin e-postasi kabul edilir mi?
 * - @gmail.com / @googlemail.com (varsayilan)
 * - ALLOWED_EMAIL_DOMAINS env (ornek: yigitbaki.com) — Google Workspace ozel domainler
 */
export function isAllowedGmailAddress(email: string | undefined | null): boolean {
  if (!email) return false;

  const lower = email.toLowerCase();
  if (DEFAULT_ALLOWED_SUFFIXES.some((suffix) => lower.endsWith(suffix))) {
    return true;
  }

  const domain = lower.split("@")[1];
  if (!domain) return false;

  return getExtraAllowedDomains().includes(domain);
}
