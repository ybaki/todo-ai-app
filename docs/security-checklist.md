# FAZ 7 — Güvenlik Kontrol Listesi

Bu liste, "🚀 Geliştirme Sonrası Kuralları" ve dokümanın bölüm 12
(Gizlilik ve Güvenlik) gereksinimlerine karşı yapılan kontrolleri özetler.

## Kimlik doğrulama (Auth)

- [x] Uygulama girişi yalnızca Supabase Auth + Microsoft/Azure OAuth
      (PKCE) ile yapılır; parola saklanmaz.
- [x] Oturum çerezleri `httpOnly` + `secure` + `sameSite=lax`
      (`@supabase/ssr` varsayılanı).
- [x] Middleware (`src/proxy.ts`) korumalı sayfalara girişte oturum
      kontrolü yapar; API route'ları kendi 401 kontrolünü uygular
      (`resolveRequestUser`).
- [x] Chrome eklentisi ayrı bir opak token (`extension_tokens`) ile
      kimliklenir; Supabase JWT'si eklentiye asla gömülmez.

## Yetkilendirme / IDOR

- [x] Her tabloda RLS aktif (`supabase/migrations/0002_rls_policies.sql`);
      `auth.uid() = user_id` zorunlu.
- [x] Service-role client kullanılan tüm sorgularda (extension token
      akışı, calendar/token işlemleri) **manuel** `user_id` filtresi
      uygulanır (bkz. `resolveRequestUser.ts`, `extensionToken.ts`).
- [x] `task_analyses`, `calendar_busy_cache`, `audit_logs` gibi tablolarda
      kullanıcı insert/update policy'si **kasıtlı olarak yok**; yalnızca
      backend (service role) yazabilir.

**Manuel doğrulama önerisi**: İki farklı test kullanıcısıyla, birinin
diğerinin `task_id`/`suggestion_id` değerini tahmin ederek erişmeye
çalıştığı bir negatif test senaryosu (RLS + endpoint bazlı) çalıştırılmalı.

## Secrets / token saklama

- [x] Microsoft refresh token'ı hiçbir zaman düz tabloya yazılmaz; yalnızca
      Supabase Vault secret id'si (`token_ref`) saklanır
      (`0003_vault_token_storage.sql`).
- [x] Vault okuma/yazma/silme fonksiyonları yalnızca `service_role`e
      `GRANT EXECUTE` edilmiştir; `authenticated`/`anon` rollerinden
      `REVOKE` edilmiştir.
- [x] `SUPABASE_SERVICE_ROLE_KEY`, `MICROSOFT_CLIENT_SECRET`,
      `GEMINI_API_KEY` yalnızca sunucu tarafı `src/lib/env.ts` üzerinden
      okunur; hiçbir `NEXT_PUBLIC_*` değişkeninde tutulmaz.
- [x] `.env.example` gerçek değer içermez; `.gitignore` içinde
      `.env*.local` hariç tutulur (Next.js varsayılanı).

## CSRF / XSS

- [x] Tüm mutasyon endpoint'leri (`POST`/`PATCH`/`DELETE`) Supabase
      oturum çerezine (SameSite=Lax) veya ayrı Bearer token'a dayanır;
      form tabanlı, çerez-otomatik-gönderimli bir saldırı yüzeyi yoktur.
- [x] React, varsayılan olarak kullanıcı girdisini escape eder; hiçbir
      yerde `dangerouslySetInnerHTML` kullanılmadı.
- [x] LLM'den dönen serbest metin alanları (`title`, `reason`) doğrudan
      HTML'e değil, React metin içeriği olarak render edilir.

## Rate limiting

- [x] Görev oluşturma ve AI analiz endpoint'lerinde kullanıcı başına
      Upstash Redis tabanlı sliding-window limiter (`src/lib/rateLimit.ts`).
- [ ] **Aksiyon gerekli**: Production'a çıkmadan önce gerçek bir Upstash
      Redis örneği bağlanmalı (`.env` içindeki `UPSTASH_REDIS_REST_*`);
      aksi halde limiter devre dışı çalışır (bilinçli MVP kolaylığı).

## Veri minimizasyonu

- [x] `calendar_busy_cache` yalnızca `start_at`/`end_at`/`status` saklar;
      toplantı başlığı/açıklaması/katılımcı hiçbir yerde tutulmaz.
- [x] Gemini'ye gönderilen prompt yalnızca görev metnini ve çalışma
      tercihlerini içerir; takvim verisi asla LLM'e gönderilmez
      (`src/lib/llm/geminiProvider.ts` içindeki `buildPrompt`).

## Hesap/veri silme

- [x] `/api/account/delete` kullanıcının tüm verilerini (cascade FK) ve
      Vault'taki token'ını siler; Ayarlar sayfasından erişilebilir.

## Bağımlılık güvenliği

- [ ] `npm audit` şu anda yalnızca build-tooling'e (eslint/postcss/sharp,
      Next.js'in kendi transitive bağımlılıkları) ait "high" seviye
      uyarılar gösteriyor; bunlar runtime'da çalışmaz, yalnızca `next
      build` sırasında kullanılır. Production'a çıkmadan önce
      `npm audit` tekrar çalıştırılıp güncel durum teyit edilmeli.
- [x] `@supabase/supabase-js`, bilinen bir tip-çözümleme regresyonu
      nedeniyle 2.55.0'a sabitlendi (bkz. README "Bilinen Sorunlar").
      Yeni sürümler denenmeden önce bu depodaki `tests/unit` suite'i ve
      `npx tsc --noEmit` MUTLAKA tekrar çalıştırılmalı.
