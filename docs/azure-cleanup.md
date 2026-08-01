# Azure / Microsoft temizlik rehberi

Projede Microsoft ve Outlook entegrasyonu kaldırıldı. Şirket tenant'ında
oluşturduğunuz kaynakları silmek için aşağıdaki adımları **sırayla**
uygulayın. Kişisel Azure hesabında deneme yaptıysanız aynı adımları orada
da tekrarlayın.

## 1. Supabase — Azure provider'ı kapat

1. [supabase.com](https://supabase.com) → projeniz
2. **Authentication** → **Providers** → **Azure**
3. **Enable Azure** → **OFF**
4. Client ID / Secret alanlarını temizleyin → **Save**

## 2. Entra — Uygulama kaydını sil

1. [portal.azure.com](https://portal.azure.com) → şirket hesabınızla giriş
2. **Microsoft Entra ID** → **Uygulama kayıtları**
3. `todo-ai-app-dev` (veya oluşturduğunuz isim) → açın
4. Üst menü **Sil** (*Delete*) → onaylayın

Bu işlem client secret'ları ve izin kayıtlarını da kaldırır.

## 3. (Opsiyonel) Client secret'ları zaten sildiyseniz

Uygulama kaydını silmek yeterlidir. Ayrıca **Sertifikalar ve gizli dizeler**
sayfasına gitmenize gerek yok.

## 4. Kişisel Azure hesabında deneme yaptıysanız

Kişisel hesapta (`ben@yigitbaki.com` vb.) ayrı bir app registration
oluşturduysanız, **kişisel tenant'ta** da **Uygulama kayıtları** → ilgili
uygulamayı **Sil**.

## 5. `.env.local` temizliği

Proje klasöründe `.env.local` dosyasından şu satırları **silin** (artık
kullanılmıyor):

```env
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=
MICROSOFT_REDIRECT_URI=
```

## 6. Doğrulama checklist

- [ ] Supabase'te Azure provider kapalı
- [ ] Entra'da `todo-ai-app-dev` silindi
- [ ] `.env.local`'den `MICROSOFT_*` satırları kaldırıldı
- [ ] Uygulama `npm run dev` ile açılıyor, login ekranı **Google ile giriş** gösteriyor

## Not

Veritabanındaki `calendar_connections` / `calendar_busy_cache` tabloları
kod tarafından artık kullanılmıyor; silmek zorunda değilsiniz. İleride
temiz migration yazılabilir.
