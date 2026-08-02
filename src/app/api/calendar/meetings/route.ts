import { addDays, endOfDay, startOfDay } from "date-fns";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { resolveRequestUser } from "@/lib/auth/resolveRequestUser";
import { expandMeetingOccurrences } from "@/lib/calendar/meetings";
import { carveManualBlocksForMeeting } from "@/lib/calendar/manualBlockCarve";
import { displaceScheduledTasksInRange } from "@/lib/calendar/displaceCommitments";
import { randomUUID } from "crypto";

const recurrenceSchema = z.object({
  frequency: z.enum(["day", "week", "month", "year"]),
  interval: z.number().int().min(1).max(52),
  until: z.string().nullable(),
  weekday: z.number().int().min(0).max(6).optional(),
});

const createMeetingSchema = z
  .object({
    title: z.string().max(500).default(""),
    details: z.string().max(5000).nullable().optional(),
    startAt: z.string().min(1),
    endAt: z.string().min(1),
    recurrence: recurrenceSchema.nullable().optional(),
  })
  .refine(
    (value) => {
      const start = new Date(value.startAt);
      const end = new Date(value.endAt);
      return !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end > start;
    },
    { message: "Gecersiz zaman araligi" }
  );

export async function GET(request: NextRequest) {
  const auth = await resolveRequestUser(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const { searchParams } = request.nextUrl;
  const startIso = searchParams.get("start") ?? startOfDay(now).toISOString();
  const endIso = searchParams.get("end") ?? endOfDay(addDays(now, 6)).toISOString();

  const { data, error } = await auth.supabase
    .from("calendar_meetings")
    .select("*")
    .eq("user_id", auth.userId)
    .gte("start_at", startIso)
    .lte("end_at", endIso)
    .order("start_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "query_failed", message: error.message }, { status: 500 });
  }

  return NextResponse.json({ meetings: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await resolveRequestUser(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = createMeetingSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", details: parsed.error.flatten() }, { status: 400 });
  }

  const start = new Date(parsed.data.startAt);
  const end = new Date(parsed.data.endAt);
  const recurrence = parsed.data.recurrence ?? null;
  const occurrences = expandMeetingOccurrences(start, end, recurrence);
  const seriesId = recurrence ? randomUUID() : null;
  const title = parsed.data.title.trim() || "Toplantı";
  const details = parsed.data.details?.trim() || null;

  const rows = occurrences.map((occurrence) => ({
    user_id: auth.userId,
    title,
    details,
    start_at: occurrence.startAt.toISOString(),
    end_at: occurrence.endAt.toISOString(),
    recurrence_rule: recurrence,
    series_id: seriesId,
  }));

  const { data, error } = await auth.supabase.from("calendar_meetings").insert(rows).select("*");

  if (error) {
    return NextResponse.json({ error: "insert_failed", message: error.message }, { status: 500 });
  }

  for (const occurrence of occurrences) {
    await carveManualBlocksForMeeting(
      auth.supabase,
      auth.userId,
      occurrence.startAt,
      occurrence.endAt
    );
    await displaceScheduledTasksInRange({
      supabase: auth.supabase,
      userId: auth.userId,
      startAt: occurrence.startAt,
      endAt: occurrence.endAt,
    });
  }

  return NextResponse.json({ meetings: data ?? [] }, { status: 201 });
}
