import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  HOUR_END_TIME_OPTIONS,
  HOUR_START_TIME_OPTIONS,
  DEFAULT_ACTIVE_DAYS,
  DEFAULT_WORK_DAYS,
  legacyWorkDayModeToDays,
  normalizeIsoWeekdays,
  normalizeScheduleMode,
  validateHourWindows,
  type IsoWeekday,
} from "@/lib/scheduling/userPreferences";

const isoDaySchema = z.number().int().min(1).max(7);
const scheduleModeSchema = z.enum(["work_hours", "active_hours"]);

const updateProfileSchema = z.object({
  timezone: z.string().min(1).optional(),
  workStart: z.enum(HOUR_START_TIME_OPTIONS as [string, ...string[]]).optional(),
  workEnd: z.enum(HOUR_END_TIME_OPTIONS as [string, ...string[]]).optional(),
  workDays: z.array(isoDaySchema).min(1).max(7).optional(),
  activeStart: z.enum(HOUR_START_TIME_OPTIONS as [string, ...string[]]).optional(),
  activeEnd: z.enum(HOUR_END_TIME_OPTIONS as [string, ...string[]]).optional(),
  activeDays: z.array(isoDaySchema).min(1).max(7).optional(),
  urgentScheduleMode: scheduleModeSchema.optional(),
  planScheduleMode: scheduleModeSchema.optional(),
  getRidScheduleMode: scheduleModeSchema.optional(),
  lunchStart: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  lunchEnd: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  bufferMinutes: z.number().int().min(0).max(120).optional(),
  minFocusBlockMinutes: z.number().int().min(5).max(240).optional(),
  maxDailyFocusMinutes: z.number().int().min(30).max(600).optional(),
});

function withDefaults<T extends Record<string, unknown>>(profile: T) {
  const workDays =
    Array.isArray(profile.work_days) && profile.work_days.length > 0
      ? normalizeIsoWeekdays(profile.work_days as number[])
      : legacyWorkDayModeToDays(profile.work_day_mode as string | undefined);

  return {
    ...profile,
    work_days: workDays,
    active_days:
      Array.isArray(profile.active_days) && profile.active_days.length > 0
        ? normalizeIsoWeekdays(profile.active_days as number[])
        : [...DEFAULT_ACTIVE_DAYS],
    active_start: profile.active_start ?? "07:00:00",
    active_end: profile.active_end ?? "23:00:00",
    urgent_schedule_mode: normalizeScheduleMode(profile.urgent_schedule_mode as string),
    plan_schedule_mode: normalizeScheduleMode(profile.plan_schedule_mode as string),
    get_rid_schedule_mode: normalizeScheduleMode(profile.get_rid_schedule_mode as string),
  };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (error) {
    return NextResponse.json({ error: "query_failed", message: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: withDefaults(data) });
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", details: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: current } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!current) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const merged = withDefaults(current);
  const nextWorkDays = parsed.data.workDays
    ? normalizeIsoWeekdays(parsed.data.workDays)
    : merged.work_days;
  const nextActiveDays = parsed.data.activeDays
    ? normalizeIsoWeekdays(parsed.data.activeDays)
    : merged.active_days;
  const nextWorkStart = parsed.data.workStart ?? merged.work_start.slice(0, 5);
  const nextWorkEnd = parsed.data.workEnd ?? merged.work_end.slice(0, 5);
  const nextActiveStart = parsed.data.activeStart ?? merged.active_start.slice(0, 5);
  const nextActiveEnd = parsed.data.activeEnd ?? merged.active_end.slice(0, 5);

  const validationError = validateHourWindows({
    workDays: nextWorkDays as IsoWeekday[],
    workStart: nextWorkStart,
    workEnd: nextWorkEnd,
    activeDays: nextActiveDays as IsoWeekday[],
    activeStart: nextActiveStart,
    activeEnd: nextActiveEnd,
  });

  if (validationError) {
    return NextResponse.json({ error: "invalid_hours", message: validationError }, { status: 400 });
  }

  const payload: Record<string, unknown> = {};
  if (parsed.data.timezone) payload.timezone = parsed.data.timezone;
  if (parsed.data.workStart) payload.work_start = parsed.data.workStart;
  if (parsed.data.workEnd) payload.work_end = parsed.data.workEnd;
  if (parsed.data.workDays) payload.work_days = nextWorkDays;
  if (parsed.data.activeStart) payload.active_start = parsed.data.activeStart;
  if (parsed.data.activeEnd) payload.active_end = parsed.data.activeEnd;
  if (parsed.data.activeDays) payload.active_days = nextActiveDays;
  if (parsed.data.urgentScheduleMode) payload.urgent_schedule_mode = parsed.data.urgentScheduleMode;
  if (parsed.data.planScheduleMode) payload.plan_schedule_mode = parsed.data.planScheduleMode;
  if (parsed.data.getRidScheduleMode) payload.get_rid_schedule_mode = parsed.data.getRidScheduleMode;
  if (parsed.data.lunchStart !== undefined) payload.lunch_start = parsed.data.lunchStart;
  if (parsed.data.lunchEnd !== undefined) payload.lunch_end = parsed.data.lunchEnd;
  if (parsed.data.bufferMinutes !== undefined) payload.buffer_minutes = parsed.data.bufferMinutes;
  if (parsed.data.minFocusBlockMinutes !== undefined)
    payload.min_focus_block_minutes = parsed.data.minFocusBlockMinutes;
  if (parsed.data.maxDailyFocusMinutes !== undefined)
    payload.max_daily_focus_minutes = parsed.data.maxDailyFocusMinutes;

  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", user.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "update_failed", message: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: withDefaults(data) });
}
