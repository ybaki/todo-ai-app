import { z } from "zod";
import type { EisenhowerQuadrant } from "@/types/database";

function normalizeDeadline(value: unknown): unknown {
  if (value === "" || value === undefined) return null;
  if (typeof value !== "string") return value;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(value)) {
    return value.replace("Z", "+00:00");
  }
  return value;
}

function normalizeQuadrantInput(value: unknown): unknown {
  if (value === "urgent_not_important" || value === "not_urgent_not_important") {
    return "get_rid";
  }
  return value;
}

/**
 * LLM'den beklenen structured output semasi.
 * Bkz. docs/Akilli_Todo_Takvim_Proje_Dokumani.docx bolum 9.1.
 */
export const taskAnalysisSchema = z.object({
  title: z.string().min(1).max(200),
  quadrant: z.preprocess(
    normalizeQuadrantInput,
    z.enum(["urgent_important", "not_urgent_important", "get_rid"])
  ),
  estimatedMinutes: z.number().int().min(5).max(8 * 60),
  deadline: z.preprocess(
    normalizeDeadline,
    z.string().datetime({ offset: true }).nullable()
  ),
  splittable: z.boolean(),
  minimumChunkMinutes: z.number().int().min(5).max(8 * 60).nullable(),
  energy: z.enum(["low", "medium", "high_focus"]),
  tags: z.array(z.string().min(1).max(30)).max(6),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(1).max(300),
});

export type TaskAnalysisResult = z.infer<typeof taskAnalysisSchema>;

/** Gecersiz/eksik LLM yanitini ayni sekilde ele almak icin ortak sonuc tipi. */
export type TaskAnalysisOutcome =
  | { ok: true; data: TaskAnalysisResult; rawText: string }
  | { ok: false; error: string; rawText: string };

export function parseTaskAnalysis(rawJsonText: string): TaskAnalysisOutcome {
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawJsonText);
  } catch {
    return { ok: false, error: "LLM yaniti gecerli JSON degil", rawText: rawJsonText };
  }

  const result = taskAnalysisSchema.safeParse(parsedJson);
  if (!result.success) {
    return {
      ok: false,
      error: result.error.issues.map((issue) => issue.message).join("; "),
      rawText: rawJsonText,
    };
  }

  return { ok: true, data: result.data, rawText: rawJsonText };
}
