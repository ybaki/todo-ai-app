import type { TaskAnalysisOutcome } from "./schema";

export interface UserPreferencesContext {
  timezone: string;
  workStart: string;
  workEnd: string;
  todayIso: string;
}

export interface AnalyzeTaskInput {
  rawText: string;
  preferences: UserPreferencesContext;
}

export interface AnalyzeTaskResponse {
  outcome: TaskAnalysisOutcome;
  model: string;
  promptVersion: string;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number;
  costUsd: number | null;
}

/**
 * Saglayici bagimsiz LLM adapter arayuzu. Yeni bir saglayici (OpenAI,
 * self-host Ollama, vb.) eklemek icin yalnizca bu arayuzu implemente eden
 * yeni bir sinif yazmak yeterlidir; geri kalan uygulama kodu degismez.
 * Bkz. plan bolum 1 ve dokuman 9.2 (prompt/dogrulama yaklasimi) ile
 * fonksiyonel olmayan gereksinim "Tasinabilirlik" (bolum 5.1).
 */
export interface LlmAdapter {
  analyzeTask(input: AnalyzeTaskInput): Promise<AnalyzeTaskResponse>;
}
