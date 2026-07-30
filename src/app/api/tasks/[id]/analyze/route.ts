import { NextResponse, type NextRequest } from "next/server";
import { resolveRequestUser } from "@/lib/auth/resolveRequestUser";
import { analyzeTaskWithRetry } from "@/lib/llm/analyzeTask";
import { checkRateLimit } from "@/lib/rateLimit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// FR-03: quadrant, sure, deadline, etiket, parcalanabilirlik ve confidence
// donmelidir. Gecersiz yanit -> NEEDS_USER_INPUT fallback (dokuman bolum 9.2).
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await resolveRequestUser(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { allowed } = await checkRateLimit(`analyze-task:${auth.userId}`);
  if (!allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const { id } = await params;

  const { data: task } = await auth.supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (!task) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("timezone, work_start, work_end")
    .eq("id", auth.userId)
    .single();

  await auth.supabase.from("tasks").update({ status: "analyzing" }).eq("id", id);

  const { attempts, final } = await analyzeTaskWithRetry({
    rawText: task.raw_text,
    preferences: {
      timezone: profile?.timezone ?? "Europe/Istanbul",
      workStart: profile?.work_start ?? "09:00",
      workEnd: profile?.work_end ?? "18:00",
      todayIso: new Date().toISOString(),
    },
  });

  for (const attempt of attempts) {
    await auth.supabase.from("task_analyses").insert({
      task_id: id,
      user_id: auth.userId,
      model: attempt.model,
      prompt_version: attempt.promptVersion,
      input_tokens: attempt.inputTokens,
      output_tokens: attempt.outputTokens,
      output_json: attempt.outcome.ok ? attempt.outcome.data : { rawText: attempt.outcome.rawText },
      confidence: attempt.outcome.ok ? attempt.outcome.data.confidence : null,
      cost_usd: attempt.costUsd,
      latency_ms: attempt.latencyMs,
      is_valid: attempt.outcome.ok,
      error_message: attempt.outcome.ok ? null : attempt.outcome.error,
    });
  }

  if (!final.outcome.ok) {
    const { data: updatedTask } = await auth.supabase
      .from("tasks")
      .update({ status: "needs_user_input" })
      .eq("id", id)
      .select("*")
      .single();

    return NextResponse.json(
      { task: updatedTask, analysis: null, error: final.outcome.error },
      { status: 200 }
    );
  }

  const analysis = final.outcome.data;

  const { data: updatedTask, error } = await auth.supabase
    .from("tasks")
    .update({
      title: analysis.title,
      quadrant: analysis.quadrant,
      estimated_minutes: analysis.estimatedMinutes,
      deadline: analysis.deadline,
      splittable: analysis.splittable,
      minimum_chunk_minutes: analysis.minimumChunkMinutes,
      energy: analysis.energy,
      tags: analysis.tags,
      confidence: analysis.confidence,
      status: "suggested",
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "update_failed", message: error.message }, { status: 500 });
  }

  return NextResponse.json({ task: updatedTask, analysis });
}
