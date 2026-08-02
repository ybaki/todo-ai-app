import type { SupabaseClient } from "@supabase/supabase-js";
import { autoScheduleTask } from "@/lib/scheduler/autoSchedule";
import { rangesOverlap } from "@/lib/calendar/weekView";
import type { TaskRow } from "@/types/database";

/** Manuel blok/toplanti araligi ile cakisan planli gorevleri ilk uygun slota tasir. */
export async function displaceScheduledTasksInRange(params: {
  supabase: SupabaseClient;
  userId: string;
  startAt: Date;
  endAt: Date;
}): Promise<void> {
  const { supabase, userId, startAt, endAt } = params;

  const { data: overlappingBlocks } = await supabase
    .from("scheduled_blocks")
    .select("id, task_id, start_at, end_at")
    .eq("user_id", userId)
    .lt("start_at", endAt.toISOString())
    .gt("end_at", startAt.toISOString());

  if (!overlappingBlocks?.length) return;

  const taskIds = [...new Set(overlappingBlocks.map((block) => block.task_id))];

  for (const block of overlappingBlocks) {
    await supabase.from("scheduled_blocks").delete().eq("id", block.id).eq("user_id", userId);
  }

  for (const taskId of taskIds) {
    await supabase.from("tasks").update({ status: "suggested" }).eq("id", taskId).eq("user_id", userId);

    const { data: task } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .eq("user_id", userId)
      .maybeSingle();

    if (task?.estimated_minutes) {
      try {
        await autoScheduleTask({ supabase, userId, task: task as TaskRow });
      } catch {
        // Tek gorev tasima hatasi digerlerini engellemez.
      }
    }
  }
}

/** Manuel blok, ustune binen toplanti satirlarini siler (kullanici ezer). */
export async function removeMeetingsInRange(params: {
  supabase: SupabaseClient;
  userId: string;
  startAt: Date;
  endAt: Date;
}): Promise<void> {
  const { supabase, userId, startAt, endAt } = params;

  const { data: meetings } = await supabase
    .from("calendar_meetings")
    .select("id, start_at, end_at")
    .eq("user_id", userId)
    .lt("start_at", endAt.toISOString())
    .gt("end_at", startAt.toISOString());

  for (const meeting of meetings ?? []) {
    if (
      rangesOverlap(startAt, endAt, new Date(meeting.start_at), new Date(meeting.end_at))
    ) {
      await supabase.from("calendar_meetings").delete().eq("id", meeting.id).eq("user_id", userId);
    }
  }
}
