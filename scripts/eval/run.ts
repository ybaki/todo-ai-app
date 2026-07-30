/**
 * FAZ 3/7 eval script: tasks.sample.json icindeki gorevleri gercek Gemini
 * adapter'i ile analiz eder ve quadrant tahminini `expectedQuadrant` ile
 * karsilastirip dogruluk raporu basar.
 *
 * Kullanim:
 *   GEMINI_API_KEY=... npx tsx scripts/eval/run.ts
 *
 * Kendi gercek gorevlerinizi eklemek icin tasks.sample.json'u guncelleyin
 * veya --file ile farkli bir dosya verin:
 *   npx tsx scripts/eval/run.ts --file scripts/eval/tasks.mine.json
 */
import { readFileSync } from "node:fs";
import { analyzeTaskWithRetry } from "../../src/lib/llm/analyzeTask";

interface EvalCase {
  rawText: string;
  expectedQuadrant: string;
}

function parseArgs() {
  const fileArgIndex = process.argv.indexOf("--file");
  const filePath =
    fileArgIndex !== -1 ? process.argv[fileArgIndex + 1] : "scripts/eval/tasks.sample.json";
  return { filePath };
}

async function main() {
  const { filePath } = parseArgs();
  const cases: EvalCase[] = JSON.parse(readFileSync(filePath, "utf8"));

  console.log(`\n${cases.length} gorev uzerinde eval calistiriliyor (${filePath})...\n`);

  let correct = 0;
  let invalidCount = 0;
  let totalLatencyMs = 0;
  let totalCostUsd = 0;

  for (const [index, testCase] of cases.entries()) {
    const { final } = await analyzeTaskWithRetry({
      rawText: testCase.rawText,
      preferences: {
        timezone: "Europe/Istanbul",
        workStart: "09:00",
        workEnd: "18:00",
        todayIso: new Date().toISOString(),
      },
    });

    totalLatencyMs += final.latencyMs;
    totalCostUsd += final.costUsd ?? 0;

    if (!final.outcome.ok) {
      invalidCount += 1;
      console.log(`[${index + 1}/${cases.length}] ❌ GECERSIZ YANIT — "${testCase.rawText}"`);
      continue;
    }

    const isCorrect = final.outcome.data.quadrant === testCase.expectedQuadrant;
    if (isCorrect) correct += 1;

    const marker = isCorrect ? "✅" : "⚠️ ";
    console.log(
      `[${index + 1}/${cases.length}] ${marker} beklenen=${testCase.expectedQuadrant} tahmin=${final.outcome.data.quadrant} — "${testCase.rawText}"`
    );
  }

  const total = cases.length;
  const accuracy = ((correct / total) * 100).toFixed(1);
  const avgLatency = (totalLatencyMs / total).toFixed(0);

  console.log("\n--- Ozet ---");
  console.log(`Dogruluk: ${correct}/${total} (%${accuracy})`);
  console.log(`Gecersiz yanit: ${invalidCount}/${total}`);
  console.log(`Ortalama latency: ${avgLatency} ms`);
  console.log(`Toplam tahmini maliyet: $${totalCostUsd.toFixed(4)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
