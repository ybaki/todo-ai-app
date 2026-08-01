# Google (Gmail) giriş kurulumu

Uygulama **Google OAuth** ile giriş kabul eder:

- `@gmail.com` / `@googlemail.com` (varsayılan)
- `.env.local` → `ALLOWED_EMAIL_DOMAINS=yigitbaki.com` gibi Google Workspace özel domainler

Kurulum iki yerde yapılır: **Google Cloud Console** ve **Supabase Dashboard**.

## 1. Google Cloud Console

1. [console.cloud.google.com](https://console.cloud.google.com) → proje seçin veya yeni proje oluşturun
2. **APIs & Services** → **OAuth consent screen**
   - User Type: **External** (test için yeterli)
   - App name: `Akıllı Todo Takvim`
   - User support email ve Developer contact doldurun
   - Scopes: varsayılan `email`, `profile`, `openid` yeterli
   - **Test users**: geliştirme aşamasında kullanacağınız adresleri ekleyin (ör. `ben@gmail.com`, `ben@yigitbaki.com`)
3. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Name: `todo-ai-app-local`
   - **Authorized redirect URIs** — Supabase callback (Providers → Google sayfasında yazar):

     ```
     https://SENIN-PROJECT-ID.supabase.co/auth/v1/callback
     ```

4. **Client ID** ve **Client secret** değerlerini kopyalayın

## 2. Supabase Dashboard

1. **Authentication** → **URL Configuration**
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback`
2. **Authentication** → **Providers** → **Google**
   - Enable Google: **ON**
   - Client ID ve Client Secret yapıştırın
   - **Save**

## 3. `.env.local` — özel domain (Google Workspace)

Google Workspace ile `ben@yigitbaki.com` gibi özel domain kullanıyorsanız:

```env
ALLOWED_EMAIL_DOMAINS=yigitbaki.com
```

Birden fazla domain: `yigitbaki.com,digerdomain.com`

## 4. Uygulamayı çalıştır

```bash
npm run dev
```

**http://localhost:3000/login** → **Google ile giriş yap**

- `@gmail.com` ve izin verilen domainler kabul edilir; diğerleri reddedilir
- Her Google hesabı Supabase'te tek bir kullanıcı kaydı oluşturur

## Sık sorunlar

| Sorun | Çözüm |
|---|---|
| `redirect_uri_mismatch` | Google Console'daki redirect URI, Supabase callback ile birebir aynı olmalı |
| `Access blocked: app not verified` | OAuth consent ekranında test user olarak Gmail'inizi ekleyin |
| `gmail_only` hatası | Adres `@gmail.com` değilse `.env.local` → `ALLOWED_EMAIL_DOMAINS` içine domain ekleyin |

## Production

Vercel deploy sonrası Supabase **Redirect URLs** listesine production
domain'inizi ekleyin (`https://alanadiniz.com/auth/callback`). Google
Console'da da aynı Supabase callback URI kalır (Supabase auth proxy kullanır).
