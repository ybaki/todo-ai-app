import { GoogleGenAI } from "@google/genai";
import { env } from "@/lib/env";
import { parseTaskAnalysis } from "./schema";
import type { AnalyzeTaskInput, AnalyzeTaskResponse, LlmAdapter } from "./adapter";

const PROMPT_VERSION = "v1";

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
        enum: [
          "urgent_important",
          "not_urgent_important",
          "urgent_not_important",
          "not_urgent_not_important",
        ],
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
  // Bilincli olarak: takvim toplanti basliklari/aciklamalari, katilimci bilgisi
  // veya sirket e-postasi BURAYA asla eklenmez (dokuman bolum 9.2 / 12).
  return [
    "Sen bir kisisel verimlilik asistanisin. Kullanicinin yazdigi gorev metnini",
    "Eisenhower matrisine gore siniflandir ve JSON semasina birebir uyan bir",
    "cevap uret. Yalnizca verilen metni ve kullanici tercihlerini kullan;",
    "baska hicbir baglam varsayma.",
    "",
    `Bugunun tarihi (ISO): ${preferences.todayIso}`,
    `Kullanicinin saat dilimi: ${preferences.timezone}`,
    `Kullanicinin calisma saatleri: ${preferences.workStart}-${preferences.workEnd}`,
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
    const model = env.gemini.model;

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
      return {
        outcome: {
          ok: false,
          error: error instanceof Error ? error.message : "Bilinmeyen LLM hatasi",
          rawText: "",
        },
        model,
        promptVersion: PROMPT_VERSION,
        inputTokens: null,
        outputTokens: null,
        latencyMs: Date.now() - startedAt,
        costUsd: null,
      };
    }
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
