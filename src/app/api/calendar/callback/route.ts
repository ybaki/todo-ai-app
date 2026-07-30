import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { exchangeCodeForToken } from "@/lib/graph/oauth";
import { storeRefreshToken } from "@/lib/graph/tokenStore";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  const cookieState = request.cookies.get("ms_oauth_state")?.value;
  const codeVerifier = request.cookies.get("ms_oauth_verifier")?.value;

  if (errorParam || !code || !state || !codeVerifier || state !== cookieState) {
    return NextResponse.redirect(new URL("/app?calendar_error=1", request.url));
  }

  try {
    const tokenResponse = await exchangeCodeForToken(code, codeVerifier);
    if (!tokenResponse.refresh_token) {
      throw new Error("Microsoft yaniti refresh_token icermiyor (offline_access istendi mi?)");
    }

    const supabase = await createSupabaseServerClient();
    const { data: existing } = await supabase
      .from("calendar_connections")
      .select("id, token_ref")
      .eq("user_id", user.id)
      .eq("provider", "microsoft")
      .maybeSingle();

    const tokenRef = await storeRefreshToken({
      userId: user.id,
      refreshToken: tokenResponse.refresh_token,
      existingTokenRef: existing?.token_ref ?? null,
    });

    const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString();

    await supabase.from("calendar_connections").upsert(
      {
        user_id: user.id,
        provider: "microsoft",
        scopes: ["Calendars.ReadBasic"],
        token_ref: tokenRef,
        status: "connected",
        expires_at: expiresAt,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" }
    );

    const response = NextResponse.redirect(new URL("/app?calendar_connected=1", request.url));
    response.cookies.delete("ms_oauth_state");
    response.cookies.delete("ms_oauth_verifier");
    return response;
  } catch (error) {
    console.error("calendar_callback_failed", error instanceof Error ? error.message : error);
    return NextResponse.redirect(new URL("/app?calendar_error=1", request.url));
  }
}
