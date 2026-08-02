import { format } from "date-fns";
import { NextResponse, type NextRequest } from "next/server";
import { resolveRequestUser } from "@/lib/auth/resolveRequestUser";
import { runEndOfDayRollover } from "@/lib/scheduler/endOfDayRollover";

/** Gece 23:59 rollover: panodaki gecikmis gorevleri ertesi gun 09:00'dan oncelige gore planlar. */
export async function POST(request: NextRequest) {
  const auth = await resolveRequestUser(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const isEodWindow = minutes >= 23 * 60 + 59;
  const isCatchUpWindow =
    now.getHours() >= 9 && minutes < 23 * 60 + 59;

  if (!isEodWindow && !isCatchUpWindow) {
    return NextResponse.json(
      { skipped: true, reason: "outside_rollover_window" },
      { status: 200 }
    );
  }

  try {
    const result = await runEndOfDayRollover({
      supabase: auth.supabase,
      userId: auth.userId,
      now,
    });

    return NextResponse.json({
      rolledOver: result.rescheduledTaskIds.length,
      taskIds: result.rescheduledTaskIds,
      date: format(now, "yyyy-MM-dd"),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "rollover_failed",
        message: error instanceof Error ? error.message : "unknown",
      },
      { status: 500 }
    );
  }
}
