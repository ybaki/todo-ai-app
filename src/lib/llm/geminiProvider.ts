import { GoogleGenAI } from "@google/genai";
import { env } from "@/lib/env";
import { isModelUnavailableError, resolveGeminiModels } from "./models";
import { parseTaskAnalysis } from "./schema";
import type { AnalyzeTaskInput, AnalyzeTaskResponse, LlmAdapter } from "./adapter";

const PROMPT_VERSION = "v3";

// Gemini 3.1 Flash-Lite fiyatlandirmasi (dokuman bolum 9.3, 30 Temmuz 2026 itibariyla).
// Kaynak dogrulugu icin bkz. docs/Akilli_Todo_Takvim_Proje_Dokumani.docx [R7].
const INPUT_COST_PER_MILLION_USD = 0.25;
const OUTPUT_COST_PER_MILLION_USD = 1.5;

function buildResponseSchema() {
  return {
    type: "object",
    properties: {
      title: { type: "string" },
      quadrant: {
        type: "string",
        enum: ["urgent_important", "not_urgent_important", "get_rid"],
      },
      estimatedMinutes: { type: "integer" },
      deadline: { type: "string", nullable: true },
      splittable: { type: "boolean" },
      minimumChunkMinutes: { type: "integer", nullable: true },
      energy: { type: "string", enum: ["low", "medium", "high_focus"] },
      tags: { type: "array", items: { type: "string" } },
      confidence: { type: "number" },
      reason: { type: "string" },
    },
    required: [
      "title",
      "quadrant",
      "estimatedMinutes",
      "deadline",
      "splittable",
      "minimumChunkMinutes",
      "energy",
      "tags",
      "confidence",
      "reason",
    ],
  } as const;
}

function buildPrompt(input: AnalyzeTaskInput): string {
  const { rawText, preferences } = input;
  return [
    "Sen bir kisisel verimlilik asistanisin. Kullanicinin yazdigi gorev metnini",
    "asagidaki uc oncelik kategorisinden birine siniflandir ve JSON semasina birebir uyan",
    "bir cevap uret. Yalnizca verilen metni ve kullanici tercihlerini kullan.",
    "",
    "Kategoriler (quadrant alanina bu kodlardan birini yaz):",
    '- urgent_important = "Aksiyon Al": Bugun ne bitmeli? (acil ve bugun tamamlanmali)',
    '- not_urgent_important = "Planla": Gelecegim icin bugun takvime ne koymaliyim?',
    '- get_rid = "Kurtul": Odaklanmayi engelleyen ufak tefek isler; hizlica aradan cikar',
    "",
    "Ornekler:",
    '- "acil bir is" veya "hemen yap" -> urgent_important',
    '- "proje planini hazirla" -> not_urgent_important',
    '- "mail cevapla", "arabayi yikat", "masa duzenle" -> get_rid',
    "",
    "Turkce metinlerde acil/hemen/bugun gibi kelimeler genelde urgent_important isaret eder;",
    "her seyi get_rid yapma.",
    "",
    "Onemli kurallar:",
    "- Metinde acik deadline veya cok kisa sure varsa (or. '10 dk icinde', 'simdi', 'hemen')",
    "  quadrant mutlaka urgent_important (Aksiyon Al) olmali.",
    "- Teknik isler (yazilim, test, kod, API, debug) icin tags'a 'teknik' ekle.",
    "- Gunluk/kisisel isler (alisveris, ekmek, araba yikama, bilet) icin tags'a 'gunluk' ekle.",
    "- estimatedMinutes belirleyemezsen 60 dakika (1 puan) kullan.",
    "- estimatedMinutes yalnizca su puan kademelerine denk gelmeli:",
    "  1 puan=60dk, 2 puan=120dk, 3 puan=420dk, 5 puan=720dk, 8 puan=1080dk.",
    "",
    `Bugunun tarihi (ISO): ${preferences.todayIso}`,
    `Kullanicinin saat dilimi: ${preferences.timezone}`,
    `Planlama penceresi: ${preferences.workStart}-${preferences.workEnd}`,
    "",
    `Gorev metni: "${rawText}"`,
  ].join("\n");
}

class GeminiAdapter implements LlmAdapter {
  private client: GoogleGenAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async analyzeTask(input: AnalyzeTaskInput): Promise<AnalyzeTaskResponse> {
    const startedAt = Date.now();
    const models = resolveGeminiModels(env.gemini.model);
    let lastError = "Bilinmeyen LLM hatasi";
    let lastModel = models[0] ?? env.gemini.model;

    for (const model of models) {
      lastModel = model;
      try {
        const response = await this.client.models.generateContent({
          model,
          contents: buildPrompt(input),
          config: {
            responseMimeType: "application/json",
            responseSchema: buildResponseSchema(),
            temperature: 0.2,
          },
        });

        const latencyMs = Date.now() - startedAt;
        const rawText = response.text ?? "";
        const outcome = parseTaskAnalysis(rawText);

        if (!outcome.ok && isModelUnavailableError(outcome.error)) {
          lastError = outcome.error;
          continue;
        }

        const inputTokens = response.usageMetadata?.promptTokenCount ?? null;
        const outputTokens = response.usageMetadata?.candidatesTokenCount ?? null;
        const costUsd =
          inputTokens !== null && outputTokens !== null
            ? (inputTokens / 1_000_000) * INPUT_COST_PER_MILLION_USD +
              (outputTokens / 1_000_000) * OUTPUT_COST_PER_MILLION_USD
            : null;

        return {
          outcome,
          model,
          promptVersion: PROMPT_VERSION,
          inputTokens,
          outputTokens,
          latencyMs,
          costUsd,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Bilinmeyen LLM hatasi";
        lastError = message;
        if (isModelUnavailableError(message)) {
          continue;
        }
        break;
      }
    }

    return {
      outcome: {
        ok: false,
        error: lastError,
        rawText: "",
      },
      model: lastModel,
      promptVersion: PROMPT_VERSION,
      inputTokens: null,
      outputTokens: null,
      latencyMs: Date.now() - startedAt,
      costUsd: null,
    };
  }
}

let cachedAdapter: LlmAdapter | null = null;

/** Uygulama genelinde tek bir adapter instance'i (singleton) dondurur. */
export function getLlmAdapter(): LlmAdapter {
  if (!cachedAdapter) {
    cachedAdapter = new GeminiAdapter(env.gemini.apiKey);
  }
  return cachedAdapter;
}
