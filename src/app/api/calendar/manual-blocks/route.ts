import { addDays, endOfDay, isSameDay, startOfDay } from "date-fns";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { resolveRequestUser } from "@/lib/auth/resolveRequestUser";
import {
  displaceScheduledTasksInRange,
  removeMeetingsInRange,
} from "@/lib/calendar/displaceCommitments";
function isWithinEditableHours(start: Date, end: Date): boolean {
  const durationMinutes = (end.getTime() - start.getTime()) / (60 * 1000);
  if (durationMinutes < 30) return false;
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = end.getHours() * 60 + end.getMinutes();
  const endIsMidnightNextDay =
    end.getHours() === 0 && end.getMinutes() === 0 && !isSameDay(start, end);
  if (endIsMidnightNextDay) return startMinutes >= 0;
  return startMinutes >= 0 && endMinutes <= 24 * 60 && endMinutes > startMinutes;
}

const createManualBlockSchema = z
  .object({
    startAt: z.string().min(1),
    endAt: z.string().min(1),
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
    .from("manual_calendar_blocks")
    .select("*")
    .eq("user_id", auth.userId)
    .gte("start_at", startIso)
    .lte("end_at", endIso)
    .order("start_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "query_failed", message: error.message }, { status: 500 });
  }

  return NextResponse.json({ blocks: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await resolveRequestUser(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = createManualBlockSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", details: parsed.error.flatten() }, { status: 400 });
  }

  const start = new Date(parsed.data.startAt);
  const end = new Date(parsed.data.endAt);

  if (!isWithinEditableHours(start, end)) {
    return NextResponse.json(
      { error: "out_of_range", message: "Blok en az 30 dk olmali ve 00:00-24:00 araliginda kalmali" },
      { status: 400 }
    );
  }

  const { data: overlapping } = await auth.supabase
    .from("manual_calendar_blocks")
    .select("id")
    .eq("user_id", auth.userId)
    .lt("start_at", parsed.data.endAt)
    .gt("end_at", parsed.data.startAt)
    .limit(1);

  if (overlapping && overlapping.length > 0) {
    return NextResponse.json(
      { error: "overlap", message: "Bu aralik mevcut bir kapali blokla cakisiyor" },
      { status: 409 }
    );
  }

  const { data, error } = await auth.supabase
    .from("manual_calendar_blocks")
    .insert({
      user_id: auth.userId,
      start_at: parsed.data.startAt,
      end_at: parsed.data.endAt,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "insert_failed", message: error.message }, { status: 500 });
  }

  await removeMeetingsInRange({
    supabase: auth.supabase,
    userId: auth.userId,
    startAt: start,
    endAt: end,
  });

  await displaceScheduledTasksInRange({
    supabase: auth.supabase,
    userId: auth.userId,
    startAt: start,
    endAt: end,
  });

  return NextResponse.json({ block: data }, { status: 201 });
}
