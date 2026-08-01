/**
 * Merkezi ortam degiskeni okuma noktasi. Eksik zorunlu degisken varsa
 * uygulama build/boot anında acik hata versin diye burada topluyoruz.
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Eksik ortam degiskeni: ${name}. .env.example dosyasina bakip .env.local icine ekleyin.`
    );
  }
  return value;
}

export const env = {
  supabase: {
    get url() {
      return requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    },
    get anonKey() {
      return requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    },
    get serviceRoleKey() {
      return requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    },
  },
  gemini: {
    get apiKey() {
      return requireEnv("GEMINI_API_KEY");
    },
    get model() {
      return process.env.GEMINI_MODEL ?? "gemini-3-flash-preview";
    },
  },
  extension: {
    get tokenSigningSecret() {
      return requireEnv("EXTENSION_TOKEN_SIGNING_SECRET");
    },
  },
  upstash: {
    get url() {
      return process.env.UPSTASH_REDIS_REST_URL;
    },
    get token() {
      return process.env.UPSTASH_REDIS_REST_TOKEN;
    },
  },
} as const;
