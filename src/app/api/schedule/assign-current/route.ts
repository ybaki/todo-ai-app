import { NextResponse, type NextRequest } from "next/server";
import { resolveRequestUser } from "@/lib/auth/resolveRequestUser";
import { assignCurrentSlot } from "@/lib/scheduler/assignCurrentSlot";

/** Kullanicinin bulundugu saate en uygun gorevi takvime atar (Gorev ata). */
export async function POST(request: NextRequest) {
  const auth = await resolveRequestUser(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await assignCurrentSlot({
    supabase: auth.supabase,
    userId: auth.userId,
  });

  if (!result) {
    return NextResponse.json(
      {
        error: "no_fit",
        message: "Bu zaman araligina uygun gorev bulunamadi.",
      },
      { status: 404 }
    );
  }

  return NextResponse.json(result);
}
