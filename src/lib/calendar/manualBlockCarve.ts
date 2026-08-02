import type { SupabaseClient } from "@supabase/supabase-js";
import { rangesOverlap } from "./weekView";

const MIN_BLOCK_MINUTES = 30;

export function subtractRangeFromBlock(
  blockStart: Date,
  blockEnd: Date,
  holeStart: Date,
  holeEnd: Date
): Array<{ start: Date; end: Date }> {
  if (!rangesOverlap(blockStart, blockEnd, holeStart, holeEnd)) {
    return [{ start: blockStart, end: blockEnd }];
  }

  const pieces: Array<{ start: Date; end: Date }> = [];
  if (blockStart < holeStart) {
    pieces.push({ start: blockStart, end: holeStart });
  }
  if (blockEnd > holeEnd) {
    pieces.push({ start: holeEnd, end: blockEnd });
  }

  return pieces.filter((piece) => piece.end.getTime() - piece.start.getTime() >= MIN_BLOCK_MINUTES * 60_000);
}

/** Toplanti eklendiginde ustune binen kapali bloklari kullanici ezmesi olarak isler. */
export async function carveManualBlocksForMeeting(
  supabase: SupabaseClient,
  userId: string,
  meetingStart: Date,
  meetingEnd: Date
): Promise<void> {
  const { data: blocks } = await supabase
    .from("manual_calendar_blocks")
    .select("id, start_at, end_at")
    .eq("user_id", userId)
    .lt("start_at", meetingEnd.toISOString())
    .gt("end_at", meetingStart.toISOString());

  for (const block of blocks ?? []) {
    const blockStart = new Date(block.start_at);
    const blockEnd = new Date(block.end_at);
    const remaining = subtractRangeFromBlock(blockStart, blockEnd, meetingStart, meetingEnd);

    await supabase.from("manual_calendar_blocks").delete().eq("id", block.id).eq("user_id", userId);

    if (remaining.length === 0) continue;

    await supabase.from("manual_calendar_blocks").insert(
      remaining.map((piece) => ({
        user_id: userId,
        start_at: piece.start.toISOString(),
        end_at: piece.end.toISOString(),
      }))
    );
  }
}

export function blockOverlapsMeetings(
  block: { start_at: string; end_at: string },
  meetings: { start_at: string; end_at: string }[]
): boolean {
  const blockStart = new Date(block.start_at);
  const blockEnd = new Date(block.end_at);

  return meetings.some((meeting) =>
    rangesOverlap(blockStart, blockEnd, new Date(meeting.start_at), new Date(meeting.end_at))
  );
}
