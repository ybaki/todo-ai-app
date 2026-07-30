import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { issueExtensionToken } from "@/lib/auth/extensionToken";

const bodySchema = z.object({ label: z.string().min(1).max(60).default("Chrome eklentisi") });

// Yalnizca web oturumu (Supabase session cookie) ile cagrilabilir; ham
// eklenti anahtari SADECE bu yanitta doner, bir daha gosterilmez.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const token = await issueExtensionToken(user.id, parsed.data.label);
  return NextResponse.json({ token });
}
