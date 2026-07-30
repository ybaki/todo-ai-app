# FAZ 0 — Microsoft Entra App Registration ve getSchedule PoC

Bu doküman, planın FAZ 0 (Teknik uygunluk kapısı) adımını tamamlamak için
gereken **sizin yapmanız gereken** Azure/Entra portal adımlarını ve
doğrulama scriptini açıklar. Bu adımlar bir Azure/Entra hesabı ve şirket
tenant'ında (veya en azından kendi kişisel Microsoft hesabınızda) uygulama
kaydı oluşturma yetkisi gerektirdiği için AI ajanı tarafından otomatik
yapılamaz.

## 1. Neden gerekli?

Graph Explorer'da takvim sorgusunun çalışması, şirket hesabınızın Graph
takvim verisine erişebildiğini gösterir; ancak KENDİ uygulamanız ayrı bir
client ID ve consent kaydı kullanacağı için tenant politikası bu yeni
uygulamayı ayrıca engelleyebilir veya yönetici onayı isteyebilir. Bu yüzden
gerçek geliştirmeye başlamadan önce bunu doğrulamalıyız.

## 2. Adımlar (Azure Portal üzerinde siz yapacaksınız)

1. https://portal.azure.com adresine gidin > **Microsoft Entra ID** >
   **App registrations** > **New registration**.
2. İsim: `akilli-todo-takvim-dev` (veya tercih ettiğiniz bir isim).
3. **Supported account types**: "Accounts in this organizational directory
   only" (tek tenant) veya "Accounts in any organizational directory"
   seçin — İKİSİ DE OLUR, ama tek tenant genellikle admin onayı gerektirme
   ihtimalini azaltır.
4. **Redirect URI**: Platform = "Web", değer =
   `http://localhost:3000/api/calendar/callback`.
5. Kayıt tamamlandıktan sonra **Overview** sayfasından şunları not edin:
   - `Application (client) ID` → `.env.local` içinde `MICROSOFT_CLIENT_ID`
   - `Directory (tenant) ID` → `.env.local` içinde `MICROSOFT_TENANT_ID`
     (ya da tek-tenant değilse `organizations` bırakabilirsiniz)
6. **Certificates & secrets** > **New client secret** oluşturun, değeri
   `.env.local` içinde `MICROSOFT_CLIENT_SECRET` olarak saklayın (yalnızca
   bir kez gösterilir).
7. **API permissions** > **Add a permission** > **Microsoft Graph** >
   **Delegated permissions** > `Calendars.ReadBasic` ve `offline_access`
   ekleyin. **"Grant admin consent"** butonuna henüz BASMAYIN — normal bir
   kullanıcı olarak ilk girişte consent ekranını görüp göremediğinizi test
   etmek asıl amaç.

## 3. Doğrulama scripti ile test

`scripts/entra-poc/run.mjs` betiği, tarayıcı olmadan terminalden basit bir
"device code" benzeri akış yerine, yerel bir callback sunucusu açarak tam
authorization code + PKCE akışını çalıştırır ve `getSchedule` çağrısını
yapar.

```bash
cd scripts/entra-poc
cp .env.example .env
# .env icine MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET / MICROSOFT_TENANT_ID / kendi e-postanizi girin
node run.mjs
```

Script bir tarayıcı URL'si yazdıracak; onu açıp Microsoft hesabınızla giriş
yapın. Terminalde ya "free/busy alındı" çıktısını ya da tam hata mesajını
(örneğin `AADSTS...` admin consent hatası) göreceksiniz.

## 4. Çıkış kriteri ve karar noktası

- **Başarılı** (busy/free JSON'u döndü): FAZ 1'e sorunsuz geçebiliriz.
- **`AADSTS65001` / "need admin approval" hatası**: Şirket IT/admin ile
  görüşüp uygulamaya onay verilmesini istemeniz gerekiyor. Bu netleşene
  kadar FAZ 1-3 (auth, matris, AI) bağımsız ilerletilebilir; yalnızca
  FAZ 4 (gerçek Outlook entegrasyonu) bu karara bağlıdır.
- **Onay hiç alınamıyorsa**: Alternatif olarak kişisel bir Microsoft
  hesabıyla (iş dışı) devam etmek ya da Outlook entegrasyonunu ileri bir
  faza ertelemek seçenekleri birlikte değerlendirilmeli.
