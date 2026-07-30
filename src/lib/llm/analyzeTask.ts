import type { AnalyzeTaskInput, AnalyzeTaskResponse } from "./adapter";
import { getLlmAdapter } from "./geminiProvider";

export interface AnalyzeWithRetryResult {
  attempts: AnalyzeTaskResponse[];
  final: AnalyzeTaskResponse;
}

/**
 * Gecersiz LLM yanitini bir kez "repair" denemesiyle duzeltmeye calisir;
 * yine basarisiz olursa cagiran taraf (API route) gorevi NEEDS_USER_INPUT
 * durumuna dusurmelidir. Bkz. dokuman bolum 9.2 ve plan FAZ 3.
 */
export async function analyzeTaskWithRetry(
  input: AnalyzeTaskInput
): Promise<AnalyzeWithRetryResult> {
  const adapter = getLlmAdapter();
  const attempts: AnalyzeTaskResponse[] = [];

  const first = await adapter.analyzeTask(input);
  attempts.push(first);
  if (first.outcome.ok) {
    return { attempts, final: first };
  }

  const repairInput: AnalyzeTaskInput = {
    ...input,
    rawText: `${input.rawText}\n\n[Sistem notu: onceki yanitin JSON semasina uymadi (${first.outcome.error}). Lutfen SADECE gecerli JSON ile, semaya birebir uyarak yeniden cevap ver.]`,
  };
  const second = await adapter.analyzeTask(repairInput);
  attempts.push(second);

  return { attempts, final: second };
}
