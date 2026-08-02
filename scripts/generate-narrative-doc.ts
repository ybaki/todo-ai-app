import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

const OUTPUT = join(process.cwd(), "docs", "Akilli_Todo_Anlatim.docx");

function p(text: string, bold = false): Paragraph {
  return new Paragraph({
    spacing: { after: 200 },
    children: [new TextRun({ text, bold })],
  });
}

function h(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]): Paragraph {
  return new Paragraph({ heading: level, spacing: { before: 280, after: 160 }, children: [new TextRun(text)] });
}

const doc = new Document({
  sections: [
    {
      properties: {},
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [
            new TextRun({ text: "Akıllı Todo & Takvim Planlayıcı", bold: true, size: 36 }),
          ],
        }),
        p("Anlatıcı proje dokümanı — son aşama (MVP+)", true),
        p("Hazırlayan: ybaki · Trendyol kişisel üretkenlik projesi · Şubat 2026"),

        h("1. Bu uygulama ne anlatıyor?", HeadingLevel.HEADING_1),
        p(
          "Kullanıcı zihninde dağınık duran işleri tek cümleyle yazar. Uygulama o cümleyi anlar, önceliğini ve süresini belirler, listeye koyar — ama takvime kendi kendine yazmaz. Zamanı kullanıcı «Görev ata» dediğinde veya manuel planladığında doldurur. Böylece AI «ne yapmalıyım?» sorusuna cevap verir; «ne zaman?» sorusunun cevabı ise kurallara bağlı, şeffaf bir motordan gelir."
        ),

        h("2. Bir günün hikayesi", HeadingLevel.HEADING_1),
        p(
          "Sabah Gmail ile giriş yapılır. Görev kutusuna «Babam için hediye al, cumartesi deadline» yazılır. AI analiz eder: başlık, Aksiyon Al önceliği, yaklaşık süre. Görev listede kırmızı tonlu bir kart olarak görünür; solda dikey «1 s» etiketi, süreye göre koyulaşan renk."
        ),
        p(
          "Öğleden sonra takvim açılır. Sağ üstte «Görev ata» vardır. Kullanıcı o anki saate sığan, deadline ve toplantı kurallarına uyan en öncelikli işi tek tıkla takvime yerleştirir. Sığacak iş yoksa sağ üstte kısa bir uyarı çıkar."
        ),
        p(
          "Toplantı eklenince veya «Kapalı» blok çizilince o zaman dilimi dokunulmaz; daha düşük öncelikli planlanmış görevler listede kalır. Gün sonunda geciken işler hızlı notlar panelinde görünür."
        ),

        h("3. Mimari", HeadingLevel.HEADING_1),
        p("Next.js uygulaması (web + Chrome eklentisi giriş noktası) BFF katmanı olarak çalışır. Tüm API Route Handler'lar burada toplanır."),
        p("Supabase: Postgres, Row Level Security, Google OAuth. Kullanıcı verisi yalnızca kendi satırlarına erişir."),
        p("Gemini API: görev metninden yapılandırılmış JSON (başlık, quadrant, süre, deadline, etiketler)."),
        p("Deterministik scheduler: boş aralık hesabı, skorlama, Görev ata, yeniden planlama — LLM'siz, test edilebilir."),

        h("4. AI'nın sınırları", HeadingLevel.HEADING_1),
        p("AI yapar: metin analizi, öncelik önerisi, süre tahmini, deadline/enerji/etiket önerisi."),
        p("AI yapmaz: analiz sonrası otomatik takvim yazma; kullanıcı onayı olmadan slota yerleştirme."),
        p("Takvime yazma yolları: Görev ata, görev menüsünden yeniden planlama, hızlı notlardan planlama, toplantı/kapalı blok sonrası çakışan düşük öncelikli blokların silinmesi (otomatik yeniden planlama kapalı)."),

        h("5. Üç öncelik modeli", HeadingLevel.HEADING_1),
        p("Eski dörtlü Eisenhower matrisi kaldırıldı. Yeni model:"),
        p("• Aksiyon Al (kırmızı) — bugün bitmeli"),
        p("• Planla (yeşil) — gelecek için takvime konmalı"),
        p("• Kurtul (mor) — küçük, hızlıca bitirilecek işler"),
        p("Liste sırası: öncelik → en yakın deadline → oluşturulma. Kart rengi süreye göre 6 ton (30 dk en açık, tüm hafta en koyu)."),

        h("6. Planlama kuralları", HeadingLevel.HEADING_1),
        p("Öncelik sırası (Görev ata): deadline yakınlığı → Aksiyon Al → Planla → Kurtul."),
        p("Engeller: kapalı bloklar, toplantılar, mevcut planlar, aktif/çalışma saatleri, öğle arası, buffer."),
        p("Deadline: iş bitişi deadline'ı geçemez; sonraki toplantı/blok öncesi sığmalı."),
        p("Ayarlar ekranından aktif günler/saatler, çalışma günleri/saatler ve quadrant bazlı «çalışma» veya «aktif saat» modu seçilir."),

        h("7. Takvim", HeadingLevel.HEADING_1),
        p("Haftalık 7 günlük grid (Pazar başlangıç), 30 dakikalık slotlar. Sağ üst: Görev ata, Bugün, hafta gezintisi, tarih seçici."),
        p("Düzenleme: kapalı blok çiz/sil, toplantı ekle (tekrarlı olabilir), görev bloğunda düzenle/sil/yeniden planla."),
        p("Görsel: quadrant renkleri, kapalı alan tarama deseni, toplantı mavi, şu an kırmızı çizgi."),

        h("8. Veri modeli (özet)", HeadingLevel.HEADING_1),
        p("tasks — görevler; scheduled_blocks — onaylı takvim blokları; manual_calendar_blocks — kapalı zaman; calendar_meetings — toplantılar; profiles — kullanıcı tercihleri; task_analyses — LLM audit."),
        p("Migration 0005–0009: manuel bloklar, üç quadrant, toplantılar, planlama tercihleri, aktif saatler."),

        h("9. Kod organizasyonu", HeadingLevel.HEADING_1),
        p("src/lib/scheduler/ — motor (engine, freeIntervals, assignCurrentSlot, rescheduleTask, applySchedule)"),
        p("src/lib/tasks/ — analiz birleştirme, süre tahmini, gecikmiş görev mantığı"),
        p("src/lib/calendar/ — haftalık görünüm, toplantı, kapalı blok"),
        p("src/lib/quadrant.ts + deadlineUrgency.ts — öncelik ve deadline etkisi"),
        p("src/components/tasks/ + calendar/ — UI"),

        h("10. Güvenlik ve dağıtım", HeadingLevel.HEADING_1),
        p("Yalnızca @gmail.com OAuth. RLS tüm tablolarda. Rate limit (Upstash) production'da zorunlu. Sentry opsiyonel."),
        p("Detay: docs/google-auth-setup.md, security-checklist.md, deployment-runbook.md"),

        h("11. Son aşama özeti", HeadingLevel.HEADING_1),
        p(
          "Uygulama MVP'den «Görev ata + haftalık takvim + ayarlar + hızlı notlar» modeline evrildi. Eski matris UI, aday slot onay balonu ve analiz sonrası otomatik planlama kaldırıldı. Kullanılmayan FullCalendar, dnd-kit ve schedule_suggestions API'si temizlendi. AI anlar ve etiketler; zamanı kurallı motor ve kullanıcı eylemi belirler."
        ),
      ],
    },
  ],
});

async function main() {
  mkdirSync(dirname(OUTPUT), { recursive: true });
  const buffer = await Packer.toBuffer(doc);
  writeFileSync(OUTPUT, buffer);
  console.log(`Wrote ${OUTPUT}`);
}

void main();
