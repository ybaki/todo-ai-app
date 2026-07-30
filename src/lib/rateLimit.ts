import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";

/**
 * Task olusturma ve AI analiz endpoint'leri icin kullanici basina rate
 * limit. Vercel serverless fonksiyonlari stateless oldugu icin sayac
 * Upstash Redis'te tutulur. Bkz. dokuman bolum 12 (Rate limiting) ve
 * plan bolum 1, madde 4.
 *
 * Upstash env degiskenleri tanimli degilse (ornegin lokal gelistirmede),
 * limiter devre disi kalir ve her istek gecer -- bu bilincli bir MVP
 * kolayligidir, production'da mutlaka Upstash baglanmalidir.
 */
let cachedLimiter: Ratelimit | null | undefined;

function getLimiter(): Ratelimit | null {
  if (cachedLimiter !== undefined) return cachedLimiter;

  if (!env.upstash.url || !env.upstash.token) {
    cachedLimiter = null;
    return cachedLimiter;
  }

  cachedLimiter = new Ratelimit({
    redis: new Redis({ url: env.upstash.url, token: env.upstash.token }),
    limiter: Ratelimit.slidingWindow(20, "1 m"),
    prefix: "akilli-todo",
  });

  return cachedLimiter;
}

export async function checkRateLimit(identifier: string): Promise<{ allowed: boolean }> {
  const limiter = getLimiter();
  if (!limiter) return { allowed: true };

  const { success } = await limiter.limit(identifier);
  return { allowed: success };
}
