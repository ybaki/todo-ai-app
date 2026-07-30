# Deployment & Rollback Runbook

Bu doküman, MVP'yi Vercel üzerinde production'a almak ve gerekirse geri
almak (rollback) için izlenecek adımları özetler.

## 1. Ön koşullar (bir kere yapılır)

1. **Supabase (production projesi)**
   - Yeni bir Supabase projesi oluşturun (Free tier ile başlanabilir).
   - `supabase/migrations/*.sql` dosyalarını sırayla (dosya adı sırasına
     göre: `0001_init.sql` → `0002_rls_policies.sql` →
     `0003_vault_token_storage.sql` → `0004_extension_tokens.sql`)
     Supabase SQL Editor'de veya `supabase db push` ile uygulayın.
   - Authentication → Providers → Azure'u etkinleştirip Entra
     App Registration'daki client ID/secret'ı girin
     (`docs/entra-app-registration.md`).
   - Authentication → URL Configuration → Redirect URLs'e production
     domain'inizi ekleyin (`https://<domain>/auth/callback`).
2. **Microsoft Entra App Registration**
   - Redirect URI listesine production callback URL'lerini ekleyin:
     - `https://<domain>/auth/callback` (Supabase Auth)
     - `https://<domain>/api/calendar/callback` (Graph getSchedule bağlantısı)
3. **Gemini API**
   - Google AI Studio'da faturalandırmalı (paid tier) bir proje/API key
     oluşturun.
4. **Upstash Redis** (opsiyonel ama önerilir)
   - Free tier bir Redis veritabanı oluşturup REST URL/token alın.
5. **Sentry** (opsiyonel ama önerilir)
   - Bir proje oluşturup DSN'leri alın.
6. **Domain (Cloudflare Registrar)**
   - Domain'i satın alıp Vercel projesine bağlayın, DNS kayıtlarını
     Vercel'in istediği şekilde ayarlayın.

## 2. Vercel projesi kurulumu

1. GitHub reposunu Vercel'e import edin.
2. Environment Variables (Production + Preview) altına `.env.example`
   dosyasındaki tüm anahtarları gerçek değerleriyle girin. Özellikle:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (yalnızca "Production"da, asla
     istemciye sızdırılmayacak şekilde sunucu tarafı kullanılıyor)
   - `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`,
     `MICROSOFT_REDIRECT_URI` (production domain'i ile)
   - `GEMINI_API_KEY`
   - `EXTENSION_TOKEN_SIGNING_SECRET` (rastgele, uzun bir string —
     `openssl rand -hex 32` ile üretin)
   - `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`
   - `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` (kaynak haritası
     yüklemesi için, yalnızca build zamanı)
3. Build komutu varsayılan (`next build`) bırakılabilir; proje kökünde
   `next.config.ts` zaten Sentry sarmalayıcısını `SENTRY_AUTH_TOKEN`
   varsa otomatik etkinleştiriyor.
4. İlk deploy'u tetikleyin (`main` branch push veya manuel "Deploy").

## 3. Yayın öncesi son kontrol (go-live checklist)

- [ ] `npm run test` (Vitest) yeşil.
- [ ] `npm run test:e2e` (Playwright, gerçek build üzerinde) yeşil.
- [ ] `npx tsc --noEmit` hatasız.
- [ ] `docs/security-checklist.md` içindeki tüm maddeler gözden
      geçirildi.
- [ ] Production Supabase projesinde RLS'nin gerçekten aktif olduğu
      manuel olarak (SQL Editor'de `select * from pg_policies`) teyit
      edildi.
- [ ] Kendi hesabınızla production'da uçtan uca bir deneme yapıldı:
      giriş → görev ekle → AI analiz → takvim bağlama → zaman önerisi
      kabul → Chrome eklentisinden görev ekleme.
- [ ] Chrome eklentisi paketlenip (bkz. `extension/README.md`) ya
      "unpacked" olarak yüklendi ya da Web Store'a gönderildi.

## 4. Rollback prosedürü

Vercel her deploy için değişmez (immutable) bir build tutar; bu sayede
rollback kod açısından risksizdir:

1. Vercel Dashboard → Project → **Deployments** sekmesine gidin.
2. Sorunsuz çalıştığı bilinen önceki bir deployment'ı bulun.
3. O deployment'ın "..." menüsünden **Promote to Production** seçin.
   (Bu, herhangi bir yeniden build gerektirmeden trafiği anında eski
   sürüme yönlendirir.)
4. Eğer sorun bir **veritabanı migration'ından** kaynaklanıyorsa:
   - Migration'lar geriye dönük uyumlu yazılmıştır (yeni sütunlar
     nullable/default'lu eklenir); kod rollback'i genelde yeterlidir.
   - Gerçekten şema geri alma gerekiyorsa, ilgili migration dosyasının
     tersini yapan **yeni bir düzeltme migration'ı** yazıp uygulayın —
     production'da elle "geriye doğru" migration çalıştırmayın.
5. Eğer sorun bir **secret/env değişkeninden** kaynaklanıyorsa: Vercel
   Environment Variables üzerinden düzeltip **Redeploy** (yeniden build
   gerekmeden "Redeploy" ile mevcut build'i yeni env ile başlatabilirsiniz).
6. Olayı `CHANGELOG` niteliğinde bir not olarak (bu repo için) ilgili
   PR/commit'e veya proje takip aracına kaydedin.

## 5. Operasyonel izleme

- **Sentry**: Hata oranı ve yeni hata türleri için gündelik kontrol.
- **Vercel Analytics/Logs**: 5xx oranı ve fonksiyon süresi (özellikle
  `/api/tasks/[id]/analyze` ve `/api/calendar/busy` — dış servis
  çağrısı içerdikleri için gecikmeye en açık uçlar).
- **Gemini maliyeti**: `task_analyses` tablosundaki `cost_usd` sütunu
  üzerinden haftalık toplam maliyet SQL ile takip edilebilir:

  ```sql
  select date_trunc('week', created_at) as week, sum(cost_usd) as total_cost
  from public.task_analyses
  group by 1
  order by 1 desc;
  ```
