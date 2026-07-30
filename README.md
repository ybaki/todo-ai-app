# Akıllı Todo & Takvim Planlayıcı

Eisenhower matrisi + LLM destekli görev sınıflandırma + Outlook
takvimine göre deterministik zaman önerisi yapan bir kişisel
üretkenlik uygulaması. Mimari ve faz faz uygulama planı için
`docs/` klasörüne ve proje köküne eklenen plan dokümanına bakın.

## Mimari özeti

```
Next.js (Web + Chrome Eklentisi) → Next.js Route Handlers (BFF)
  → Supabase (Postgres + RLS + Auth + Vault)
  → Microsoft Graph (getSchedule, free/busy)
  → Gemini API (görev analizi, LLM Adapter arkasında)
  → Deterministik Scheduling Engine (slot önerisi, LLM'den bağımsız)
```

## Gereksinimler

- Node.js 22+
- Bir Supabase projesi (bkz. `supabase/migrations/`)
- Microsoft Entra App Registration (bkz. `docs/entra-app-registration.md`)
- Gemini API anahtarı (paid tier)

## Kurulum

```bash
npm install
cp .env.example .env.local   # değerleri doldurun
npm run dev
```

`http://localhost:3000` adresinde uygulama açılır.

## Kullanılabilir komutlar

| Komut | Açıklama |
|---|---|
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` / `npm run start` | Production build/çalıştırma |
| `npm run lint` | ESLint |
| `npm run test` | Vitest ile birim testler (scheduler, LLM şeması) |
| `npm run test:watch` | Vitest watch modu |
| `npm run test:e2e` | Playwright ile E2E guard/smoke testleri (build+start gerektirir) |
| `npm run eval:tasks` | Gemini adapter'ını `scripts/eval/tasks.sample.json` ile değerlendirir |

## Dokümantasyon

- [`docs/entra-app-registration.md`](docs/entra-app-registration.md) — Microsoft Entra App Registration adım adım kurulum.
- [`docs/security-checklist.md`](docs/security-checklist.md) — Güvenlik/gizlilik kontrol listesi (FAZ 7).
- [`docs/deployment-runbook.md`](docs/deployment-runbook.md) — Production'a alma ve rollback prosedürü.
- [`extension/README.md`](extension/README.md) — Chrome eklentisi kurulumu ve Web Store yayın adımları.
- [`scripts/entra-poc/`](scripts/entra-poc/) — Entra/OAuth doğrulama için bağımsız PoC script.

## Bilinen sorunlar / kasıtlı kısıtlamalar

- **`@supabase/supabase-js` `2.55.0`'a sabitlendi**: Daha yeni sürümlerde
  (post-2.55.0), elle yazılmış `Database` tipleri ile `strictNullChecks`
  altında `.insert()/.update()/.rpc()` çağrılarının `never` tipine
  daraldığı bir regresyon gözlemlendi. Sürümü yükseltmeden önce
  `npx tsc --noEmit` ve `npm run test` mutlaka tekrar çalıştırılmalı.
- **`.npmrc`** içinde `legacy-peer-deps=true` var; bu, sabitlenen
  Supabase sürümü ile `@supabase/ssr` arasındaki peer dependency
  uyumsuzluğunu aşmak için gerekli.
- **Rate limiting opsiyonel**: `UPSTASH_REDIS_REST_URL/TOKEN`
  tanımlanmazsa `src/lib/rateLimit.ts` sessizce devre dışı kalır
  (yalnızca yerel geliştirme kolaylığı içindir — production'da
  mutlaka tanımlanmalı).
- **Sentry opsiyonel**: DSN tanımlanmazsa event gönderimi devre dışı
  kalır; build kırılmaz.

## Testler

- **Birim testler** (`tests/unit/`): scheduling engine (`computeFreeIntervals`,
  `generateScheduleCandidates`) ve LLM çıktısı Zod şeması.
- **E2E testler** (`tests/e2e/`): kimlik doğrulama guard'ları (`/app`,
  `/app/settings` oturumsuz erişimde `/login`'e yönlendiriliyor mu),
  login/privacy sayfalarının render kontrolü. Gerçek Microsoft OAuth
  akışı harici bir IdP gerektirdiği için otomatize edilmemiştir; bu akış
  `docs/deployment-runbook.md`'deki go-live checklist'inde elle
  doğrulanır.
- **LLM eval** (`scripts/eval/`): 40 örnek Türkçe görev üzerinden
  quadrant tahmin doğruluğu, latency ve maliyet raporu.
