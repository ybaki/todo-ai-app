import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { resolveRequestUser } from "@/lib/auth/resolveRequestUser";

const updateTaskSchema = z.object({
  quadrant: z.enum(["urgent_important", "not_urgent_important", "get_rid"]).optional(),
  status: z
    .enum([
      "inbox",
      "analyzing",
      "needs_user_input",
      "suggested",
      "confirmed",
      "scheduled",
      "conflicted",
      "reschedule_suggested",
      "done",
      "archived",
    ])
    .optional(),
  title: z.string().min(1).max(200).optional(),
  estimatedMinutes: z.number().int().min(5).max(480).optional(),
  deadline: z.string().datetime({ offset: true }).nullable().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// FR-08: Drag & drop ile matris quadrant degisikligi de bu endpoint uzerinden yapilir.
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await resolveRequestUser(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = updateTaskSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", details: parsed.error.flatten() }, { status: 400 });
  }

  const { data: previousTask } = await auth.supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (!previousTask) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const updatePayload: Record<string, unknown> = {};
  if (parsed.data.quadrant) updatePayload.quadrant = parsed.data.quadrant;
  if (parsed.data.status) updatePayload.status = parsed.data.status;
  if (parsed.data.title) updatePayload.title = parsed.data.title;
  if (parsed.data.estimatedMinutes) updatePayload.estimated_minutes = parsed.data.estimatedMinutes;
  if (parsed.data.deadline !== undefined) updatePayload.deadline = parsed.data.deadline;

  const { data, error } = await auth.supabase
    .from("tasks")
    .update(updatePayload)
    .eq("id", id)
    .eq("user_id", auth.userId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "update_failed", message: error.message }, { status: 500 });
  }

  if (parsed.data.quadrant && parsed.data.quadrant !== previousTask.quadrant) {
    await auth.supabase.from("task_feedback").insert({
      task_id: id,
      user_id: auth.userId,
      feedback_type: "quadrant_change",
      old_value: { quadrant: previousTask.quadrant },
      new_value: { quadrant: parsed.data.quadrant },
    });
  }

  return NextResponse.json({ task: data });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await resolveRequestUser(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { error } = await auth.supabase.from("tasks").delete().eq("id", id).eq("user_id", auth.userId);

  if (error) {
    return NextResponse.json({ error: "delete_failed", message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
