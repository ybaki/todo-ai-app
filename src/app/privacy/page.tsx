export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 text-slate-100">
      <h1 className="text-2xl font-semibold">Gizlilik Politikası</h1>
      <p className="mt-2 text-sm text-slate-500">
        Son güncelleme: bu proje MVP aşamasındadır; bu metin yasal bir belge değil, teknik
        veri işleme özetidir.
      </p>

      <div className="mt-6 space-y-6 text-sm leading-relaxed text-slate-300">
        <section>
          <h2 className="font-semibold text-slate-100">Kimlik doğrulama</h2>
          <p>
            Giriş yalnızca Google OAuth ile yapılır. Yalnızca{" "}
            <strong>@gmail.com</strong> e-posta adresleri kabul edilir. Microsoft / Outlook
            entegrasyonu bu sürümde kullanılmaz.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-slate-100">Ne saklıyoruz?</h2>
          <p>
            Yazdığınız görev metinleri, AI tarafından üretilen sınıflandırma/süre önerileri,
            çalışma tercihleriniz ve onayladığınız plan blokları Supabase (PostgreSQL)
            üzerinde, yalnızca sizin kullanıcı hesabınızla ilişkilendirilmiş şekilde saklanır
            (Row Level Security ile korunur).
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-slate-100">AI servisi (Gemini)</h2>
          <p>
            Görev metniniz, sınıflandırma ve süre tahmini için Google Gemini API&apos;ye
            gönderilir. Harici takvim/toplantı bilgisi bu isteğe dahil edilmez.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-slate-100">Chrome eklentisi</h2>
          <p>
            Eklenti yalnızca sizin bilinçli olarak seçtiğiniz metni gönderir; sayfa
            içeriğini otomatik taramaz veya izlemez.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-slate-100">Verilerinizi silme</h2>
          <p>
            Ayarlar sayfasındaki &quot;Hesabımı ve verilerimi sil&quot; butonuyla tüm
            verileriniz kalıcı olarak ve geri alınamaz şekilde silinir.
          </p>
        </section>
      </div>
    </main>
  );
}
