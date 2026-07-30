# Akıllı Todo — Chrome Eklentisi (FAZ 6)

Seçili metni sağ tık menüsü veya klavye kısayolu (`Ctrl+Shift+Y` /
`Cmd+Shift+Y`) ile doğrudan web uygulamasının Inbox'ına gönderir.

## Yerel geliştirmede yükleme (unpacked)

1. `chrome://extensions` adresine gidin, sağ üstten **Geliştirici modu**'nu açın.
2. **Paketlenmemiş öğe yükle**'ye tıklayıp bu `extension/` klasörünü seçin.
3. Eklenti simgesine sağ tıklayıp **Seçenekler**'i açın.
4. Web uygulamasında oturum açıp **Ayarlar > Chrome Eklentisi** bölümünden
   bir anahtar üretin (`/api/ext/token`), ardından uygulama adresini
   (örn. `http://localhost:3000`) ve üretilen anahtarı Seçenekler
   sayfasına yapıştırıp **Kaydet**'e basın.
5. Herhangi bir sayfada metin seçip sağ tık menüsünden "Akıllı Todo'ya
   ekle" deyin veya kısayolu kullanın.

## Mimari notu — kimlik doğrulama köprüsü

Manifest V3 service worker'lar web uygulamasıyla aynı origin'de
çalışmadığından Supabase oturum çerezine erişemez. Bunun yerine:

- Web uygulaması, oturum açmış kullanıcı için opak, rastgele bir
  **eklenti anahtarı** üretir (`extension_tokens` tablosunda yalnızca
  HMAC-SHA256 hash'i saklanır).
- Eklenti bu anahtarı `Authorization: Bearer ext_...` başlığıyla gönderir.
- Backend (`resolveRequestUser`), bu başlığı gördüğünde service-role
  Supabase client'ı kullanır ve TÜM sorguları `user_id` ile filtreler
  (RLS bypass edildiği için bu filtreleme zorunludur).

Bkz. `src/lib/auth/extensionToken.ts`, `src/lib/auth/resolveRequestUser.ts`,
`supabase/migrations/0004_extension_tokens.sql`.

## Chrome Web Store'a yayınlamadan önce yapılacaklar (FAZ 6 çıkış kriteri)

- [ ] Gerçek uygulama ikonları tasarlanmalı (`icons/icon16.png`,
      `icon48.png`, `icon128.png` şu an 1x1 piksel yer tutuculardır).
- [ ] `manifest.json` içindeki `host_permissions` üretim domain'inize
      daraltılmalı (şu an gelistirme kolaylığı için `https://*/*` genişçe
      tanımlı; Web Store incelemesi geniş host izinlerini sorgular).
- [ ] Chrome Web Store Developer hesabı açılmalı (~$5 tek seferlik ücret).
- [ ] Gizlilik açıklaması (privacy disclosure) doldurulmalı: eklentinin
      yalnızca kullanıcının açıkça seçtiği metni ve kullanıcının kendi
      ürettiği eklenti anahtarını naklettiği, üçüncü taraf veri
      paylaşımı yapılmadığı belirtilmeli.
- [ ] Store listeleme metni, ekran görüntüleri ve gizlilik politikası
      URL'si hazırlanmalı.
- [ ] `npm run build` sonrası üretim domain'i ile uçtan uca test edilmeli.
