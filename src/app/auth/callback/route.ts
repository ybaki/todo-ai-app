import { NextResponse, type NextRequest } from "next/server";
import { isAllowedGmailAddress } from "@/lib/auth/gmailOnly";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Supabase Auth (Google OAuth) callback — yalnizca @gmail.com kabul edilir. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAllowedGmailAddress(user?.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=gmail_only`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
