/** Tier 1 / AI Studio'da gecerli modeller; eski 2.x modelleri artik 404 donuyor. */
export const GEMINI_MODEL_FALLBACKS = [
  "gemini-3-flash-preview",
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
] as const;

export function resolveGeminiModels(preferred?: string): string[] {
  const models = preferred ? [preferred, ...GEMINI_MODEL_FALLBACKS] : [...GEMINI_MODEL_FALLBACKS];
  return [...new Set(models)];
}

export function isModelUnavailableError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("no longer available") ||
    normalized.includes("not found") ||
    normalized.includes("not supported for generatecontent") ||
    normalized.includes("denied access")
  );
}
