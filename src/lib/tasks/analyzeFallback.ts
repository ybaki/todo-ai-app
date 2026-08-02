import type { SupabaseClient } from "@supabase/supabase-js";
import { classifyQuadrantHeuristic } from "@/lib/llm/heuristicClassifier";
import { getEffectiveQuadrant } from "@/lib/scheduler/deadlineUrgency";
import {
  resolveEstimatedMinutes,
  resolveSplittable,
  resolveTaskSize,
} from "@/lib/tasks/analysisResolve";
import { normalizeQuadrant } from "@/lib/quadrant";
import { isMissingGetRidEnumError } from "@/lib/tasks/quadrantDb";
import type { TaskRow } from "@/types/database";

async function updateTaskWithQuadrantFallback(params: {
  supabase: SupabaseClient;
  taskId: string;
  payload: Record<string, unknown>;
}): Promise<TaskRow> {
  const { supabase, taskId, payload } = params;
  const first = await supabase.from("tasks").update(payload).eq("id", taskId).select("*").single();

  if (!first.error && first.data) return first.data;

  const quadrant = payload.quadrant as string | undefined;
  if (quadrant === "get_rid" && isMissingGetRidEnumError(first.error?.message)) {
    const retry = await supabase
      .from("tasks")
      .update({ ...payload, quadrant: "not_urgent_not_important" })
      .eq("id", taskId)
      .select("*")
      .single();
    if (retry.error || !retry.data) {
      throw new Error(retry.error?.message ?? first.error?.message ?? "Guncelleme basarisiz");
    }
    return retry.data;
  }

  throw new Error(first.error?.message ?? "Guncelleme basarisiz");
}

export async function runHeuristicAnalysisFallback(params: {
  supabase: SupabaseClient;
  userId: string;
  task: TaskRow;
  now: Date;
  confidence?: number;
}): Promise<{
  task: TaskRow;
  taskSize: ReturnType<typeof resolveTaskSize>;
  schedule: null;
}> {
  const { supabase, task, now, confidence = 0.35 } = params;
  const heuristicQuadrant = classifyQuadrantHeuristic(task.raw_text);
  const estimatedMinutes = resolveEstimatedMinutes(task);
  const taskSize = resolveTaskSize(task, undefined);
  const resolvedQuadrant = getEffectiveQuadrant(
    heuristicQuadrant ?? normalizeQuadrant(task.quadrant) ?? "get_rid",
    task.deadline ? new Date(task.deadline) : null,
    now
  );
  const splittable = resolveSplittable(estimatedMinutes, taskSize);

  const updatedTask = await updateTaskWithQuadrantFallback({
    supabase,
    taskId: task.id,
    payload: {
      title: task.raw_text.trim().slice(0, 200),
      quadrant: resolvedQuadrant,
      estimated_minutes: estimatedMinutes,
      splittable: splittable.splittable,
      minimum_chunk_minutes: splittable.minimumChunkMinutes,
      status: heuristicQuadrant ? "suggested" : "needs_user_input",
      confidence,
    },
  });

  return { task: updatedTask, taskSize, schedule: null };
}
