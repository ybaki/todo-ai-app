import { NextResponse, type NextRequest } from "next/server";
import { resolveRequestUser } from "@/lib/auth/resolveRequestUser";
import { analyzeTaskWithRetry } from "@/lib/llm/analyzeTask";
import { runHeuristicAnalysisFallback } from "@/lib/tasks/analyzeFallback";
import {
  resolveEstimatedMinutes,
  resolveQuadrantAfterAnalysis,
  resolveSplittable,
  resolveTaskSize,
} from "@/lib/tasks/analysisResolve";
import { checkRateLimit } from "@/lib/rateLimit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

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

  const now = new Date();

  try {
    await auth.supabase.from("tasks").update({ status: "analyzing" }).eq("id", id);

    const { attempts, final } = await analyzeTaskWithRetry({
      rawText: task.raw_text,
      preferences: {
        timezone: profile?.timezone ?? "Europe/Istanbul",
        workStart: "09:00",
        workEnd: "24:00",
        todayIso: now.toISOString(),
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
      const fallback = await runHeuristicAnalysisFallback({
        supabase: auth.supabase,
        userId: auth.userId,
        task,
        now,
      });

      return NextResponse.json({
        task: fallback.task,
        analysis: null,
        fallback: "heuristic",
        schedule: fallback.schedule,
        taskSize: fallback.taskSize,
        error: final.outcome.error,
      });
    }

    const analysis = final.outcome.data;
    const estimatedMinutes = resolveEstimatedMinutes(task, analysis);
    const taskSize = resolveTaskSize(task, analysis);
    const splittable = resolveSplittable(estimatedMinutes, taskSize, analysis);
    const quadrant = resolveQuadrantAfterAnalysis(task, analysis.quadrant, now);

    const { data: updatedTask, error } = await auth.supabase
      .from("tasks")
      .update({
        title: analysis.title,
        quadrant,
        estimated_minutes: estimatedMinutes,
        deadline: task.deadline ?? analysis.deadline,
        splittable: splittable.splittable,
        minimum_chunk_minutes: splittable.minimumChunkMinutes,
        energy: analysis.energy,
        tags: analysis.tags,
        confidence: analysis.confidence,
        status: "suggested",
      })
      .eq("id", id)
      .select("*")
      .single();

    let resolvedTask = updatedTask;
    if (error && quadrant === "get_rid") {
      const retry = await auth.supabase
        .from("tasks")
        .update({
          title: analysis.title,
          quadrant: "not_urgent_not_important",
          estimated_minutes: estimatedMinutes,
          deadline: task.deadline ?? analysis.deadline,
          splittable: splittable.splittable,
          minimum_chunk_minutes: splittable.minimumChunkMinutes,
          energy: analysis.energy,
          tags: analysis.tags,
          confidence: analysis.confidence,
          status: "suggested",
        })
        .eq("id", id)
        .select("*")
        .single();
      resolvedTask = retry.data;
    }

    if (!resolvedTask) {
      const fallback = await runHeuristicAnalysisFallback({
        supabase: auth.supabase,
        userId: auth.userId,
        task,
        now,
        confidence: 0.4,
      });

      return NextResponse.json({
        task: fallback.task,
        analysis: null,
        fallback: "update_recovery",
        schedule: fallback.schedule,
        taskSize: fallback.taskSize,
        error: error?.message ?? "Guncelleme basarisiz, heuristic kullanildi",
      });
    }

    return NextResponse.json({
      task: resolvedTask,
      analysis,
      schedule: null,
      taskSize,
    });
  } catch (error) {
    try {
      const fallback = await runHeuristicAnalysisFallback({
        supabase: auth.supabase,
        userId: auth.userId,
        task,
        now,
        confidence: 0.25,
      });

      return NextResponse.json({
        task: fallback.task,
        analysis: null,
        fallback: "error_recovery",
        schedule: fallback.schedule,
        taskSize: fallback.taskSize,
        error: error instanceof Error ? error.message : "Analiz basarisiz",
      });
    } catch (recoveryError) {
      await auth.supabase.from("tasks").update({ status: "inbox" }).eq("id", id);

      return NextResponse.json(
        {
          error: "analyze_failed",
          message:
            recoveryError instanceof Error ? recoveryError.message : "Analiz tamamlanamadi",
        },
        { status: 500 }
      );
    }
  }
}
