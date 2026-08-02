import type { SupabaseClient } from "@supabase/supabase-js";
import type { EisenhowerQuadrant, TaskRow } from "@/types/database";
import { quadrantPriorityRank } from "./deadlineUrgency";
import { overlapsRange } from "./slotRules";
import type { ScheduledEntry } from "./scheduleContext";
import type { TimeRange } from "./types";

/** Planlanan bloklari yazar.
 * Oncelik: kapali alan/toplamti dokunulmaz; Aksiyon Al > Planla > Kurtul kaydirma. */
export async function applyPlannedBlocks(params: {
  supabase: SupabaseClient;
  userId: string;
  task: TaskRow;
  plannedBlocks: TimeRange[];
  scheduledEntries: ScheduledEntry[];
  incomingQuadrant: EisenhowerQuadrant | null;
}): Promise<Array<{ start_at: string; end_at: string }>> {
  const { supabase, userId, task, plannedBlocks, scheduledEntries, incomingQuadrant } = params;
  const incomingRank = quadrantPriorityRank(incomingQuadrant);

  const bumpedEntries = scheduledEntries.filter((entry) => {
    if (entry.taskId === task.id) return false;
    if (incomingRank <= quadrantPriorityRank(entry.quadrant)) return false;
    return plannedBlocks.some((block) => overlapsRange(block, entry));
  });

  for (const entry of bumpedEntries) {
    await supabase.from("scheduled_blocks").delete().eq("id", entry.blockId).eq("user_id", userId);
    await supabase.from("tasks").update({ status: "suggested" }).eq("id", entry.taskId);
  }

  await supabase.from("scheduled_blocks").delete().eq("task_id", task.id).eq("user_id", userId);

  const insertedBlocks: Array<{ start_at: string; end_at: string }> = [];

  for (const block of plannedBlocks) {
    const { data: inserted, error } = await supabase
      .from("scheduled_blocks")
      .insert({
        task_id: task.id,
        user_id: userId,
        start_at: block.start.toISOString(),
        end_at: block.end.toISOString(),
        source: "app",
      })
      .select("start_at, end_at")
      .single();

    if (error || !inserted) continue;
    insertedBlocks.push(inserted);
  }

  if (insertedBlocks.length === 0) return [];

  await supabase.from("tasks").update({ status: "scheduled" }).eq("id", task.id).eq("user_id", userId);

  return insertedBlocks;
}
