import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { buildAuthorizeUrl } from "@/lib/graph/oauth";
import { generateCodeChallenge, generateCodeVerifier, generateState } from "@/lib/graph/pkce";

const OAUTH_COOKIE_MAX_AGE_SECONDS = 10 * 60;

// Dokuman bolum 8.3 adim 1: "Outlook'u bagla" butonuyla OAuth akisi baslar.
// Bu, Supabase Auth'daki (yalnizca kimlik dogrulama icin kullanilan) Microsoft
// girisinden AYRIDIR: burada uygulamanin KENDI Entra App Registration'i ile
// uzun omurlu bir Calendars.ReadBasic baglantisi kuruluyor (bkz. FAZ 0).
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const codeVerifier = generateCodeVerifier();
  const state = generateState();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const authorizeUrl = buildAuthorizeUrl(state, codeChallenge);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set("ms_oauth_verifier", codeVerifier, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: OAUTH_COOKIE_MAX_AGE_SECONDS,
    path: "/",
  });
  response.cookies.set("ms_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: OAUTH_COOKIE_MAX_AGE_SECONDS,
    path: "/",
  });

  return response;
}
