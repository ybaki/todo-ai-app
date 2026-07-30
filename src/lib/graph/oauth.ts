import { env } from "@/lib/env";

// MVP'de gereken en dusuk delegated izin. Calendars.ReadWrite Faz 2'de eklenecek.
// Bkz. dokuman bolum 8.1.
export const GRAPH_SCOPES = ["offline_access", "Calendars.ReadBasic"] as const;

function authorityBase() {
  return `https://login.microsoftonline.com/${env.microsoft.tenantId}/oauth2/v2.0`;
}

export function buildAuthorizeUrl(state: string, codeChallenge: string) {
  const url = new URL(`${authorityBase()}/authorize`);
  url.searchParams.set("client_id", env.microsoft.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", env.microsoft.redirectUri);
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", GRAPH_SCOPES.join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

export async function exchangeCodeForToken(code: string, codeVerifier: string) {
  const body = new URLSearchParams({
    client_id: env.microsoft.clientId,
    client_secret: env.microsoft.clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: env.microsoft.redirectUri,
    code_verifier: codeVerifier,
    scope: GRAPH_SCOPES.join(" "),
  });

  const response = await fetch(`${authorityBase()}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error(`Microsoft token degisimi basarisiz: ${response.status}`);
  }

  return (await response.json()) as TokenResponse;
}

export async function refreshAccessToken(refreshToken: string) {
  const body = new URLSearchParams({
    client_id: env.microsoft.clientId,
    client_secret: env.microsoft.clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: GRAPH_SCOPES.join(" "),
  });

  const response = await fetch(`${authorityBase()}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error(`Microsoft token yenileme basarisiz: ${response.status}`);
  }

  return (await response.json()) as TokenResponse;
}
