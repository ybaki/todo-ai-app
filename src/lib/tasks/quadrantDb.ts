import type { EisenhowerQuadrant, StoredQuadrant } from "@/types/database";
import { normalizeQuadrant } from "@/lib/quadrant";

/** DB enum henuz guncellenmemisse gecerli deger dondurur. */
export function quadrantForDatabaseWrite(
  quadrant: StoredQuadrant | EisenhowerQuadrant | null | undefined
): EisenhowerQuadrant | null {
  const normalized = normalizeQuadrant(quadrant);
  return normalized;
}

/** Supabase hata mesajinda get_rid enum eksikligini tespit eder. */
export function isMissingGetRidEnumError(message: string | undefined): boolean {
  if (!message) return false;
  return message.includes("get_rid") || message.includes("invalid input value for enum");
}
